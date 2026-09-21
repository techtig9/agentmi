import { createServiceClient } from "@/lib/supabase/service";

export async function recordAgentRun(input: {
  orgId: string;
  agentId: string;
  deploymentId?: string;
  status: "running" | "succeeded" | "failed";
  input: unknown;
  output?: unknown;
  trace?: unknown[];
  durationMs?: number;
  tokenUsage?: Record<string, unknown>;
  /** null when the model has no configured rate — distinct from 'cost was zero'. */
  costUsd?: number | null;
  error?: string;
}) {
  const supabase = createServiceClient();
  const { data, error } = await supabase.from("agent_runs").insert({
    org_id: input.orgId,
    agent_id: input.agentId,
    deployment_id: input.deploymentId ?? null,
    status: input.status,
    input: input.input ?? {},
    output: input.output ?? null,
    trace: input.trace ?? [],
    duration_ms: input.durationMs ?? null,
    token_usage: input.tokenUsage ?? {},
    // null, not 0: 'not priced' and 'free' are different facts and a cost
    // report that collapses them is wrong rather than merely imprecise.
    cost_usd: input.costUsd ?? null,
    error: input.error ?? null,
  }).select("id").single();
  if (error) console.error("agent run recording failed", error.message);
  return data?.id ?? null;
}
