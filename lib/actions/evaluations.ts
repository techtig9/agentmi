"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getOrgContext } from "@/lib/data/org-context";
import { creditCostFor } from "@/lib/pricing/costs";
import { runAgentChat, toAgentForChat } from "@/lib/chat/run-agent-chat";
import { parseEvalCases } from "@/lib/evaluations/parse-cases";
import { caseWasPassed, scorePercent, type ScoredCase } from "@/lib/evaluations/score";

const createSchema = z.object({
  agentId: z.string().uuid(),
  name: z.string().trim().min(2).max(80),
  casesText: z.string().min(1),
});

export type CreateEvaluationState = { error: string | null };

export async function createEvaluation(_prev: CreateEvaluationState, formData: FormData): Promise<CreateEvaluationState> {
  const parsed = createSchema.safeParse({
    agentId: formData.get("agentId"),
    name: formData.get("name"),
    casesText: formData.get("casesText"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const parsedCases = parseEvalCases(parsed.data.casesText);
  if (!parsedCases.ok) return { error: parsedCases.error };

  const ctx = await getOrgContext();
  const supabase = createClient();

  const { data: agent } = await supabase
    .from("agents")
    .select("id")
    .eq("id", parsed.data.agentId)
    .eq("org_id", ctx.orgId)
    .eq("kind", "ai")
    .single();
  if (!agent) return { error: "AI agent not found in this workspace." };

  const { error } = await supabase.from("agent_evaluations").insert({
    org_id: ctx.orgId,
    agent_id: parsed.data.agentId,
    name: parsed.data.name,
    status: "draft",
    test_count: parsedCases.cases.length,
    cases: parsedCases.cases,
  });
  if (error) return { error: "Couldn't create the evaluation. Please try again." };

  revalidatePath("/dashboard/evaluations");
  return { error: null };
}

/**
 * Runs every case in an evaluation for real: each case is an actual chat
 * completion through the target agent (same runtime the product uses
 * everywhere else — no separate/fake evaluation path), scored by
 * deterministic substring match, then persisted back onto the evaluation
 * row. Credits are charged per case since each one is a real model call —
 * same cost driver as any other agent conversation.
 */
export async function runEvaluation(formData: FormData) {
  const evaluationId = String(formData.get("evaluationId") || "");
  if (!z.string().uuid().safeParse(evaluationId).success) throw new Error("Invalid evaluation.");

  const ctx = await getOrgContext();
  const supabase = createClient();

  const { data: evaluation } = await supabase
    .from("agent_evaluations")
    .select("id,agent_id,cases")
    .eq("id", evaluationId)
    .eq("org_id", ctx.orgId)
    .single();
  if (!evaluation) throw new Error("Evaluation not found.");

  const cases = Array.isArray(evaluation.cases) ? (evaluation.cases as { input: string; expectedContains: string }[]) : [];
  if (!cases.length) throw new Error("This evaluation has no test cases.");

  const cost = creditCostFor("ai_message") * cases.length;
  if (!ctx.isAdmin) {
    const { data: creditRaw, error: creditError } = await supabase
      .rpc("consume_credits", { p_org_id: ctx.orgId, p_amount: cost, p_reason: "run_evaluation", p_actor_id: ctx.userId })
      .single();
    const creditResult = creditRaw as unknown as { allowed: boolean; shortfall: number } | null;
    if (creditError) throw new Error("Couldn't check your credit balance. Please try again.");
    if (creditResult && !creditResult.allowed) {
      throw new Error(`Not enough credits — this run costs ${cost}, you're short ${creditResult.shortfall}.`);
    }
  }

  await supabase.from("agent_evaluations").update({ status: "running" }).eq("id", evaluationId).eq("org_id", ctx.orgId);

  const { data: agentRow } = await supabase
    .from("agents")
    .select("id,org_id,config,templates(config)")
    .eq("id", evaluation.agent_id)
    .eq("org_id", ctx.orgId)
    .single();
  if (!agentRow) {
    await supabase.from("agent_evaluations").update({ status: "failed" }).eq("id", evaluationId).eq("org_id", ctx.orgId);
    throw new Error("The evaluated agent no longer exists.");
  }
  const agent = toAgentForChat(agentRow);

  const results: ScoredCase[] = [];
  for (const c of cases) {
    try {
      const result = await runAgentChat(agent, c.input, ctx.orgName);
      results.push({ input: c.input, expectedContains: c.expectedContains, actualReply: result.reply, passed: caseWasPassed(result.reply, c.expectedContains) });
    } catch (e) {
      results.push({ input: c.input, expectedContains: c.expectedContains, actualReply: e instanceof Error ? `[error] ${e.message}` : "[error]", passed: false });
    }
  }

  await supabase
    .from("agent_evaluations")
    .update({ status: "completed", score: scorePercent(results), cases: results, updated_at: new Date().toISOString() })
    .eq("id", evaluationId)
    .eq("org_id", ctx.orgId);

  revalidatePath("/dashboard/evaluations");
}
