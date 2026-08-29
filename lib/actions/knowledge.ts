"use server";

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
