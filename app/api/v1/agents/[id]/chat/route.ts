import { providerOf } from "@/lib/chat/provider-of";
import { guardConfigured } from "@/lib/api/not-configured";
import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { authenticateApiRequest } from "@/lib/api-keys/authenticate";
import { runAgentChat } from "@/lib/chat/run-agent-chat";
import { creditCostFor } from "@/lib/pricing/costs";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit/check";
import { recordAgentRun } from "@/lib/observability/record-run";

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const notConfigured = guardConfigured();
  if (notConfigured) return notConfigured;

  const auth = await authenticateApiRequest(request);
  if (!auth) return NextResponse.json({ error: "Invalid or missing API key." }, { status: 401 });

  const rateLimit = await checkRateLimit(`chat:${auth.keyId}`, RATE_LIMITS.apiKeyChat);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Rate limit exceeded." },
      { status: 429, headers: { "Retry-After": String(Math.ceil(rateLimit.retryAfterMs / 1000)) } }
    );
  }

  const supabase = createServiceClient();

  const { data: agent } = await supabase
    .from("agents")
    .select("id, kind, status, config, templates(name, config)")
    .eq("id", params.id)
    .eq("org_id", auth.orgId)
    .single();

  if (!agent) return NextResponse.json({ error: "Agent not found." }, { status: 404 });
  if (agent.kind !== "ai") return NextResponse.json({ error: "This agent isn't an AI agent." }, { status: 400 });
  if (agent.status !== "ready") {
    return NextResponse.json({ error: `Agent is not ready (status: ${agent.status}).` }, { status: 409 });
  }

  let body: { message?: string; company_name?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }
  if (!body.message || typeof body.message !== "string") {
    return NextResponse.json({ error: 'Request body must include a "message" string.' }, { status: 400 });
  }

  const cost = creditCostFor("ai_message");
  const { data: creditResultRaw } = await supabase
    .rpc("consume_credits", { p_org_id: auth.orgId, p_amount: cost, p_reason: "ai_message", p_related_agent_id: agent.id })
    .single();
  const creditResult = creditResultRaw as unknown as { allowed: boolean; shortfall: number } | null;
  if (creditResult && !creditResult.allowed) {
    return NextResponse.json(
      { error: `Not enough credits — this costs ${cost}, you're short ${creditResult.shortfall}.` },
      { status: 402 }
    );
  }

  try {
    const started = Date.now();
    const result = await runAgentChat(
      agent as unknown as { id: string; config: unknown; templates: { config: { system_prompt_template: string; escalation_enabled: boolean } } | null },
      body.message,
      body.company_name ?? "the company"
    );
    await recordAgentRun({ orgId: auth.orgId, agentId: agent.id, status: "succeeded", input: { message: body.message }, output: { reply: result.reply }, trace: [{ step: "retrieve", sources: result.sourcesUsed }, { step: "model", provider: providerOf(result.model), model: result.model }], durationMs: Date.now() - started, tokenUsage: result.tokenUsage, costUsd: result.costUsd });
    return NextResponse.json({ agent_id: agent.id, reply: result.reply, sources_used: result.sourcesUsed });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Chat request failed." }, { status: 502 });
  }
}
