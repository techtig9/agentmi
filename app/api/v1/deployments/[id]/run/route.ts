import { guardConfigured } from "@/lib/api/not-configured";
import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { authenticateApiRequest } from "@/lib/api-keys/authenticate";
import { runAgentChat, toAgentForChat } from "@/lib/chat/run-agent-chat";
import { creditCostFor } from "@/lib/pricing/costs";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit/check";
import { recordAgentRun } from "@/lib/observability/record-run";

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const notConfigured = guardConfigured();
  if (notConfigured) return notConfigured;

  const auth = await authenticateApiRequest(request);
  if (!auth) return NextResponse.json({ error: "Invalid or missing API key." }, { status: 401 });
  const rate = await checkRateLimit(`deployment:${auth.keyId}`, RATE_LIMITS.apiKeyChat);
  if (!rate.allowed) return NextResponse.json({ error: "Rate limit exceeded." }, { status: 429, headers: { "Retry-After": String(Math.ceil(rate.retryAfterMs / 1000)) } });

  const supabase = createServiceClient();
  const { data: deployment } = await supabase.from("agent_deployments").select("id,agent_id,org_id,name,environment,status,version").eq("id", params.id).eq("org_id", auth.orgId).single();
  if (!deployment) return NextResponse.json({ error: "Deployment not found." }, { status: 404 });
  if (deployment.status !== "active") return NextResponse.json({ error: `Deployment is not active (status: ${deployment.status}).` }, { status: 409 });

  let body: { message?: string; company_name?: string };
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 }); }
  if (!body.message || typeof body.message !== "string" || body.message.length > 4000) return NextResponse.json({ error: 'Request body must include a "message" string under 4000 characters.' }, { status: 400 });

  const { data: agent } = await supabase.from("agents").select("id,kind,status,config,templates(name,config)").eq("id", deployment.agent_id).eq("org_id", auth.orgId).single();
  if (!agent || agent.kind !== "ai") return NextResponse.json({ error: "Deployed AI agent not found." }, { status: 404 });
  if (agent.status !== "ready") return NextResponse.json({ error: `Agent is not ready (status: ${agent.status}).` }, { status: 409 });

  const cost = creditCostFor("ai_message");
  const { data: creditResultRaw } = await supabase.rpc("consume_credits", { p_org_id: auth.orgId, p_amount: cost, p_reason: "deployment_run", p_related_agent_id: agent.id }).single();
  const creditResult = creditResultRaw as unknown as { allowed: boolean; shortfall: number } | null;
  if (creditResult && !creditResult.allowed) return NextResponse.json({ error: `Not enough credits. Short by ${creditResult.shortfall}.` }, { status: 402 });

  const started = Date.now();
  try {
    const result = await runAgentChat(toAgentForChat(agent), body.message, body.company_name ?? "the company");
    await recordAgentRun({ orgId: auth.orgId, agentId: agent.id, deploymentId: deployment.id, status: "succeeded", input: { message: body.message }, output: { reply: result.reply }, trace: [{ step: "deployment", deployment_id: deployment.id, environment: deployment.environment, version: deployment.version }, { step: "retrieve", sources: result.sourcesUsed }, { step: "model", provider: "anthropic", model: result.model }, ...result.toolCalls.map((t) => ({ step: "tool", name: t.name, tool_id: t.toolId, status: t.error ? "failed" : "succeeded" }))], durationMs: Date.now() - started, tokenUsage: result.tokenUsage, costUsd: 0 });
    return NextResponse.json({ deployment_id: deployment.id, agent_id: agent.id, version: deployment.version, environment: deployment.environment, reply: result.reply, sources_used: result.sourcesUsed, model: result.model, token_usage: result.tokenUsage, tool_calls: result.toolCalls });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Deployment execution failed.";
    await recordAgentRun({ orgId: auth.orgId, agentId: agent.id, deploymentId: deployment.id, status: "failed", input: { message: body.message }, error: message, trace: [{ step: "deployment", deployment_id: deployment.id, status: "failed" }], durationMs: Date.now() - started, costUsd: 0 });
    return NextResponse.json({ error: "Deployment execution failed. Check Runs for details." }, { status: 502 });
  }
}
