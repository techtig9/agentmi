"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getOrgContext, requireRole } from "@/lib/data/org-context";
import { creditCostFor } from "@/lib/pricing/costs";
import { dispatchWebhookEvent } from "@/lib/webhooks-outbound/dispatch";
import { nextCopyName } from "@/lib/agents/copy-name";

/**
 * Agent lifecycle actions beyond creation.
 *
 * `createAgent` (agents.ts) was the only agent action that existed, which left
 * the builder read-only and the agent list without Edit/Duplicate/Archive.
 * These fill that gap; creation itself is untouched.
 *
 * Every action here re-reads the agent scoped to `org_id` from the session
 * context rather than trusting the id alone, so a valid id from another
 * organization resolves to "not found" instead of leaking or mutating it.
 */

export type AgentActionState = { error: string | null; success?: string };

/**
 * Config keys the chat runtime actually reads (see run-agent-chat.ts). Only
 * these are writable — an arbitrary config merge would let the form inject
 * runtime-internal keys such as `__memory_context`.
 */
const updateAgentSchema = z.object({
  agentId: z.string().uuid(),
  name: z.string().trim().min(2, "Name must be at least 2 characters.").max(80, "Name must be 80 characters or fewer."),
  description: z.string().trim().max(2000, "Description must be 2000 characters or fewer.").optional(),
  systemPrompt: z.string().trim().max(8000, "Instructions must be 8000 characters or fewer.").optional(),
  model: z.string().trim().max(120, "Model id must be 120 characters or fewer.").optional(),
  maxTokens: z.coerce
    .number()
    .int("Max tokens must be a whole number.")
    .min(128, "Max tokens must be at least 128.")
    .max(4096, "Max tokens cannot exceed 4096.")
    .optional(),
});

export async function updateAgent(
  _prev: AgentActionState,
  formData: FormData
): Promise<AgentActionState> {
  const parsed = updateAgentSchema.safeParse({
    agentId: formData.get("agentId"),
    name: formData.get("name"),
    description: formData.get("description") || undefined,
    systemPrompt: formData.get("systemPrompt") || undefined,
    model: formData.get("model") || undefined,
    maxTokens: formData.get("maxTokens") || undefined,
  });

  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const ctx = await getOrgContext();
  const supabase = createClient();

  const { data: agent } = await supabase
    .from("agents")
    .select("id, config, status")
    .eq("id", parsed.data.agentId)
    .eq("org_id", ctx.orgId)
    .single();

  if (!agent) return { error: "Agent not found." };

  // Merge onto the stored config so ML metrics, class names and any other
  // keys this form does not manage survive the write.
  const existing = (agent.config ?? {}) as Record<string, unknown>;
  const config: Record<string, unknown> = { ...existing };

  config.description = parsed.data.description ?? "";
  setOrClear(config, "system_prompt", parsed.data.systemPrompt);
  setOrClear(config, "model", parsed.data.model);
  if (parsed.data.maxTokens === undefined) delete config.max_tokens;
  else config.max_tokens = parsed.data.maxTokens;

  const { error } = await supabase
    .from("agents")
    .update({ name: parsed.data.name, config, updated_at: new Date().toISOString() })
    .eq("id", agent.id)
    .eq("org_id", ctx.orgId);

  if (error) return { error: "Couldn't save the agent. Please try again." };

  await supabase.from("audit_logs").insert({
    org_id: ctx.orgId,
    actor_id: ctx.userId,
    action: "agent_updated",
    metadata: { agent_id: agent.id, fields: changedFields(existing, config) },
  });

  revalidatePath(`/dashboard/agents/${agent.id}`);
  revalidatePath(`/dashboard/agents/${agent.id}/builder`);
  revalidatePath("/dashboard/agents");

  return { error: null, success: "Agent saved." };
}

/** Writes a trimmed value, or removes the key entirely when the field was cleared. */
function setOrClear(config: Record<string, unknown>, key: string, value: string | undefined) {
  if (value === undefined || value.length === 0) delete config[key];
  else config[key] = value;
}

/** Names which fields changed, for the audit entry. Never records the values themselves. */
function changedFields(
  before: Record<string, unknown>,
  after: Record<string, unknown>
): string[] {
  const keys = ["description", "system_prompt", "model", "max_tokens"];
  return keys.filter((key) => JSON.stringify(before[key]) !== JSON.stringify(after[key]));
}

const agentIdSchema = z.object({ agentId: z.string().uuid() });

/**
 * Soft-archives an agent. Archiving is reversible and leaves runs, knowledge
 * and deployments intact — there is deliberately no hard delete here, because
 * execution history has to stay auditable.
 */
