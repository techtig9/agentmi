import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Search } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getOrgContext } from "@/lib/data/org-context";
import { KnowledgeManager, type KnowledgeSource } from "@/components/dashboard/KnowledgeManager";

export default async function AgentKnowledgePage({ params }: { params: { id: string } }) {
  const ctx = await getOrgContext();
  const db = createClient();

  const { data: agent } = await db
    .from("agents")
    .select("id,name,kind")
    .eq("id", params.id)
    .eq("org_id", ctx.orgId)
    .single();
  if (!agent || agent.kind !== "ai") notFound();

  const [{ data: sources }, { data: chunks, count }] = await Promise.all([
    db
      .from("knowledge_sources")
      .select("id,title,kind,locator,status,char_count,chunk_count,error_message,created_at")
      .eq("agent_id", agent.id)
      .eq("org_id", ctx.orgId)
      .order("created_at", { ascending: false })
      .limit(50),
    db
      .from("knowledge_chunks")
      .select("id,chunk_index,content", { count: "exact" })
      .eq("agent_id", agent.id)
      .eq("org_id", ctx.orgId)
      .order("chunk_index")
      .limit(12),
  ]);

  return (
    <div className="mx-auto max-w-5xl">
      <Link
        href={`/dashboard/agents/${agent.id}/builder`}
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-ink-400 transition-colors hover:text-ink-100"
      >
        <ArrowLeft size={14} aria-hidden="true" />
        Back to builder
      </Link>
      <div className="mb-6">
        <p className="mb-2 font-mono text-xs uppercase tracking-[0.18em] text-neon-cyan">Knowledge</p>
        <h1 className="text-3xl font-bold tracking-tight">{agent.name}</h1>
        <p className="mt-2 max-w-3xl text-sm text-ink-400">
          Ground this agent in your own material. Sources are chunked, embedded and retrieved on
          every run — the agent quotes what you attach here rather than guessing.
        </p>
      </div>

      <KnowledgeManager
        agentId={agent.id}
        sources={(sources ?? []) as KnowledgeSource[]}
        totalChunks={count ?? 0}
      />

      <div className="neon-card mt-6 p-5">
        <div className="mb-4 flex items-center gap-2">
          <Search size={15} className="text-ink-600" aria-hidden="true" />
          <h2 className="text-lg font-bold">Indexed chunks</h2>
        </div>
        <p className="mb-4 text-xs text-ink-600">
          A sample of what retrieval can return. The runtime embeds each incoming question and pulls
          the closest chunks into the prompt.
        </p>
        {(chunks ?? []).length === 0 ? (
          <p className="text-sm text-ink-600">Nothing indexed yet.</p>
        ) : (
          <ul className="space-y-3">
            {(chunks ?? []).map((chunk) => (
              <li key={chunk.id} className="rounded-lg border border-base-700 p-3">
                <p className="font-mono text-xs text-neon-cyan">Chunk {chunk.chunk_index}</p>
                <p className="mt-1 line-clamp-3 text-sm text-ink-400">{chunk.content}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
