import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getOrgContext } from "@/lib/data/org-context";
import { PlatformPage } from "@/components/dashboard/PlatformPage";
import { KnowledgeManager } from "@/components/dashboard/KnowledgeManager";

export default async function AgentKnowledgePage({ params }: { params: { id: string } }) {
  const c = await getOrgContext(); const s = createClient();
  const { data: a } = await s.from("agents").select("id,name,kind").eq("id", params.id).eq("org_id", c.orgId).single();
  if (!a || a.kind !== "ai") notFound();
  const [{ data: sources }, { data: chunks, count }] = await Promise.all([
    s.from("knowledge_sources").select("id,title,kind,locator,status,char_count,chunk_count,created_at").eq("agent_id", a.id).eq("org_id", c.orgId).order("created_at", { ascending: false }).limit(25),
    s.from("knowledge_chunks").select("id,chunk_index,content,created_at", { count: "exact" }).eq("agent_id", a.id).eq("org_id", c.orgId).order("chunk_index").limit(20),
  ]);
  return <PlatformPage eyebrow="Knowledge" title={a.name} description="Build grounded agents from durable, agent-scoped sources. Existing chunks remain compatible." action={{ href: `/dashboard/agents/${a.id}/builder`, label: "Agent Builder" }}>
    <div className="space-y-6">
      <KnowledgeManager agentId={a.id} chunkCount={count ?? 0} />
      <div className="grid lg:grid-cols-[1fr_360px] gap-6">
        <div className="neon-card p-5"><div className="flex justify-between mb-4"><div><p className="font-bold">Sources</p><p className="text-xs text-ink-600">{sources?.length ?? 0} recent sources</p></div><span className="text-xs text-neon-green">Indexed</span></div>
          <div className="space-y-3">{(sources ?? []).map(src => <div key={src.id} className="rounded-lg border border-base-700 p-3"><div className="flex justify-between gap-3"><p className="font-semibold truncate">{src.title}</p><span className="text-xs text-neon-green">{src.status}</span></div><p className="text-xs text-ink-600 mt-1">{src.kind.toUpperCase()} · {src.chunk_count} chunks · {src.char_count.toLocaleString()} chars</p>{src.locator && <p className="text-xs text-ink-600 mt-1 truncate">{src.locator}</p>}</div>)}{(!sources || sources.length === 0) && <div className="border border-dashed border-base-700 rounded-lg p-8 text-center text-sm text-ink-600">No sources yet. Add text or a public HTTPS page above.</div>}</div>
        </div>
        <aside className="neon-card p-5"><p className="font-bold">Retrieval preview</p><p className="text-xs text-ink-600 mt-2">The runtime embeds each new user query and retrieves the most relevant indexed chunks before generating an answer.</p><div className="mt-4 pt-4 border-t border-base-700"><p className="text-xs text-ink-600">Showing up to 20 chunks</p><p className="font-mono text-neon-cyan text-lg mt-1">{count ?? 0}</p></div></aside>
      </div>
      <div className="neon-card p-5"><p className="font-bold mb-4">Recent indexed chunks</p><div className="space-y-3">{(chunks ?? []).map(x => <div key={x.id} className="rounded-lg border border-base-700 p-3"><p className="text-xs font-mono text-neon-cyan">Chunk {x.chunk_index}</p><p className="text-sm text-ink-300 mt-1 line-clamp-3">{x.content}</p></div>)}{(!chunks || chunks.length === 0) && <p className="text-sm text-ink-600">No chunks indexed yet.</p>}</div></div>
    </div>
  </PlatformPage>;
}