export async function archiveAgent(
  _prev: AgentActionState,
  formData: FormData
): Promise<AgentActionState> {
  const parsed = agentIdSchema.safeParse({ agentId: formData.get("agentId") });
  if (!parsed.success) return { error: "Invalid agent." };

  const ctx = await getOrgContext();
  const denied = requireRole(ctx, ["owner", "admin"]);
  if (denied) return { error: denied };

  const supabase = createClient();
  const { data: agent } = await supabase
    .from("agents")
    .select("id, name, status")
    .eq("id", parsed.data.agentId)
    .eq("org_id", ctx.orgId)
    .single();

  if (!agent) return { error: "Agent not found." };
  if (agent.status === "archived") return { error: null, success: "Agent is already archived." };

  const { error } = await supabase
    .from("agents")
    .update({ status: "archived", updated_at: new Date().toISOString() })
    .eq("id", agent.id)
    .eq("org_id", ctx.orgId);

  if (error) return { error: "Couldn't archive the agent. Please try again." };

  await supabase.from("audit_logs").insert({
    org_id: ctx.orgId,
    actor_id: ctx.userId,
    action: "agent_archived",
    metadata: { agent_id: agent.id, previous_status: agent.status },
  });

  revalidatePath("/dashboard/agents");
  revalidatePath(`/dashboard/agents/${agent.id}`);
  return { error: null, success: `${agent.name} archived.` };
}

/** Restores an archived agent to draft so it can be reviewed before use. */
export async function restoreAgent(
  _prev: AgentActionState,
  formData: FormData
): Promise<AgentActionState> {
  const parsed = agentIdSchema.safeParse({ agentId: formData.get("agentId") });
  if (!parsed.success) return { error: "Invalid agent." };

  const ctx = await getOrgContext();
  const denied = requireRole(ctx, ["owner", "admin"]);
  if (denied) return { error: denied };

  const supabase = createClient();
  const { data: agent } = await supabase
    .from("agents")
    .select("id, name, kind, status")
    .eq("id", parsed.data.agentId)
    .eq("org_id", ctx.orgId)
    .single();

  if (!agent) return { error: "Agent not found." };
  if (agent.status !== "archived") return { error: "Only archived agents can be restored." };

  // AI agents are usable immediately; an ML agent needs its model checked
  // before it can serve predictions again, so it returns to draft.
  const restoredStatus = agent.kind === "ai" ? "ready" : "draft";

  const { error } = await supabase
    .from("agents")
    .update({ status: restoredStatus, updated_at: new Date().toISOString() })
    .eq("id", agent.id)
    .eq("org_id", ctx.orgId);

  if (error) return { error: "Couldn't restore the agent. Please try again." };

  await supabase.from("audit_logs").insert({
    org_id: ctx.orgId,
    actor_id: ctx.userId,
    action: "agent_restored",
    metadata: { agent_id: agent.id, status: restoredStatus },
  });

  revalidatePath("/dashboard/agents");
  return { error: null, success: `${agent.name} restored.` };
}

/**
 * Copies an agent's configuration into a new agent.
 *
 * Charges the same credit cost as building one, because the copy is a new
 * billable agent — and deliberately does NOT copy knowledge chunks, memories
 * or run history, which belong to the original.
 */
export async function duplicateAgent(
  _prev: AgentActionState,
  formData: FormData
): Promise<AgentActionState> {
  const parsed = agentIdSchema.safeParse({ agentId: formData.get("agentId") });
  if (!parsed.success) return { error: "Invalid agent." };

  const ctx = await getOrgContext();
  const supabase = createClient();

  const { data: agent } = await supabase
    .from("agents")
    .select("id, name, kind, theme, template_id, config")
    .eq("id", parsed.data.agentId)
    .eq("org_id", ctx.orgId)
    .single();

  if (!agent) return { error: "Agent not found." };
  if (agent.kind !== "ai") {
    return { error: "Only AI agents can be duplicated — an ML agent is tied to its trained model and dataset." };
  }

  const cost = creditCostFor("create_ai_agent");
  if (!ctx.isAdmin) {
    const { data: resultRaw, error: creditError } = await supabase
      .rpc("consume_credits", {
        p_org_id: ctx.orgId,
        p_amount: cost,
        p_reason: "create_ai_agent",
        p_actor_id: ctx.userId,
      })
      .single();
    const result = resultRaw as unknown as { allowed: boolean; shortfall: number } | null;
    if (creditError) return { error: "Couldn't check your credit balance. Please try again." };
    if (result && !result.allowed) {
      return {
        error: `Not enough credits — duplicating costs ${cost}, you're short ${result.shortfall}.`,
      };
    }
  }

  // Strip runtime-internal keys rather than copying the config wholesale.
  const sourceConfig = (agent.config ?? {}) as Record<string, unknown>;
  const config = Object.fromEntries(
    Object.entries(sourceConfig).filter(([key]) => !key.startsWith("__"))
  );

  const { data: copy, error } = await supabase
    .from("agents")
    .insert({
      org_id: ctx.orgId,
      kind: "ai",
      name: nextCopyName(agent.name),
      status: "ready",
      template_id: agent.template_id,
      theme: agent.theme,
      config,
      created_by: ctx.userId,
    })
    .select("id, name")
    .single();

  if (error || !copy) return { error: "Couldn't duplicate the agent. Please try again." };

  await supabase.from("audit_logs").insert({
    org_id: ctx.orgId,
    actor_id: ctx.userId,
    action: "agent_duplicated",
    metadata: { agent_id: copy.id, source_agent_id: agent.id, cost },
  });

  await dispatchWebhookEvent(ctx.orgId, "agent.created", copy.id, { name: copy.name, kind: "ai" });

  revalidatePath("/dashboard/agents");
  return { error: null, success: `Created ${copy.name}.` };
}
