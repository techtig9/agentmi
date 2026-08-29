import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getOrgContext } from "@/lib/data/org-context";

function StatCard({ label, value, hint }: { label: string; value: string | number; hint: string }) {
  return (
    <div className="neon-card p-5">
      <p className="text-xs font-mono uppercase tracking-wider text-ink-600">{label}</p>
      <p className="mt-2 text-2xl font-display font-bold">{value}</p>
      <p className="mt-1 text-xs text-ink-600">{hint}</p>
    </div>
  );
}

const STATUS_CLASS: Record<string, string> = {
  ready: "text-neon-green",
  training: "text-neon-cyan",
  draft: "text-ink-400",
  failed: "text-neon-pink",
  archived: "text-ink-600",
};

export default async function DashboardPage() {
  const ctx = await getOrgContext();
  const supabase = createClient();

  const [{ data: agents }, { data: workflows }, { data: datasets }] = await Promise.all([
    supabase
      .from("agents")
      .select("id, name, kind, status, created_at")
      .eq("org_id", ctx.orgId)
      .order("created_at", { ascending: false }),
    supabase
      .from("workflows")
      .select("id", { count: "exact", head: true })
      .eq("org_id", ctx.orgId),
    supabase
      .from("datasets")
      .select("id", { count: "exact", head: true })
      .eq("org_id", ctx.orgId),
  ]);

  const agentList = agents ?? [];
  const readyAgents = agentList.filter((agent) => agent.status === "ready").length;
  const recentAgents = agentList.slice(0, 5);

  return (
    <div className="max-w-6xl mx-auto">
      <section className="rounded-2xl border border-base-700 bg-aurora-grid p-6 md:p-8 mb-7">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
          <div>
            <p className="text-xs font-mono uppercase tracking-[0.18em] text-neon-cyan mb-3">Agentmi workspace</p>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
              Build AI agents that work for you{ctx.orgName ? `, ${ctx.orgName}` : ""}.
            </h1>
            <p className="text-ink-400 mt-3 max-w-2xl">
              Create agents, connect knowledge and tools, test behavior, and move working agents into production.
            </p>
          </div>
          <div className="flex gap-2 shrink-0">
            <Link href="/dashboard/create" className="btn-primary">Create Agent</Link>
            <Link href="/dashboard/workflows" className="btn-secondary">Workflows</Link>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Agents" value={agentList.length} hint={`${readyAgents} ready for use`} />
        <StatCard label="Workflows" value={workflows?.length ?? 0} hint="Agent routing workflows" />
        <StatCard label="Datasets" value={datasets?.length ?? 0} hint="ML data sources" />
        <StatCard label="Credits" value={ctx.isAdmin ? "∞" : ctx.creditBalance.toLocaleString()} hint={`${ctx.plan} plan`} />
      </section>

      <section className="grid lg:grid-cols-[1fr_320px] gap-6">
        <div className="neon-card p-5">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-lg font-bold">Recent agents</h2>
              <p className="text-xs text-ink-600 mt-1">Your latest agent builds and their current state.</p>
            </div>
            <Link href="/dashboard/agents" className="text-xs text-neon-cyan hover:underline">View all</Link>
          </div>

          {recentAgents.length === 0 ? (
            <div className="rounded-xl border border-dashed border-base-700 p-8 text-center">
              <p className="font-medium">Your workspace is ready.</p>
              <p className="text-sm text-ink-600 mt-1 mb-4">Create your first agent and Agentmi will guide you through the setup.</p>
              <Link href="/dashboard/create" className="btn-primary">Create your first agent</Link>
            </div>
          ) : (
            <div className="flex flex-col divide-y divide-base-700">
              {recentAgents.map((agent) => (
                <Link key={agent.id} href={`/dashboard/agents/${agent.id}`} className="py-4 flex items-center justify-between gap-4 hover:bg-base-800/40 -mx-2 px-2 rounded-lg">
                  <div className="min-w-0">
                    <p className="font-medium truncate">{agent.name}</p>
                    <p className="text-xs text-ink-600 mt-1 uppercase tracking-wide">{agent.kind} agent</p>
                  </div>
                  <span className={`text-xs font-mono shrink-0 ${STATUS_CLASS[agent.status] ?? "text-ink-400"}`}>{agent.status}</span>
                </Link>
              ))}
            </div>
          )}
        </div>

        <aside className="space-y-4">
          <div className="neon-card p-5 neon-card--accent-violet">
            <p className="text-xs font-mono uppercase tracking-wider text-neon-violet">Quick actions</p>
            <div className="mt-4 grid gap-2">
              <Link href="/dashboard/create" className="btn-secondary justify-start">＋ Create agent</Link>
              <Link href="/dashboard/workflows" className="btn-secondary justify-start">↗ Create workflow</Link>
              <Link href="/dashboard/datasets" className="btn-secondary justify-start">＋ Add dataset</Link>
            </div>
          </div>

          <div className="neon-card p-5">
            <p className="text-xs font-mono uppercase tracking-wider text-ink-600">Workspace health</p>
            <div className="mt-4 space-y-3 text-sm">
              <div className="flex items-center justify-between"><span className="text-ink-400">Ready agents</span><span>{readyAgents}/{agentList.length}</span></div>
              <div className="h-1.5 bg-base-700 rounded-full overflow-hidden"><div className="h-full bg-neon-green" style={{ width: `${agentList.length ? (readyAgents / agentList.length) * 100 : 0}%` }} /></div>
              <p className="text-xs text-ink-600">Detailed runs, evaluations and observability arrive in the next platform phases without changing your existing agent data.</p>
            </div>
          </div>
        </aside>
      </section>
    </div>
  );
}
