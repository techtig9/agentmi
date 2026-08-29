# Agentmi AI Provider Routing

Agentmi uses a cost-first provider chain so optional premium services are not required for a new deployment.

## Default chat order

1. **Groq** — first choice for normal tasks.
2. **Cerebras** — used when Groq is unavailable, rate-limited, quota-limited, or temporarily failing.
3. **OpenRouter** — final normal-task fallback.
4. **Anthropic** — optional premium provider; for complex/large tasks it is preferred when `ANTHROPIC_ENABLED=true` and a key is configured. If Anthropic is unavailable, the runtime falls back to Groq → Cerebras → OpenRouter.

A provider is skipped when its API key is missing. Quota/rate-limit/temporary-capacity responses such as HTTP 429/503 trigger fallback.

## Complex-task routing

The runtime considers a task complex when it contains common deep-reasoning signals, is longer than `AI_COMPLEXITY_CHARS`, has long conversation history, or requests a large output. `AI_FORCE_ANTHROPIC=true` can force Anthropic for testing, but only when Anthropic is enabled and configured.

## Voyage AI

Voyage is **not a chat model**. Agentmi uses it only for embeddings for Knowledge/RAG. It is optional:

- `VOYAGE_ENABLED=false` → no Voyage calls; chat continues normally without RAG retrieval.
- `VOYAGE_ENABLED=true` + `VOYAGE_API_KEY` → Knowledge/RAG indexing and retrieval are enabled.

## Recommended local `.env.local`

```text
GROQ_API_KEY=your_groq_key
CEREBRAS_API_KEY=your_cerebras_key
OPENROUTER_API_KEY=your_openrouter_key

ANTHROPIC_ENABLED=false
ANTHROPIC_API_KEY=

VOYAGE_ENABLED=false
VOYAGE_API_KEY=
```

When you later subscribe/connect premium services, set the Anthropic/Voyage variables without changing application code. For a paid-plan gate, keep the provider keys server-side and enable Anthropic/Voyage only for the plans that include those capabilities.
