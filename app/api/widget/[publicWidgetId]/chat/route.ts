import { providerOf } from "@/lib/chat/provider-of";
import { guardConfigured } from "@/lib/api/not-configured";
import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { runAgentChat, toAgentForChat } from "@/lib/chat/run-agent-chat";
import { creditCostFor } from "@/lib/pricing/costs";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit/check";
import { recordAgentRun } from "@/lib/observability/record-run";

function clientIp(request: Request): string {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
}

async function loadWidgetAgent(publicWidgetId: string, supabase: ReturnType<typeof createServiceClient>) {
  // Selects only what a public visitor should ever see — never config
  // beyond the prompt template needed to answer, never other orgs' data.
  const { data: agent } = await supabase
    .from("agents")
    .select("id, org_id, name, theme, kind, status, config, templates(config)")
    .eq("public_widget_id", publicWidgetId)
    .single();
  return agent;
}

async function resolveBranding(orgId: string, supabase: ReturnType<typeof createServiceClient>) {
  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("plan")
    .eq("org_id", orgId)
    .single();
  // Business tier is the only plan white-label is offered on (PRD Section 7).
  return subscription?.plan !== "business";
}

export async function GET(request: Request, { params }: { params: { publicWidgetId: string } }) {
  const notConfigured = guardConfigured();
  if (notConfigured) return notConfigured;

  const supabase = createServiceClient();
  const agent = await loadWidgetAgent(params.publicWidgetId, supabase);

  if (!agent || agent.kind !== "ai" || agent.status !== "ready") {
    return NextResponse.json({ error: "Widget not available." }, { status: 404 });
  }

  const showBranding = await resolveBranding(agent.org_id, supabase);
  return NextResponse.json({ name: agent.name, theme: agent.theme, show_branding: showBranding });
}

export async function POST(request: Request, { params }: { params: { publicWidgetId: string } }) {
  const supabase = createServiceClient();
  const agent = await loadWidgetAgent(params.publicWidgetId, supabase);

  if (!agent || agent.kind !== "ai" || agent.status !== "ready") {
    return NextResponse.json({ error: "Widget not available." }, { status: 404 });
  }

  let body: { message?: string; company_name?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }
  if (!body.message || typeof body.message !== "string" || body.message.length > 4000) {
    return NextResponse.json({ error: "Provide a non-empty message under 4000 characters." }, { status: 400 });
  }

  const rateLimitKey = `widget_chat:${params.publicWidgetId}:${clientIp(request)}`;
  const rateLimit = await checkRateLimit(rateLimitKey, RATE_LIMITS.widgetChat);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Too many messages — please slow down." },
      { status: 429, headers: { "Retry-After": String(Math.ceil(rateLimit.retryAfterMs / 1000)) } }
    );
  }

  const cost = creditCostFor("ai_message");
  const { data: creditResultRaw } = await supabase
    .rpc("consume_credits", { p_org_id: agent.org_id, p_amount: cost, p_reason: "ai_message", p_related_agent_id: agent.id })
    .single();
  const creditResult = creditResultRaw as unknown as { allowed: boolean; shortfall: number } | null;
  if (creditResult && !creditResult.allowed) {
    // A widget visitor never sees "buy more credits" — that's the org
    // owner's problem, not theirs. Generic message, logged server-side.
    console.error(`widget chat blocked — org ${agent.org_id} out of credits`);
    return NextResponse.json({ error: "This assistant is temporarily unavailable." }, { status: 503 });
  }

  const started = Date.now();
  try {
    const normalizedAgent = toAgentForChat(agent);
    const result = await runAgentChat(
      normalizedAgent,
      body.message,
      body.company_name ?? "the company"
    );
    await recordAgentRun({
      orgId: agent.org_id,
      agentId: agent.id,
      status: "succeeded",
      input: { message: body.message, channel: "widget" },
      output: { reply: result.reply },
      // "widget" is the channel, not the provider. Recording it here
      // attributed every widget run to a provider named "widget" in the
      // analytics breakdown; the channel belongs on its own trace step.
      trace: [
        { step: "channel", channel: "widget" },
        { step: "model", provider: providerOf(result.model), model: result.model },
      ],
      durationMs: Date.now() - started,
      tokenUsage: result.tokenUsage,
      costUsd: result.costUsd,
    });
    return NextResponse.json({ reply: result.reply });
  } catch (e) {
    const message = e instanceof Error ? e.message : "widget chat failed";
    console.error("widget chat failed:", message);
    await recordAgentRun({
      orgId: agent.org_id,
      agentId: agent.id,
      status: "failed",
      input: { message: body.message, channel: "widget" },
      error: message,
      trace: [{ step: "agent", status: "failed" }],
      durationMs: Date.now() - started,
      // The call threw before returning usage, so the cost is unknown.
      costUsd: null,
    });
    return NextResponse.json({ error: "This assistant is temporarily unavailable." }, { status: 502 });
  }
}
