import { createClient } from "@/lib/supabase/server";
import { getOrgContext } from "@/lib/data/org-context";
import { CreateWorkflowForm } from "@/components/dashboard/CreateWorkflowForm";
import { AddWorkflowMemberForm } from "@/components/dashboard/AddWorkflowMemberForm";
import { RemoveWorkflowMemberButton } from "@/components/dashboard/RemoveWorkflowMemberButton";

export default async function WorkflowsPage() {
  const ctx = await getOrgContext();
  const supabase = createClient();

  const [{ data: workflows }, { data: aiAgents }] = await Promise.all([
    supabase
      .from("workflows")
      .select("id, name, workflow_members(agent_id, keywords, agents(id, name, status))")
      .eq("org_id", ctx.orgId)
      .order("created_at", { ascending: false }),
    supabase.from("agents").select("id, name").eq("org_id", ctx.orgId).eq("kind", "ai").eq("status", "ready"),
  ]);

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold mb-1">Workflows</h1>
      <p className="text-ink-400 text-sm mb-6">
        Group AI agents into a router — an incoming message gets sent to whichever specialist
        matches best. Call it at{" "}
        <code className="font-mono text-xs">POST /api/v1/workflows/&#123;id&#125;/chat</code>.
      </p>

      <div className="mb-6 neon-card p-5">
        <CreateWorkflowForm />
      </div>

      <div className="flex flex-col gap-4">
        {(workflows ?? []).map((wf) => {
          const memberIds = new Set(wf.workflow_members.map((m: { agent_id: string }) => m.agent_id));
          const available = (aiAgents ?? []).filter((a) => !memberIds.has(a.id));

          return (
            <div key={wf.id} className="neon-card p-5">
              <div className="flex items-center justify-between mb-3"><p className="font-display font-bold">{wf.name}</p><a href={`/dashboard/workflows/${wf.id}`} className="btn-secondary text-xs">Open builder</a></div>

              <div className="flex flex-col gap-2 mb-4">
                {wf.workflow_members.length === 0 && (
                  <p className="text-xs text-ink-600">No specialists added yet.</p>
                )}
                {wf.workflow_members.map((m: { agent_id: string; keywords: string[]; agents: unknown }) => (
                  <div key={m.agent_id} className="flex items-center justify-between text-sm border-b border-base-700 pb-1.5">
                    <div>
                      <span>{(m.agents as unknown as { name: string } | null)?.name ?? "Unknown agent"}</span>
                      {m.keywords.length > 0 && (
                        <span className="text-ink-600 text-xs ml-2">({m.keywords.join(", ")})</span>
                      )}
                    </div>
                    <RemoveWorkflowMemberButton workflowId={wf.id} agentId={m.agent_id} />
                  </div>
                ))}
              </div>

              <AddWorkflowMemberForm workflowId={wf.id} availableAgents={available} />
            </div>
          );
        })}
        {(!workflows || workflows.length === 0) && (
          <p className="text-ink-600 text-sm">No workflows yet — create one above.</p>
        )}
      </div>
    </div>
  );
}
