/**
 * Provider cost estimation.
 *
 * `agent_runs.cost_usd` existed and the run detail page displayed it, but
 * every caller wrote a literal 0 — so every run in the product reported
 * "$0.0000" regardless of how many tokens it burned. Token usage was already
 * being captured from every provider; only the conversion was missing.
 *
 * Two rules make this honest:
 *
 *  1. An unpriced model returns `null`, not 0. "We did not record a price" and
 *     "this was free" are different facts, and collapsing them is how a cost
 *     dashboard ends up lying. Callers render null as "—".
 *  2. Rates live in one table with their unit stated, so updating them when a
 *     provider changes pricing is a single edit rather than a hunt.
 *
 * Rates are USD per 1,000,000 tokens and are ESTIMATES for internal cost
 * reporting — they are not what the customer is billed. Customers are billed
 * in credits (see lib/pricing/costs.ts). Review them when provider pricing
 * changes; `docs/UNIT_ECONOMICS.md` explains how they feed margin.
 */

export interface TokenUsage {
  input_tokens?: number;
  output_tokens?: number;
}

export interface ModelRate {
  /** USD per 1M input tokens. */
  inputPerMillion: number;
  /** USD per 1M output tokens. */
  outputPerMillion: number;
}

/** Keyed by `provider:model`, lowercased. */
export const MODEL_RATES: Record<string, ModelRate> = {
  "groq:llama-3.3-70b-versatile": { inputPerMillion: 0.59, outputPerMillion: 0.79 },
  "groq:llama-3.1-8b-instant": { inputPerMillion: 0.05, outputPerMillion: 0.08 },
  "cerebras:llama-3.3-70b": { inputPerMillion: 0.85, outputPerMillion: 1.2 },
  "cerebras:llama3.1-8b": { inputPerMillion: 0.1, outputPerMillion: 0.1 },
  "openrouter:openai/gpt-4o-mini": { inputPerMillion: 0.15, outputPerMillion: 0.6 },
  "openrouter:openai/gpt-4o": { inputPerMillion: 2.5, outputPerMillion: 10 },
};

export function rateKey(provider: string, model: string): string {
  return `${provider}:${model}`.toLowerCase();
}

/**
 * Estimated USD for one model call, or null when the model has no rate.
 *
 * Returns 0 only when the model IS priced and genuinely used no tokens.
 */
export function estimateCostUsd(
  provider: string | null | undefined,
  model: string | null | undefined,
  usage: TokenUsage | null | undefined
): number | null {
  if (!provider || !model) return null;
  const rate = MODEL_RATES[rateKey(provider, model)];
  if (!rate) return null;

  const input = Math.max(0, usage?.input_tokens ?? 0);
  const output = Math.max(0, usage?.output_tokens ?? 0);

  const cost = (input / 1_000_000) * rate.inputPerMillion + (output / 1_000_000) * rate.outputPerMillion;
  // Six decimal places matches the numeric(12,6) column.
  return Math.round(cost * 1_000_000) / 1_000_000;
}

/** "$0.0042" / "<$0.0001" / "—" for an unknown cost. */
export function formatCostUsd(cost: number | null | undefined): string {
  if (cost === null || cost === undefined) return "—";
  if (cost === 0) return "$0.0000";
  if (cost < 0.0001) return "<$0.0001";
  return `$${cost.toFixed(4)}`;
}

/** Sums costs, ignoring unknowns, and reports how many were unknown. */
export function totalCostUsd(costs: Array<number | null | undefined>): {
  total: number;
  priced: number;
  unpriced: number;
} {
  let total = 0;
  let priced = 0;
  let unpriced = 0;
  for (const cost of costs) {
    if (typeof cost === "number" && Number.isFinite(cost)) {
      total += cost;
      priced += 1;
    } else {
      unpriced += 1;
    }
  }
  return { total: Math.round(total * 1_000_000) / 1_000_000, priced, unpriced };
}
