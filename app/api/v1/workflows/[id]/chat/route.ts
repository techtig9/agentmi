import { NextResponse } from "next/server";
import { z } from "zod";
import { createServiceClient } from "@/lib/supabase/service";
import { authenticateApiRequest } from "@/lib/api-keys/authenticate";
import { routeToSpecialist, type Specialist } from "@/lib/agent-builder/route-workflow";
import { runAgentChat, toAgentForChat } from "@/lib/chat/run-agent-chat";
import { recordAgentRun } from "@/lib/observability/record-run";
import { creditCostFor } from "@/lib/pricing/costs";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit/check";

const bodySchema = z.object({
  message: z.string().min(1).max(4000),
  company_name: z.string().trim().max(200).optional(),
});

type GraphNode = { id: string; node_type: string; label: string; agent_id: string | null; config: unknown };
type GraphEdge = { source_node_id: string; target_node_id: string; condition: unknown };
type CreditCheckResult = { allowed: boolean; shortfall: number } | null;
type WorkflowMemberRow = {
  agent_id: string;
  keywords: string[] | null;
  agents: { id: string; name: string; status: string; config: unknown; templates: { config: unknown } | { config: unknown }[] | null }
    | { id: string; name: string; status: string; config: unknown; templates: { config: unknown } | { config: unknown }[] | null }[]
    | null;
};

function topologicalOrder(nodes: GraphNode[], edges: GraphEdge[]): GraphNode[] {
  const incoming = new Map<string, number>();
  for (const n of nodes) incoming.set(n.id, 0);
  for (const e of edges) incoming.set(e.target_node_id, (incoming.get(e.target_node_id) ?? 0) + 1);
  const q = nodes.filter((n) => (incoming.get(n.id) ?? 0) === 0);
  const out: GraphNode[] = [];
  while (q.length) {
    const n = q.shift()!;
    out.push(n);
    for (const e of edges.filter((x) => x.source_node_id === n.id)) {
      const next = incoming.get(e.target_node_id) ?? 0;
      incoming.set(e.target_node_id, next - 1);
      if (next - 1 === 0) {
        const target = nodes.find((x) => x.id === e.target_node_id);
        if (target) q.push(target);
      }
    }
  }
  return out.length === nodes.length ? out : [];
}

/** `agents` embedded under workflow_members carries a `config.description` used for routing — narrowed defensively since it's untyped JSON at the DB level. */
function memberAgentDescription(config: unknown): string {
  return config && typeof config === "object" && typeof (config as Record<string, unknown>).description === "string"
    ? ((config as Record<string, unknown>).description as string)
    : "";
}

