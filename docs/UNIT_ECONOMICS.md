# Unit economics

Worst-case gross margin per plan, computed from the same configuration the
product bills and prices against:

- credit allowances — `lib/pricing/plans.ts`
- credit cost per action — `lib/pricing/costs.ts`
- provider rates — `lib/pricing/model-costs.ts`

Regenerate after changing any of those:

```bash
npx tsx scripts/unit-economics.ts
```

## Method

"Worst case" is an account that spends its entire monthly allowance on the
cheapest action per credit. For Agentmi that is `ai_message` at 2 credits, so
the allowance converts to the largest possible number of model calls. Any other
mix costs us less. Averaging typical usage would hide the scenario that
actually breaks margin, which is the one worth reporting.

**Assumption:** a grounded chat turn is ~2,500 input tokens (system prompt plus
retrieved knowledge) and ~500 output tokens. Change `DEFAULT_ASSUMPTIONS` in
`lib/pricing/unit-economics.ts` and every figure below moves with it.

These are provider costs only. They exclude hosting, Supabase, Voyage
embeddings and Paddle's fee.

## On the default provider (Groq, llama-3.3-70b-versatile)

| Plan | Price/mo | Credits | Max messages | Provider cost | Gross margin | Margin % |
|---|---|---|---|---|---|---|
| Free | $0 | 500 | 250 | $0.47 | −$0.47 | n/a |
| Starter | $15 | 6,000 | 3,000 | $5.61 | $9.39 | **63%** |
| Pro | $39 | 20,000 | 10,000 | $18.70 | $20.30 | **52%** |
| Business | $69 | 60,000 | 30,000 | $56.10 | $12.90 | **19%** |

Free-plan acquisition cost is **$0.47 per fully-consuming signup**.

## The finding that matters: the fallback chain inverts margin

The runtime tries Groq → Cerebras → OpenRouter, falling through on quota or
capacity errors. **Cerebras is more expensive than Groq**, so the fallback that
protects availability also erodes margin — and on Business it goes negative:

| Model actually serving | Starter | Pro | Business |
|---|---|---|---|
| groq / llama-3.3-70b-versatile *(default)* | 63% | 52% | **19%** |
| groq / llama-3.1-8b-instant | 97% | 96% | 93% |
| cerebras / llama-3.3-70b | 46% | 30% | **−18%** ⚠️ |
| cerebras / llama3.1-8b | 94% | 92% | 87% |
| openrouter / gpt-4o-mini | 87% | 83% | 71% |
| openrouter / gpt-4o | **−125%** ⚠️ | **−188%** ⚠️ | **−389%** ⚠️ |

**A sustained Groq outage turns the Business plan loss-making without anything
in the product signalling it.** Nobody chose that; it is an emergent property
of pairing a cost-ordered fallback chain with a flat credit price.

## Recommended actions

1. **Do not set `OPENROUTER_MODEL` to a frontier model.** At gpt-4o rates every
   paid plan is deeply negative. The configured default, `gpt-4o-mini`, is
   safe. This is a one-line environment variable away from being very
   expensive, so it belongs in a deployment review.
2. **Watch the Business plan.** 19% worst-case margin on the default provider
   leaves no room; it is the plan to reprice or re-scope first. Either raise
   the price, cut the allowance from 60,000, or raise `ai_message` above
   2 credits for that tier.
3. **Make credit cost track the model.** `ai_message` costs 2 credits whoever
   serves it, so an expensive fallback is invisible to billing. Scaling the
   charge by the serving provider's rate would make margin provider-independent.
4. **Alert on provider mix.** Observability already records the provider for
   every run. A sustained shift away from the cheapest provider is a margin
   event and should be treated as one.

## What is not modelled

- Real usage distribution. Most accounts do not consume their full allowance,
  so realised margin will be better than the worst case above.
- Fixed costs: hosting, Supabase, Voyage embeddings, Paddle's fee.
- ML agent training, which runs on the separate training service and is priced
  at 400 credits per build.
