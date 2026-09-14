import { Wrench } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getOrgContext } from "@/lib/data/org-context";
import { PlatformPage } from "@/components/dashboard/PlatformPage";
import { CreateToolForm } from "@/components/dashboard/CreateToolForm";
import { ToolCard, type ToolListItem } from "@/components/dashboard/ToolCard";
import { EmptyState } from "@/components/ui/States";
import { summarizeToolUsage } from "@/lib/tools/usage";

/** Bounded scan of recent runs, enough to show real usage without an unbounded read. */
const TRACE_LOOKBACK_ROWS = 300;

export default async function ToolsPage() {
  const ctx = await getOrgContext();
  const db = createClient();

  const [{ data: tools }, { data: secrets }, { data: runs }] = await Promise.all([
    db
      .from("agent_tools")
      .select("id,name,description,kind,is_active,config")
      .eq("org_id", ctx.orgId)
      .order("created_at", { ascending: false }),
    db
      .from("agent_secrets")
      .select("id,name,provider")
      .eq("org_id", ctx.orgId)
      .is("revoked_at", null)
      .order("name"),
    db
      .from("agent_runs")
      .select("created_at,trace")
      .eq("org_id", ctx.orgId)
      .order("created_at", { ascending: false })
      .limit(TRACE_LOOKBACK_ROWS),
  ]);

  const usage = summarizeToolUsage(runs ?? []);

  const items: ToolListItem[] = (tools ?? []).map((tool) => {
    const config = (tool.config ?? {}) as Record<string, unknown>;
    const stats = usage.get(tool.id) ?? { callCount: 0, failureCount: 0, lastUsedAt: null };
    return {
      id: tool.id,
      name: tool.name,
      description: tool.description,
      kind: tool.kind,
      is_active: tool.is_active,
      endpoint: typeof config.endpoint === "string" ? config.endpoint : null,
      method: typeof config.method === "string" ? config.method : "GET",
      hasSecret: typeof config.secret_id === "string" && config.secret_id.length > 0,
      ...stats,
    };
  });

  const canToggle = ctx.isAdmin || ctx.role === "owner" || ctx.role === "admin";

  return (
    <PlatformPage
      eyebrow="Build"
      title="Tools"
      description="HTTP endpoints your agents can call mid-conversation. Requests run through an SSRF-guarded client, credentials come from the secrets vault, and every call is recorded in the run trace."
      action={{ href: "/dashboard/agents", label: "Attach to agent" }}
    >
      <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
        <CreateToolForm secrets={secrets ?? []} />

        <div className="neon-card p-5">
          <div className="mb-5">
            <h2 className="text-lg font-bold">Workspace tools</h2>
            <p className="mt-1 text-xs text-ink-600">
              {items.length} {items.length === 1 ? "tool" : "tools"} registered. Usage is counted
              from recorded runs.
            </p>
          </div>

          {items.length === 0 ? (
            <EmptyState
              icon={Wrench}
              title="No tools yet"
              description="A tool lets an agent do something beyond answering — look up an order, check stock, file a ticket. Create one on the left, then attach it to an agent."
            />
          ) : (
            <div className="grid gap-3 xl:grid-cols-2">
              {items.map((tool) => (
                <ToolCard key={tool.id} tool={tool} canToggle={canToggle} />
              ))}
            </div>
          )}
        </div>
      </div>
    </PlatformPage>
  );
}
