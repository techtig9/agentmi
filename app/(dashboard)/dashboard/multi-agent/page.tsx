import Link from "next/link";
import { Bot, Flag, GitBranch, Network, Play, Workflow } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getOrgContext } from "@/lib/data/org-context";
import { PlatformPage } from "@/components/dashboard/PlatformPage";
import { EmptyState } from "@/components/ui/States";

const NODE_ICON = { start: Play, agent: Bot, router: GitBranch, end: Flag } as const;

export default async function MultiAgentPage() {
  const ctx = await getOrgContext();
  const db = createClient();

  const { data: workflows } = await db
    .from("workflows")
    .select("id,name,created_at")
    .eq("org_id", ctx.orgId)
    .order("created_at", { ascending: false });

  const workflowIds = (workflows ?? []).map((w) => w.id);

  // Roles and routing are read from the saved graph, so this page reflects what
  // would actually execute rather than describing orchestration in the abstract.
  const [{ data: nodes }, { data: edges }, { data: agents }] = await Promise.all([
    workflowIds.length
      ? db
          .from("workflow_nodes")
          .select("id,workflow_id,node_type,label,agent_id")
          .in("workflow_id", workflowIds)
      : Promise.resolve({ data: [] as never[] }),
    workflowIds.length
      ? db
          .from("workflow_edges")
          .select("workflow_id,source_node_id,target_node_id")
          .in("workflow_id", workflowIds)
      : Promise.resolve({ data: [] as never[] }),
    db.from("agents").select("id,name,status").eq("org_id", ctx.orgId),
  ]);

  const agentById = new Map((agents ?? []).map((a) => [a.id, a]));
  const nodesByWorkflow = new Map<string, typeof nodes>();
  for (const node of nodes ?? []) {
    nodesByWorkflow.set(node.workflow_id, [...(nodesByWorkflow.get(node.workflow_id) ?? []), node]);
  }
  const edgeCount = new Map<string, number>();
  for (const edge of edges ?? []) {
    edgeCount.set(edge.workflow_id, (edgeCount.get(edge.workflow_id) ?? 0) + 1);
  }

  return (
    <PlatformPage
      eyebrow="Build"
      title="Multi-Agent"
      description="Coordinate specialized agents to solve complex tasks. Each workflow below routes work between agent steps; the graph you build is the graph that runs."
      action={{ href: "/dashboard/workflows", label: "Manage workflows" }}
    >
      {(workflows ?? []).length === 0 ? (
        <EmptyState
          icon={Network}
          title="No multi-agent workflows yet"
          description="A workflow chains specialist agents together — a router deciding which one handles a request, or one agent's output feeding the next. Create a workflow to get started."
          action={
            <Link href="/dashboard/workflows" className="btn-primary">
              <Workflow size={16} aria-hidden="true" />
              Create a workflow
            </Link>
          }
        />
      ) : (
        <div className="space-y-4">
          {(workflows ?? []).map((workflow) => {
            const workflowNodes = nodesByWorkflow.get(workflow.id) ?? [];
            const agentNodes = workflowNodes.filter((n) => n.node_type === "agent");
            const routerCount = workflowNodes.filter((n) => n.node_type === "router").length;

            return (
              <div key={workflow.id} className="neon-card p-5">
                <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <Link
                      href={`/dashboard/workflows/${workflow.id}`}
                      className="font-display font-bold hover:text-neon-cyan"
                    >
                      {workflow.name}
                    </Link>
                    <p className="mt-1 font-mono text-xs text-ink-600">
                      {agentNodes.length} agent {agentNodes.length === 1 ? "step" : "steps"} ·{" "}
                      {routerCount} {routerCount === 1 ? "router" : "routers"} ·{" "}
                      {edgeCount.get(workflow.id) ?? 0} connections
                    </p>
                  </div>
                  <Link
                    href={`/dashboard/workflows/${workflow.id}`}
                    className="btn-secondary shrink-0 !px-3 !py-1.5 text-xs"
                  >
                    Open graph
                  </Link>
                </div>

                {workflowNodes.length === 0 ? (
                  <p className="text-sm text-ink-600">
                    This workflow has no graph yet — open it to add steps.
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {workflowNodes.map((node) => {
                      const Icon = NODE_ICON[node.node_type as keyof typeof NODE_ICON] ?? Bot;
                      const agent = node.agent_id ? agentById.get(node.agent_id) : null;
                      return (
                        <li
                          key={node.id}
                          className="flex flex-wrap items-center gap-3 rounded-lg border border-base-700 px-3 py-2.5"
                        >
                          <Icon size={14} className="shrink-0 text-ink-600" aria-hidden="true" />
                          <span className="font-mono text-[10px] uppercase tracking-wider text-ink-600">
                            {node.node_type}
                          </span>
                          <span className="min-w-0 flex-1 truncate text-sm">{node.label}</span>
                          {node.node_type === "agent" && (
                            <span className="shrink-0 text-xs">
                              {agent ? (
                                <Link
                                  href={`/dashboard/agents/${agent.id}`}
                                  className="text-neon-cyan hover:underline"
                                >
                                  {agent.name}
                                </Link>
                              ) : (
                                <span className="text-neon-pink">No agent assigned</span>
                              )}
                            </span>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
      )}
    </PlatformPage>
  );
}
