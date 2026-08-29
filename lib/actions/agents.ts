"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getOrgContext } from "@/lib/data/org-context";
import { creditCostFor } from "@/lib/pricing/costs";
import { ingestKnowledgeText } from "@/lib/actions/knowledge";
import { dispatchWebhookEvent } from "@/lib/webhooks-outbound/dispatch";
import { z } from "zod";

const createAgentSchema = z.object({
  kind: z.enum(["ai", "ml"]),
  templateId: z.string().uuid(),
  theme: z.string().min(1),
  name: z.string().min(2).max(80),
  description: z.string().min(10),
  dataSourceRef: z.string().optional(),
});

export type CreateAgentState = { error: string | null };

export async function createAgent(
  _prev: CreateAgentState,
  formData: FormData
): Promise<CreateAgentState> {
  const parsed = createAgentSchema.safeParse({
    kind: formData.get("kind"),
    templateId: formData.get("templateId"),
    theme: formData.get("theme"),
    name: formData.get("name"),
    description: formData.get("description"),
    dataSourceRef: formData.get("dataSourceRef") || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  if (parsed.data.kind === "ml") {
    // ML Agents go through trainMlAgent (lib/actions/training.ts), called
    // from /dashboard/create/ml — this action only ever handles AI agents.
    return { error: "ML Agents are created via the dataset upload flow, not this form." };
  }

  const ctx = await getOrgContext();
  const supabase = createClient();

  const { count: existingAgentCount } = await supabase
    .from("agents")
    .select("id", { count: "exact", head: true })
    .eq("org_id", ctx.orgId);

  const isFirstBuildForOrg = (existingAgentCount ?? 0) === 0;
  const cost = creditCostFor("create_ai_agent", { isFirstBuildForOrg });

  if (!ctx.isAdmin) {
    const { data: creditResultRaw, error: creditError } = await supabase
      .rpc("consume_credits", {
        p_org_id: ctx.orgId,
        p_amount: cost,
        p_reason: "create_ai_agent",
        p_actor_id: ctx.userId,
      })
      .single();
    const creditResult = creditResultRaw as unknown as { allowed: boolean; shortfall: number } | null;

    if (creditError) {
      return { error: "Couldn't check your credit balance. Please try again." };
    }
    if (creditResult && !creditResult.allowed) {
      return {
        error: `Not enough credits — this build costs ${cost}, you're short ${creditResult.shortfall}. Upgrade or top up on the Billing page.`,
      };
    }
  }

  const { data: agent, error: agentError } = await supabase
    .from("agents")
    .insert({
      org_id: ctx.orgId,
      kind: "ai",
      name: parsed.data.name,
      status: "ready", // AI agents are usable immediately — no training step
      template_id: parsed.data.templateId,
      theme: parsed.data.theme,
      config: { description: parsed.data.description },
      created_by: ctx.userId,
    })
    .select("id")
    .single();

  if (agentError || !agent) {
    return { error: "Couldn't create the agent. Please try again." };
  }

  if (parsed.data.dataSourceRef && parsed.data.dataSourceRef.trim().length > 0) {
    // Best-effort: the agent already exists and is usable even if embedding
    // fails (e.g. Gemini API hiccup) — surface it via audit log rather than
    // blocking creation on a knowledge-ingestion failure.
    const ingestResult = await ingestKnowledgeText(agent.id, parsed.data.dataSourceRef);
    if (ingestResult.error) {
      await supabase.from("audit_logs").insert({
        org_id: ctx.orgId,
        actor_id: ctx.userId,
        action: "knowledge_ingest_failed_at_creation",
        metadata: { agent_id: agent.id, error: ingestResult.error },
      });
    }
  }

  await supabase.from("audit_logs").insert({
    org_id: ctx.orgId,
    actor_id: ctx.userId,
    action: "agent_created",
    metadata: { agent_id: agent.id, kind: "ai", cost },
  });

  await dispatchWebhookEvent(ctx.orgId, "agent.created", agent.id, { name: parsed.data.name, kind: "ai" });

  redirect(`/dashboard/agents`);
}
