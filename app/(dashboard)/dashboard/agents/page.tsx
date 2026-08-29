import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getOrgContext } from "@/lib/data/org-context";

const STATUS_COLOR: Record<string, string> = {
  ready: "text-neon-green",
  draft: "text-ink-400",
  training: "text-neon-cyan",
  failed: "text-neon-pink",
  archived: "text-ink-600",
};

export default async function AgentsPage() {
  const ctx = await getOrgContext();
  const supabase = createClient();

  const { data: agents } = await supabase
    .from("agents")
    .select("id, name, kind, status, created_at")
    .eq("org_id", ctx.orgId)
    .order("created_at", { ascending: false });

  return (
    <div className="max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">My Agents</h1>
        <Link href="/dashboard/create" className="btn-primary">
          Create New
        </Link>
      </div>

      {!agents || agents.length === 0 ? (
        <div className="neon-card p-8 text-center text-ink-400">
          Nothing built yet — <Link href="/dashboard/create" className="text-neon-cyan hover:underline">create your first agent</Link>.
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {agents.map((agent) => (
            <Link
              key={agent.id}
              href={`/dashboard/agents/${agent.id}`}
              className="neon-card p-4 flex items-center justify-between hover:border-neon-cyan/40 transition-colors"
            >
              <div>
                <p className="font-medium">{agent.name}</p>
                <p className="text-xs text-ink-600 uppercase tracking-wide">{agent.kind} agent</p>
              </div>
              <span className={`text-sm font-mono ${STATUS_COLOR[agent.status] ?? "text-ink-400"}`}>
                {agent.status}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
