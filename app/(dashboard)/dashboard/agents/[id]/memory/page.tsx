import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getOrgContext } from "@/lib/data/org-context";
import { PlatformPage } from "@/components/dashboard/PlatformPage";

export default async function AgentMemoryPage({ params }: { params: { id: string } }) {
  const ctx = await getOrgContext();
  const db = createClient();
  const [{ data: agent }, { data: memories }] = await Promise.all([
    db.from("agents").select("id,name,config").eq("id", params.id).eq("org_id", ctx.orgId).single(),
    db.from("agent_memories").select("id,kind,content,importance,source,expires_at,user_id,created_at").eq("agent_id", params.id).eq("org_id", ctx.orgId).or(`user_id.is.null,user_id.eq.${ctx.userId}`).order("importance", { ascending: false }).order("updated_at", { ascending: false }).limit(50),
  ]);
  if (!agent) notFound();
  return <PlatformPage eyebrow="Memory" title={`${agent.name} Memory`} description="Persistent conversation context and user/workspace memories. Users can inspect and delete stored memories at any time." action={{ href: `/dashboard/agents/${agent.id}/test`, label: "Open Playground" }}>
    <div className="grid lg:grid-cols-[1fr_320px] gap-6">
      <div className="neon-card p-5">
        <div className="flex items-center justify-between mb-5"><div><p className="font-bold">Stored memories</p><p className="text-xs text-ink-600">{memories?.length ?? 0} visible memories</p></div><span className="text-xs font-mono text-neon-green">USER + WORKSPACE</span></div>
        <div className="space-y-3">{(memories ?? []).length ? memories!.map((m) => <div key={m.id} className="rounded-lg border border-base-700 p-4"><div className="flex justify-between gap-4"><div><span className="text-[10px] uppercase font-mono text-neon-cyan">{m.kind}</span><p className="text-sm mt-1">{m.content}</p></div><span className="text-xs text-ink-600">{m.importance}/5</span></div><p className="text-[11px] text-ink-600 mt-3">{m.user_id ? "Personal" : "Workspace"} · {m.source}</p></div>) : <p className="text-sm text-ink-600">No persistent memories yet. Conversations are saved automatically when memory is enabled.</p>}</div>
      </div>
      <aside className="space-y-4"><div className="neon-card p-5"><p className="text-xs font-mono uppercase text-ink-600">Memory behavior</p><ul className="text-sm mt-3 space-y-2 text-ink-400"><li>• Conversation history is stored per user and agent.</li><li>• Workspace memories can be shared across users.</li><li>• Expiring memories are ignored after expiration.</li><li>• Memory can be disabled per chat request.</li></ul></div><div className="neon-card p-5"><p className="text-xs font-mono uppercase text-ink-600">Privacy</p><p className="text-sm mt-2 text-ink-400">Memory is organization-scoped and protected by Supabase RLS. Deleting a memory removes it from future retrieval.</p></div></aside>
    </div>
  </PlatformPage>;
}
