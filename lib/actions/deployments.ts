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

const deploymentIdSchema = z.object({ deploymentId: z.string().uuid() });

export type DeploymentActionState = { error: string | null; success?: string };

/**
 * Takes a deployment out of service without deleting it.
 *
 * The run endpoint only serves deployments whose status is "active", so
 * disabling is what actually stops traffic — the row, its version and its run
 * history are all kept so the deployment stays auditable and can be re-enabled.
 */
export async function disableDeployment(
  _prev: DeploymentActionState,
  formData: FormData
): Promise<DeploymentActionState> {
  const parsed = deploymentIdSchema.safeParse({ deploymentId: formData.get("deploymentId") });
  if (!parsed.success) return { error: "Invalid deployment." };

  const ctx = await getOrgContext();
  const denied = requireRole(ctx, ["owner", "admin"]);
  if (denied) return { error: denied };

  const supabase = createClient();
  const { data: deployment } = await supabase
    .from("agent_deployments")
    .select("id, name, status")
    .eq("id", parsed.data.deploymentId)
    .eq("org_id", ctx.orgId)
    .single();
  if (!deployment) return { error: "Deployment not found." };
  if (deployment.status === "disabled") return { error: null, success: "Already disabled." };

  const { error } = await supabase
    .from("agent_deployments")
    .update({ status: "disabled" })
    .eq("id", deployment.id)
    .eq("org_id", ctx.orgId);
  if (error) return { error: "Couldn't disable the deployment. Please try again." };

  await supabase.from("audit_logs").insert({
    org_id: ctx.orgId,
    actor_id: ctx.userId,
    action: "deployment_disabled",
    metadata: { deployment_id: deployment.id, previous_status: deployment.status },
  });

  revalidatePath("/dashboard/deployments");
  return { error: null, success: `${deployment.name} disabled.` };
}

/** Puts a disabled deployment back into service at its existing version. */
export async function enableDeployment(
  _prev: DeploymentActionState,
  formData: FormData
): Promise<DeploymentActionState> {
  const parsed = deploymentIdSchema.safeParse({ deploymentId: formData.get("deploymentId") });
  if (!parsed.success) return { error: "Invalid deployment." };

  const ctx = await getOrgContext();
  const denied = requireRole(ctx, ["owner", "admin"]);
  if (denied) return { error: denied };

  const supabase = createClient();
  const { data: deployment } = await supabase
    .from("agent_deployments")
    .select("id, name, agent_id, status")
    .eq("id", parsed.data.deploymentId)
    .eq("org_id", ctx.orgId)
    .single();
  if (!deployment) return { error: "Deployment not found." };

  // Re-enabling must not resurrect a deployment whose agent has since been
  // archived or has failed — that would put a broken endpoint back online.
  const { data: agent } = await supabase
    .from("agents")
    .select("status")
    .eq("id", deployment.agent_id)
    .eq("org_id", ctx.orgId)
    .single();
  if (!agent || agent.status !== "ready") {
    return { error: "The underlying agent is not ready, so this deployment cannot be re-enabled." };
  }

  const { error } = await supabase
    .from("agent_deployments")
    .update({ status: "active" })
    .eq("id", deployment.id)
    .eq("org_id", ctx.orgId);
  if (error) return { error: "Couldn't enable the deployment. Please try again." };

  await supabase.from("audit_logs").insert({
    org_id: ctx.orgId,
    actor_id: ctx.userId,
    action: "deployment_enabled",
    metadata: { deployment_id: deployment.id },
  });

  revalidatePath("/dashboard/deployments");
  return { error: null, success: `${deployment.name} is live again.` };
}

/**
 * Rolls an agent back to a previous deployment's configuration snapshot.
 *
 * Creates a NEW deployment carrying the older snapshot rather than mutating the
 * old row: the history of what was live and when has to stay intact, and the
 * run records that reference each deployment id must keep pointing at the
 * deployment that actually served them.
 */
export async function rollbackDeployment(
  _prev: DeploymentActionState,
  formData: FormData
): Promise<DeploymentActionState> {
  const parsed = deploymentIdSchema.safeParse({ deploymentId: formData.get("deploymentId") });
  if (!parsed.success) return { error: "Invalid deployment." };

  const ctx = await getOrgContext();
  const denied = requireRole(ctx, ["owner", "admin"]);
  if (denied) return { error: denied };

  const supabase = createClient();
  const { data: target } = await supabase
    .from("agent_deployments")
    .select("id, name, agent_id, environment, version, config")
    .eq("id", parsed.data.deploymentId)
    .eq("org_id", ctx.orgId)
    .single();
  if (!target) return { error: "Deployment not found." };

  const { data: latest } = await supabase
    .from("agent_deployments")
    .select("version")
    .eq("org_id", ctx.orgId)
    .eq("agent_id", target.agent_id)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();

  if ((latest?.version ?? 0) === target.version) {
    return { error: "This is already the newest deployment — there is nothing to roll back to." };
  }

  const version = (latest?.version ?? 0) + 1;
  const { data: created, error } = await supabase
    .from("agent_deployments")
    .insert({
      org_id: ctx.orgId,
      agent_id: target.agent_id,
      name: target.name,
      environment: target.environment,
      status: "active",
      version,
      config: {
        ...((target.config ?? {}) as Record<string, unknown>),
        rolled_back_from_version: target.version,
      },
      created_by: ctx.userId,
    })
    .select("id")
    .single();
  if (error || !created) return { error: "Couldn't roll back. Please try again." };

  await supabase
    .from("agent_deployments")
    .update({ endpoint_url: `/api/v1/deployments/${created.id}/run` })
    .eq("id", created.id)
    .eq("org_id", ctx.orgId);

  // Supersede the previously-live deployments for this agent and environment.
  await supabase
    .from("agent_deployments")
    .update({ status: "rolled_back" })
    .eq("org_id", ctx.orgId)
    .eq("agent_id", target.agent_id)
    .eq("environment", target.environment)
    .eq("status", "active")
    .neq("id", created.id);

  await supabase.from("audit_logs").insert({
    org_id: ctx.orgId,
    actor_id: ctx.userId,
    action: "deployment_rolled_back",
    metadata: { deployment_id: created.id, restored_from: target.id, version },
  });

  revalidatePath("/dashboard/deployments");
  return { error: null, success: `Rolled back to v${target.version} as v${version}.` };
}
