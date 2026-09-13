"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getOrgContext } from "@/lib/data/org-context";
import { chunkText } from "@/lib/rag/chunk";
import { dispatchWebhookEvent } from "@/lib/webhooks-outbound/dispatch";
import { MAX_KNOWLEDGE_CHUNKS, validateKnowledgeText, validateKnowledgeUrl, sourceTitle } from "@/lib/knowledge/validation";

interface VoyageEmbeddingResponse { data: { embedding: number[] }[]; }

async function embedChunks(texts: string[]): Promise<number[][]> {
  const apiKey = process.env.VOYAGE_API_KEY;
  if (process.env.VOYAGE_ENABLED === "false" || !apiKey) throw new Error("Knowledge indexing is optional and is currently disabled. Connect Voyage AI to enable Knowledge/RAG indexing.");
  const model = process.env.VOYAGE_EMBEDDING_MODEL ?? "voyage-2";
  const out: number[][] = [];
  for (let i = 0; i < texts.length; i += 64) {
    const batch = texts.slice(i, i + 64);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 30_000);
    try {
      const response = await fetch("https://api.voyageai.com/v1/embeddings", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ input: batch, model }),
        signal: controller.signal,
      });
      if (!response.ok) throw new Error(`Voyage embeddings request failed: ${response.status}`);
      const body: VoyageEmbeddingResponse = await response.json();
      if (!body.data || body.data.length !== batch.length) throw new Error("Embedding provider returned an incomplete batch.");
      out.push(...body.data.map((d) => d.embedding));
    } catch (e) {
      if (e instanceof Error && e.name === "AbortError") throw new Error("Knowledge indexing timed out. Please retry.");
      throw e;
    } finally { clearTimeout(timer); }
  }
  return out;
}

async function fetchKnowledgeUrl(url: string): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20_000);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      redirect: "error",
      headers: { Accept: "text/html,text/plain;q=0.9,application/xhtml+xml;q=0.8" },
    });
    if (!response.ok) throw new Error(`Website returned HTTP ${response.status}.`);
    const type = response.headers.get("content-type") ?? "";
    if (!/text\/(plain|html)|application\/xhtml\+xml/i.test(type)) throw new Error("The URL did not return readable HTML or text.");
    const body = await response.text();
    if (body.length > 2_000_000) throw new Error("Website content is too large to index.");
    return body.replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  } catch (e) {
    if (e instanceof Error && e.name === "AbortError") throw new Error("Website fetch timed out. Please retry.");
    throw e;
  } finally { clearTimeout(timer); }
}

export type IngestKnowledgeState = { error: string | null; chunksCreated?: number; sourceId?: string };

async function ingestSource(agentId: string, kind: "text" | "url", raw: string): Promise<IngestKnowledgeState> {
  const ctx = await getOrgContext();
  const supabase = createClient();
  const { data: agent } = await supabase.from("agents").select("id").eq("id", agentId).eq("org_id", ctx.orgId).eq("kind", "ai").single();
  if (!agent) return { error: "AI agent not found." };

  let sourceValue = raw.trim();
  if (kind === "url") {
    const valid = validateKnowledgeUrl(sourceValue);
    if (!valid.ok) return { error: valid.error };
    sourceValue = valid.url;
  }
  const textResult = kind === "url" ? await fetchKnowledgeUrl(sourceValue).then((t) => validateKnowledgeText(t)) : validateKnowledgeText(sourceValue);
  if (!textResult.ok) return { error: textResult.error };
  const chunks = chunkText(textResult.text);
  if (!chunks.length) return { error: "Nothing could be indexed from this source." };
  if (chunks.length > MAX_KNOWLEDGE_CHUNKS) return { error: `This source creates too many chunks. Maximum is ${MAX_KNOWLEDGE_CHUNKS}.` };

  let embeddings: number[][];
  try { embeddings = await embedChunks(chunks.map((c) => c.text)); }
  catch (e) { return { error: e instanceof Error ? e.message : "Embedding request failed." }; }

  const { data: source, error: sourceError } = await supabase.from("knowledge_sources").insert({ org_id: ctx.orgId, agent_id: agentId, kind, title: sourceTitle(kind, sourceValue), locator: kind === "url" ? sourceValue : null, status: "ready", char_count: textResult.text.length, chunk_count: chunks.length }).select("id").single();
  if (sourceError || !source) return { error: "The source could not be saved. Please retry." };

  const { error: insertError } = await supabase.from("knowledge_chunks").insert(chunks.map((chunk, i) => ({ org_id: ctx.orgId, agent_id: agentId, source_id: source.id, chunk_index: chunk.index, content: chunk.text, embedding: embeddings[i] })));
  if (insertError) {
    await supabase.from("knowledge_sources").delete().eq("id", source.id).eq("org_id", ctx.orgId);
    return { error: "The source was created but its chunks could not be saved. Please retry." };
  }
  await dispatchWebhookEvent(ctx.orgId, "knowledge.updated", agentId, { chunkCount: chunks.length, sourceId: source.id });
  return { error: null, chunksCreated: chunks.length, sourceId: source.id };
}

export async function ingestKnowledgeText(agentId: string, rawText: string): Promise<IngestKnowledgeState> {
  try { return await ingestSource(agentId, "text", rawText); }
  catch (e) { return { error: e instanceof Error ? e.message : "Knowledge ingestion failed." }; }
}

export async function ingestKnowledgeUrl(agentId: string, url: string): Promise<IngestKnowledgeState> {
  try { return await ingestSource(agentId, "url", url); }
  catch (e) { return { error: e instanceof Error ? e.message : "Website ingestion failed." }; }
}

