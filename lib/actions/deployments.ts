"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getOrgContext, requireRole } from "@/lib/data/org-context";

const deploymentSchema = z.object({
  agentId: z.string().uuid(),
  name: z.string().trim().min(2).max(80),
  environment: z.enum(["staging", "production"]),
});

export type DeploymentState = { error: string | null; success: boolean };

export async function createDeployment(_prev: DeploymentState, formData: FormData): Promise<DeploymentState> {
  const parsed = deploymentSchema.safeParse({
    agentId: formData.get("agentId"),
    name: formData.get("name"),
    environment: formData.get("environment"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid deployment.", success: false };

  const ctx = await getOrgContext();
  const denied = requireRole(ctx, ["owner", "admin"]);
  if (denied) return { error: denied, success: false };
  const supabase = createClient();
  const { data: agent } = await supabase.from("agents").select("id,name,kind,status,config").eq("id", parsed.data.agentId).eq("org_id", ctx.orgId).single();
  if (!agent) return { error: "Agent not found in this workspace.", success: false };
  if (agent.kind !== "ai") return { error: "Only AI agents can be deployed through the Agent Runtime.", success: false };
  if (agent.status !== "ready") return { error: `Agent must be ready before deployment (currently ${agent.status}).`, success: false };

  const { data: latest } = await supabase.from("agent_deployments").select("version").eq("org_id", ctx.orgId).eq("agent_id", agent.id).order("version", { ascending: false }).limit(1).maybeSingle();
  const version = (latest?.version ?? 0) + 1;
  const { data: deployment, error } = await supabase.from("agent_deployments").insert({
    org_id: ctx.orgId,
    agent_id: agent.id,
    name: parsed.data.name,
    environment: parsed.data.environment,
    status: "active",
    version,
    config: { agent_config_snapshot: agent.config ?? {}, runtime: "agentmi" },
    created_by: ctx.userId,
  }).select("id").single();
  if (error || !deployment) return { error: "Could not create deployment.", success: false };

  const endpointUrl = `/api/v1/deployments/${deployment.id}/run`;
  await supabase.from("agent_deployments").update({ endpoint_url: endpointUrl }).eq("id", deployment.id).eq("org_id", ctx.orgId);
  await supabase.from("audit_logs").insert({ org_id: ctx.orgId, actor_id: ctx.userId, action: "deployment_created", metadata: { deployment_id: deployment.id, agent_id: agent.id, environment: parsed.data.environment, version } });
  revalidatePath("/dashboard/deployments");
  return { error: null, success: true };
}
