import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getOrgContext } from "@/lib/data/org-context";
import { runAgentChat, toAgentForChat, agentConfig } from "@/lib/chat/run-agent-chat";
import { creditCostFor } from "@/lib/pricing/costs";
import { recordAgentRun } from "@/lib/observability/record-run";
import { getOrCreateSession, loadSessionMessages, appendSessionMessages, getMemories } from "@/lib/memory/store";

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const ctx = await getOrgContext();
  const supabase = createClient();
  let body: { message?: string; company_name?: string; history?: { role: "user" | "assistant"; content: string }[]; session_id?: string; memory_enabled?: boolean };
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid JSON." }, { status: 400 }); }
  if (!body.message || typeof body.message !== "string" || body.message.length > 4000) {
    return NextResponse.json({ error: "Message is required and must be under 4000 characters." }, { status: 400 });
  }
  const { data: agent } = await supabase.from("agents")
    .select("id,org_id,name,kind,status,config,templates(config)")
    .eq("id", params.id).eq("org_id", ctx.orgId).single();
  if (!agent) return NextResponse.json({ error: "Agent not found." }, { status: 404 });
  if (agent.kind !== "ai") return NextResponse.json({ error: "Only AI agents can use chat." }, { status: 400 });
  if (agent.status !== "ready") return NextResponse.json({ error: `Agent is not ready (${agent.status}).` }, { status: 409 });

  const cost = creditCostFor("ai_message");
  if (!ctx.isAdmin) {
    const { data: result, error } = await supabase.rpc("consume_credits", { p_org_id: ctx.orgId, p_amount: cost, p_reason: "ai_message", p_actor_id: ctx.userId, p_related_agent_id: agent.id }).single();
    const r = result as unknown as { allowed: boolean; shortfall: number } | null;
    if (error) return NextResponse.json({ error: "Unable to check credits." }, { status: 500 });
    if (r && !r.allowed) return NextResponse.json({ error: `Not enough credits. Short by ${r.shortfall}.` }, { status: 402 });
  }

  const started = Date.now();
  try {
    const sessionId = await getOrCreateSession({ orgId: ctx.orgId, agentId: agent.id, userId: ctx.userId, sessionId: typeof body.session_id === "string" ? body.session_id : undefined });
    const storedHistory = body.memory_enabled === false ? [] : await loadSessionMessages(sessionId, ctx.orgId, agent.id, ctx.userId, 20);
    const history = storedHistory.length ? storedHistory : (Array.isArray(body.history) ? body.history.slice(-20) : []);
    const memories = body.memory_enabled === false ? [] : await getMemories({ orgId: ctx.orgId, agentId: agent.id, userId: ctx.userId });
    const normalizedAgent = toAgentForChat(agent);
    const runtimeAgent = { ...normalizedAgent, config: { ...(agentConfig(normalizedAgent.config)), __memory_context: memories } };
    if (history.some((m) => !m || (m.role !== "user" && m.role !== "assistant") || typeof m.content !== "string" || m.content.length > 4000)) {
      return NextResponse.json({ error: "Invalid conversation history." }, { status: 400 });
    }
    const result = await runAgentChat(runtimeAgent, body.message, body.company_name ?? "the company", history);
    if (body.memory_enabled !== false) await appendSessionMessages({ sessionId, orgId: ctx.orgId, agentId: agent.id, userId: ctx.userId, user: body.message, assistant: result.reply });
    await recordAgentRun({ orgId: ctx.orgId, agentId: agent.id, status: "succeeded", input: { message: body.message }, output: { reply: result.reply }, trace: [{ step: "retrieve", sources: result.sourcesUsed }, { step: "model", provider: "anthropic", model: result.model }, ...result.toolCalls.map((t) => ({ step: "tool", name: t.name, tool_id: t.toolId, status: t.error ? "failed" : "succeeded" }))], durationMs: Date.now() - started, tokenUsage: result.tokenUsage, costUsd: 0 });
    return NextResponse.json({ reply: result.reply, sources_used: result.sourcesUsed, model: result.model, token_usage: result.tokenUsage, tool_calls: result.toolCalls, session_id: sessionId, memory_used: result.memoryUsed });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Chat failed.";
    await recordAgentRun({ orgId: ctx.orgId, agentId: agent.id, status: "failed", input: { message: body.message }, error: message, trace: [{ step: "agent", status: "failed" }], durationMs: Date.now() - started, costUsd: 0 });
    return NextResponse.json({ error: "Agent execution failed. Check Runs for details." }, { status: 502 });
  }
}