/**
 * Removes a knowledge source and every chunk it produced.
 *
 * Chunks are deleted explicitly rather than relying on a cascade, because the
 * source row is what the UI lists but the chunks are what retrieval reads — an
 * orphaned chunk would keep answering queries from content the user believes
 * they deleted.
 */
export async function deleteKnowledgeSource(sourceId: string): Promise<{ error: string | null }> {
  const ctx = await getOrgContext();
  const supabase = createClient();

  const { data: source } = await supabase
    .from("knowledge_sources")
    .select("id, agent_id")
    .eq("id", sourceId)
    .eq("org_id", ctx.orgId)
    .single();
  if (!source) return { error: "Knowledge source not found." };

  const { error: chunkError } = await supabase
    .from("knowledge_chunks")
    .delete()
    .eq("source_id", source.id)
    .eq("org_id", ctx.orgId);
  if (chunkError) return { error: "Couldn't remove the indexed chunks. Please retry." };

  const { error } = await supabase
    .from("knowledge_sources")
    .delete()
    .eq("id", source.id)
    .eq("org_id", ctx.orgId);
  if (error) return { error: "Couldn't remove the source. Please retry." };

  await supabase.from("audit_logs").insert({
    org_id: ctx.orgId,
    actor_id: ctx.userId,
    action: "knowledge_source_deleted",
    metadata: { source_id: source.id, agent_id: source.agent_id },
  });

  await dispatchWebhookEvent(ctx.orgId, "knowledge.updated", source.agent_id, {
    sourceId: source.id,
    deleted: true,
  });

  revalidatePath(`/dashboard/agents/${source.agent_id}/knowledge`);
  return { error: null };
}

/**
 * Re-embeds a source's content.
 *
 * A URL source is re-fetched, so re-indexing picks up a changed page. A text
 * source has no stored original beyond its chunks, so its existing chunk text
 * is re-embedded — which is what you want when the embedding model changes,
 * and is honest about not being able to re-read a document that was pasted.
 *
 * The old chunks are only deleted once the new embeddings have been computed,
 * so a failure part-way leaves the agent's existing knowledge intact.
 */
export async function reindexKnowledgeSource(sourceId: string): Promise<IngestKnowledgeState> {
  try {
    const ctx = await getOrgContext();
    const supabase = createClient();

    const { data: source } = await supabase
      .from("knowledge_sources")
      .select("id, agent_id, kind, locator, title")
      .eq("id", sourceId)
      .eq("org_id", ctx.orgId)
      .single();
    if (!source) return { error: "Knowledge source not found." };

    let text: string;
    if (source.kind === "url") {
      if (!source.locator) return { error: "This source has no URL to re-fetch." };
      const valid = validateKnowledgeUrl(source.locator);
      if (!valid.ok) return { error: valid.error };
      text = await fetchKnowledgeUrl(valid.url);
    } else {
      const { data: existing } = await supabase
        .from("knowledge_chunks")
        .select("content")
        .eq("source_id", source.id)
        .eq("org_id", ctx.orgId)
        .order("chunk_index");
      if (!existing || existing.length === 0) {
        return { error: "This source has no stored content to re-index." };
      }
      text = existing.map((c) => c.content).join("\n\n");
    }

    const validated = validateKnowledgeText(text);
    if (!validated.ok) return { error: validated.error };

    const chunks = chunkText(validated.text);
    if (!chunks.length) return { error: "Nothing could be indexed from this source." };
    if (chunks.length > MAX_KNOWLEDGE_CHUNKS) {
      return { error: `This source creates too many chunks. Maximum is ${MAX_KNOWLEDGE_CHUNKS}.` };
    }

    // Compute embeddings BEFORE deleting anything, so a provider failure does
    // not leave the agent with no knowledge at all.
    let embeddings: number[][];
    try {
      embeddings = await embedChunks(chunks.map((c) => c.text));
    } catch (e) {
      return { error: e instanceof Error ? e.message : "Embedding request failed." };
    }

    const { error: deleteError } = await supabase
      .from("knowledge_chunks")
      .delete()
      .eq("source_id", source.id)
      .eq("org_id", ctx.orgId);
    if (deleteError) return { error: "Couldn't replace the existing chunks. Please retry." };

    const { error: insertError } = await supabase.from("knowledge_chunks").insert(
      chunks.map((chunk, i) => ({
        org_id: ctx.orgId,
        agent_id: source.agent_id,
        source_id: source.id,
        chunk_index: chunk.index,
        content: chunk.text,
        embedding: embeddings[i],
      }))
    );
    if (insertError) {
      await supabase
        .from("knowledge_sources")
        .update({ status: "failed", error_message: "Re-index failed while saving chunks." })
        .eq("id", source.id)
        .eq("org_id", ctx.orgId);
      return { error: "The new chunks could not be saved. Please retry." };
    }

    await supabase
      .from("knowledge_sources")
      .update({
        status: "ready",
        error_message: null,
        char_count: validated.text.length,
        chunk_count: chunks.length,
      })
      .eq("id", source.id)
      .eq("org_id", ctx.orgId);

    await supabase.from("audit_logs").insert({
      org_id: ctx.orgId,
      actor_id: ctx.userId,
      action: "knowledge_source_reindexed",
      metadata: { source_id: source.id, agent_id: source.agent_id, chunks: chunks.length },
    });

    revalidatePath(`/dashboard/agents/${source.agent_id}/knowledge`);
    return { error: null, chunksCreated: chunks.length, sourceId: source.id };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Re-indexing failed." };
  }
}
