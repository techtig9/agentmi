import { guardConfigured } from "@/lib/api/not-configured";
import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { authenticateApiRequest } from "@/lib/api-keys/authenticate";
import { predict, type StoredModel } from "@/lib/ml/inference/predict";
import { creditCostFor } from "@/lib/pricing/costs";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit/check";

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const notConfigured = guardConfigured();
  if (notConfigured) return notConfigured;

  const auth = await authenticateApiRequest(request);
  if (!auth) {
    return NextResponse.json({ error: "Invalid or missing API key." }, { status: 401 });
  }

  const rateLimit = await checkRateLimit(`predict:${auth.keyId}`, RATE_LIMITS.apiKeyPredict);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Rate limit exceeded." },
      { status: 429, headers: { "Retry-After": String(Math.ceil(rateLimit.retryAfterMs / 1000)) } }
    );
  }

  const supabase = createServiceClient();

  const { data: agent } = await supabase
    .from("agents")
    .select("id, kind, status, config")
    .eq("id", params.id)
    .eq("org_id", auth.orgId)
    .single();

  if (!agent) {
    return NextResponse.json({ error: "Agent not found." }, { status: 404 });
  }
  if (agent.kind !== "ml") {
    return NextResponse.json({ error: "This agent isn't an ML agent." }, { status: 400 });
  }
  if (agent.status !== "ready") {
    return NextResponse.json({ error: `Agent is not ready (status: ${agent.status}).` }, { status: 409 });
  }

  const model = (agent.config as { model?: StoredModel })?.model;
  if (!model) {
    return NextResponse.json({ error: "No trained model found on this agent." }, { status: 500 });
  }

  let body: { features?: Record<string, number> };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }
  if (!body.features || typeof body.features !== "object") {
    return NextResponse.json({ error: 'Request body must include a "features" object.' }, { status: 400 });
  }

  const cost = creditCostFor("ml_prediction");
  const { data: creditResultRaw } = await supabase
    .rpc("consume_credits", { p_org_id: auth.orgId, p_amount: cost, p_reason: "ml_prediction", p_related_agent_id: agent.id })
    .single();
  const creditResult = creditResultRaw as unknown as { allowed: boolean; shortfall: number } | null;
  if (creditResult && !creditResult.allowed) {
    return NextResponse.json(
      { error: `Not enough credits — this costs ${cost}, you're short ${creditResult.shortfall}.` },
      { status: 402 }
    );
  }

  try {
    const result = predict(model, body.features);
    await supabase.from("prediction_history").insert({
      org_id: auth.orgId,
      agent_id: agent.id,
      input: body.features,
      output: result,
    });

    // Multi-class predictions carry a numeric classLabel — translate it
    // back to the human-readable name a caller actually wants, if we
    // stored one (we always do, from lib/ml/encode-multiclass.ts).
    const classNames = (agent.config as { class_names?: string[] })?.class_names;
    const className =
      classNames && "classLabel" in result ? classNames[(result as { classLabel: number }).classLabel] : undefined;

    return NextResponse.json({ agent_id: agent.id, ...result, ...(className ? { className } : {}) });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Prediction failed." },
      { status: 400 }
    );
  }
}
