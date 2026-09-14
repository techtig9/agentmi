import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Brain, ShieldCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getOrgContext } from "@/lib/data/org-context";
import { MemoryManager, type MemoryItem } from "@/components/dashboard/MemoryManager";
import { MetricCard } from "@/components/ui/Card";

export default async function AgentMemoryPage({ params }: { params: { id: string } }) {
  const ctx = await getOrgContext();
  const db = createClient();

  const [{ data: agent }, { data: memories }, { count: sessionCount }] = await Promise.all([
    db.from("agents").select("id,name,config").eq("id", params.id).eq("org_id", ctx.orgId).single(),
    db
      .from("agent_memories")
      .select("id,kind,content,importance,source,expires_at,user_id,created_at")
      .eq("agent_id", params.id)
      .eq("org_id", ctx.orgId)
      .or(`user_id.is.null,user_id.eq.${ctx.userId}`)
      .order("importance", { ascending: false })
      .order("updated_at", { ascending: false })
      .limit(50),
    db
      .from("agent_memory_sessions")
      .select("id", { count: "exact", head: true })
      .eq("agent_id", params.id)
      .eq("org_id", ctx.orgId),
  ]);

  if (!agent) notFound();

  const items = (memories ?? []) as MemoryItem[];
  const personal = items.filter((m) => m.user_id !== null).length;

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
        <p className="mb-2 font-mono text-xs uppercase tracking-[0.18em] text-neon-cyan">Memory</p>
        <h1 className="text-3xl font-bold tracking-tight">{agent.name}</h1>
        <p className="mt-2 max-w-3xl text-sm text-ink-400">
          What this agent remembers between conversations, so a returning user does not have to
          repeat themselves. Every stored memory is listed here and can be deleted.
        </p>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-3">
        <MetricCard label="Stored memories" value={items.length} icon={Brain} />
        <MetricCard label="Personal" value={personal} hint="Visible only to you" />
        <MetricCard
          label="Conversations"
          value={sessionCount ?? 0}
          hint="Saved test and chat sessions"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        <div className="neon-card p-5">
          <h2 className="mb-5 text-lg font-bold">Stored memories</h2>
          <MemoryManager agentId={agent.id} memories={items} />
        </div>

        <aside className="space-y-4">
          <div className="neon-card p-5">
            <p className="font-mono text-xs uppercase tracking-wider text-ink-600">
              How memory works
            </p>
            <ul className="mt-3 space-y-2 text-sm text-ink-400">
              <li>Conversation history is stored per user, per agent.</li>
              <li>Workspace memories are shared; personal ones are not.</li>
              <li>Expired memories stop being retrieved automatically.</li>
              <li>Memory can be switched off for an individual API request.</li>
            </ul>
          </div>

          <div className="neon-card p-5">
            <p className="flex items-center gap-2 font-mono text-xs uppercase tracking-wider text-ink-600">
              <ShieldCheck size={13} aria-hidden="true" />
              Privacy
            </p>
            <p className="mt-2.5 text-sm text-ink-400">
              Memories are scoped to this organization and enforced by row-level security. Deleting
              one removes it from future retrieval immediately.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