function firstIfArray<T>(value: T | T[] | null | undefined): T | undefined {
  return Array.isArray(value) ? value[0] : value ?? undefined;
}

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const auth = await authenticateApiRequest(request);
  if (!auth) return NextResponse.json({ error: "Invalid or missing API key." }, { status: 401 });

  const rl = await checkRateLimit(`workflow_chat:${auth.keyId}`, RATE_LIMITS.apiKeyChat);
  if (!rl.allowed) return NextResponse.json({ error: "Rate limit exceeded." }, { status: 429, headers: { "Retry-After": String(Math.ceil(rl.retryAfterMs / 1000)) } });

  const db = createServiceClient();
  const { data: wf } = await db.from("workflows").select("id,name").eq("id", params.id).eq("org_id", auth.orgId).single();
  if (!wf) return NextResponse.json({ error: "Workflow not found." }, { status: 404 });

  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }
  const parsed = bodySchema.safeParse(rawBody);
  if (!parsed.success) return NextResponse.json({ error: 'Request body must include a "message" string.' }, { status: 400 });
  const body = parsed.data;

  const { data: graphNodes } = await db.from("workflow_nodes").select("id,node_type,label,agent_id,config").eq("workflow_id", wf.id);
  const { data: graphEdges } = await db.from("workflow_edges").select("source_node_id,target_node_id,condition").eq("workflow_id", wf.id);
  const nodes: GraphNode[] = graphNodes ?? [];
  const edges: GraphEdge[] = graphEdges ?? [];
  const hasExecutableGraph = nodes.some((n) => n.node_type === "agent") && nodes.some((n) => n.node_type === "start");

  const cost = creditCostFor("ai_message");
  const { data: creditRaw } = await db.rpc("consume_credits", { p_org_id: auth.orgId, p_amount: cost, p_reason: "ai_message" }).single();
  const credit = creditRaw as unknown as CreditCheckResult;
  if (credit && !credit.allowed) return NextResponse.json({ error: `Not enough credits — this costs ${cost}, you're short ${credit.shortfall}.` }, { status: 402 });

  if (hasExecutableGraph) {
    const order = topologicalOrder(nodes, edges);
    if (!order.length) return NextResponse.json({ error: "Workflow graph contains a cycle. Remove the cycle before running it." }, { status: 409 });

    let current = body.message.slice(0, 4000);
    const steps: { node_id: string; label: string; agent_id: string | null; reply: string; sources_used: number; model: string }[] = [];
    for (const node of order) {
      if (node.node_type !== "agent") continue;
      if (!node.agent_id) continue;
      const { data: agentRow } = await db.from("agents").select("id,org_id,config,templates(config)").eq("id", node.agent_id).eq("org_id", auth.orgId).single();
      if (!agentRow) continue;
      const agent = toAgentForChat(agentRow);
      const started = Date.now();
      try {
        const result = await runAgentChat(agent, current, body.company_name ?? "the company", []);
        await recordAgentRun({
          orgId: auth.orgId, agentId: node.agent_id, status: "succeeded",
          input: { message: current, channel: "workflow", workflow_id: wf.id, node_id: node.id },
          output: { reply: result.reply }, trace: [{ step: "workflow_node", node_id: node.id, model: result.model }],
          durationMs: Date.now() - started, tokenUsage: result.tokenUsage, costUsd: 0,
        });
        current = result.reply;
        steps.push({ node_id: node.id, label: node.label, agent_id: node.agent_id, reply: result.reply, sources_used: result.sourcesUsed, model: result.model });
      } catch (e) {
        const message = e instanceof Error ? e.message : "workflow node failed";
        await recordAgentRun({
          orgId: auth.orgId, agentId: node.agent_id, status: "failed",
          input: { message: current, channel: "workflow", workflow_id: wf.id, node_id: node.id },
          error: message, trace: [{ step: "workflow_node", node_id: node.id, status: "failed" }], durationMs: Date.now() - started, costUsd: 0,
        });
        return NextResponse.json({ error: "This workflow is temporarily unavailable." }, { status: 502 });
      }
    }
    if (!steps.length) return NextResponse.json({ error: "Workflow has no executable agent nodes." }, { status: 409 });
    return NextResponse.json({ workflow_id: wf.id, mode: "graph", reply: current, steps });
  }

  // Backward-compatible legacy router for workflows created before the visual graph.
  const { data: members } = await db.from("workflow_members").select("agent_id,keywords,agents(id,name,status,config,templates(config))").eq("workflow_id", wf.id);
  const rows: WorkflowMemberRow[] = members ?? [];
  const ready = rows.filter((m) => firstIfArray(m.agents)?.status === "ready");
  if (!ready.length) return NextResponse.json({ error: "This workflow has no ready specialist agents." }, { status: 409 });

  const specialists: Specialist[] = ready.map((m) => {
    const a = firstIfArray(m.agents)!;
    return { id: a.id, name: a.name, description: memberAgentDescription(a.config), keywords: m.keywords ?? undefined };
  });
  const routed = routeToSpecialist(body.message, specialists);
  const chosen = ready.find((m) => firstIfArray(m.agents)?.id === routed.specialistId)!;
  const chosenAgent = toAgentForChat(chosen.agents);
  if (!chosenAgent) return NextResponse.json({ error: "Selected specialist agent could not be loaded." }, { status: 500 });

  const started = Date.now();
  try {
    const result = await runAgentChat(chosenAgent, body.message, body.company_name ?? "the company");
    await recordAgentRun({
      orgId: auth.orgId, agentId: routed.specialistId, status: "succeeded",
      input: { message: body.message, channel: "workflow_legacy", workflow_id: wf.id },
      output: { reply: result.reply }, trace: [{ step: "specialist_routed", matched_terms: routed.matchedTerms }],
      durationMs: Date.now() - started, tokenUsage: result.tokenUsage, costUsd: 0,
    });
    return NextResponse.json({
      workflow_id: wf.id,
      routed_to: { agent_id: routed.specialistId, agent_name: routed.specialistName, matched_terms: routed.matchedTerms },
      reply: result.reply,
      sources_used: result.sourcesUsed,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "workflow routing failed";
    await recordAgentRun({
      orgId: auth.orgId, agentId: routed.specialistId, status: "failed",
      input: { message: body.message, channel: "workflow_legacy", workflow_id: wf.id },
      error: message, trace: [{ step: "specialist_routed", status: "failed" }], durationMs: Date.now() - started, costUsd: 0,
    });
    return NextResponse.json({ error: "This workflow is temporarily unavailable." }, { status: 502 });
  }
}
