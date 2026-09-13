import { Rocket } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getOrgContext } from "@/lib/data/org-context";
import { PlatformPage } from "@/components/dashboard/PlatformPage";
import { DeploymentForm } from "./DeploymentForm";
import { DeploymentCard, type DeploymentItem } from "@/components/dashboard/DeploymentCard";
import { EmptyState } from "@/components/ui/States";

export default async function DeploymentsPage() {
  const ctx = await getOrgContext();
  const db = createClient();

  const [{ data: deployments }, { data: agents }, { data: runs }] = await Promise.all([
    db
      .from("agent_deployments")
      .select("id,agent_id,name,environment,status,endpoint_url,version,created_at,agents(name)")
      .eq("org_id", ctx.orgId)
      .order("created_at", { ascending: false }),
    db.from("agents").select("id,name,status").eq("org_id", ctx.orgId).eq("kind", "ai").order("name"),
    db
      .from("agent_runs")
      .select("deployment_id, created_at")
      .eq("org_id", ctx.orgId)
      .not("deployment_id", "is", null)
      .order("created_at", { ascending: false })
      .limit(1000),
  ]);

  const runCount = new Map<string, number>();
  const lastRunAt = new Map<string, string>();
  for (const run of runs ?? []) {
    if (!run.deployment_id) continue;
    runCount.set(run.deployment_id, (runCount.get(run.deployment_id) ?? 0) + 1);
    if (!lastRunAt.has(run.deployment_id)) lastRunAt.set(run.deployment_id, run.created_at);
  }

  // Highest version per agent — rollback is only meaningful on an older one.
  const latestVersion = new Map<string, number>();
  for (const deployment of deployments ?? []) {
    const current = latestVersion.get(deployment.agent_id) ?? 0;
    if ((deployment.version ?? 1) > current) {
      latestVersion.set(deployment.agent_id, deployment.version ?? 1);
    }
  }

  const items: DeploymentItem[] = (deployments ?? []).map((row) => {
    const embed = row.agents as unknown as { name: string } | { name: string }[] | null;
    const version = row.version ?? 1;
    return {
      id: row.id,
      name: row.name,
      agentId: row.agent_id,
      agentName: (Array.isArray(embed) ? embed[0]?.name : embed?.name) ?? "Deleted agent",
      environment: row.environment,
      status: row.status,
      version,
      endpointUrl: row.endpoint_url,
      createdAt: row.created_at,
      runCount: runCount.get(row.id) ?? 0,
      lastRunAt: lastRunAt.get(row.id) ?? null,
      isLatestVersion: latestVersion.get(row.agent_id) === version,
    };
  });

  const canManage = ctx.isAdmin || ctx.role === "owner" || ctx.role === "admin";
  const origin = process.env.NEXT_PUBLIC_APP_URL ?? "";

  return (
    <PlatformPage
      eyebrow="Deploy"
      title="Deployments"
      description="Promote a ready agent to an environment and call it over HTTP. Each deployment keeps its own version, endpoint and run history."
      action={{ href: "/dashboard/api-keys", label: "Manage API keys" }}
    >
      <DeploymentForm agents={agents ?? []} />

      <div className="mt-6 space-y-4">
        {items.length === 0 ? (
          <EmptyState
            icon={Rocket}
            title="Nothing deployed yet"
            description="Deploying gives an agent a versioned HTTP endpoint you can call from your own product, with every request recorded as a run."
          />
        ) : (
          items.map((deployment) => (
            <DeploymentCard
              key={deployment.id}
              deployment={deployment}
              canManage={canManage}
              origin={origin}
            />
          ))
        )}
      </div>
    </PlatformPage>
  );
}
