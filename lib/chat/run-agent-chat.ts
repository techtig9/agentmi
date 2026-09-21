import { createServiceClient } from "@/lib/supabase/service";
import { buildSystemPrompt } from "@/lib/chat/prompt";
import { buildAnthropicTool, buildOpenAITool, executeTool, type ToolDefinition } from "@/lib/chat/tool-runtime";
import { resolveSecret } from "@/lib/secrets/resolve";
import { formatMemoryContext, type AgentMemory } from "@/lib/memory/store";
import { estimateCostUsd } from "@/lib/pricing/model-costs";

const TOP_K = 5;
const DEFAULT_MODEL = "llama-3.3-70b-versatile";
const DEFAULT_MAX_TOKENS = 1024;
const MAX_HISTORY_MESSAGES = 20;
const PROVIDER_TIMEOUT_MS = 30_000;
const MAX_TOOL_ROUNDS = 4;

type ProviderName = "groq" | "cerebras" | "openrouter" | "anthropic";

/** Request/response message shape for the OpenAI-compatible chat completions API (Groq, Cerebras, OpenRouter). Content varies by role (string for user/system/tool, an array of content parts or omitted for an echoed assistant message), so it's kept as `unknown` rather than over-specified — this is a wire payload we build and re-serialize, not a value we compute with. */
type OpenAIChatMessage = { role: string; content?: unknown; tool_calls?: unknown; tool_call_id?: string };
type OpenAIToolCall = { id: string; function?: { name?: string; arguments?: string } };
type OpenAICompletionBody = {
  choices?: { message?: { content: unknown; tool_calls?: OpenAIToolCall[] } }[];
  usage?: { prompt_tokens?: number; completion_tokens?: number; input_tokens?: number; output_tokens?: number };
};

/** Anthropic messages API shapes. `content` on a message can be a plain string (our own turns) or the content-block array Anthropic returns for an assistant turn, so — same reasoning as above — it stays `unknown` at the message level while the individual content blocks below are properly typed. */
type AnthropicMessage = { role: string; content: unknown };
type AnthropicContentBlock =
  | { type: "text"; text: string }
  | { type: "tool_use"; id: string; name: string; input: unknown }
  | { type: string; [key: string]: unknown };

type ProviderConfig = {
  name: ProviderName;
  apiKey?: string;
  baseUrl: string;
  model: string;
};

export interface AgentForChat {
  id: string;
  org_id?: string;
  config: unknown;
  templates: { config: { system_prompt_template: string; escalation_enabled: boolean } } | null;
}

/**
 * Normalizes a raw `agents` row selected with `templates(config)` into AgentForChat.
 *
 * Why this exists: `agents.template_id` is the foreign key (agent -> template),
 * which makes this a to-one relation at the database level, and PostgREST returns
 * a single object for it at runtime. But this project has no generated Supabase
 * `Database` type passed to the client, so the untyped `.select()` overload
 * infers embedded relations as arrays by default. Rather than casting the whole
 * row to `any` (which silently defeats type-checking everywhere it's used), this
 * normalizes just the one field whose static and runtime shapes disagree, and
 * validates the nested template config so a malformed/legacy row degrades to
 * `templates: null` instead of crashing the chat request.
 */
type RawAgentRow = {
  id: string;
  org_id?: string;
  config: unknown;
  templates: { config: unknown } | { config: unknown }[] | null;
};

function firstIfArray<T>(value: T | T[] | null | undefined): T | undefined {
  return Array.isArray(value) ? value[0] : value ?? undefined;
}

/** Overload: callers that already know they have a single row (typical `.single()` selects) get a non-nullable result back so they don't need a redundant null check. */
export function toAgentForChat(row: RawAgentRow): AgentForChat;
/** Overload: callers pulling the agent out of a nested embed (which the untyped client may wrap in an array either at this level or not) get `null` back if nothing was found. */
export function toAgentForChat(row: RawAgentRow | RawAgentRow[] | null | undefined): AgentForChat | null;
export function toAgentForChat(input: RawAgentRow | RawAgentRow[] | null | undefined): AgentForChat | null {
  const row = firstIfArray(input);
  if (!row) return null;

  const rawTemplate = firstIfArray(row.templates);
  const config = rawTemplate?.config;
  const isValidTemplateConfig =
    config !== null &&
    typeof config === "object" &&
    typeof (config as Record<string, unknown>).system_prompt_template === "string" &&
    typeof (config as Record<string, unknown>).escalation_enabled === "boolean";

  return {
    id: row.id,
    org_id: row.org_id,
    config: row.config,
    templates: isValidTemplateConfig
      ? { config: config as { system_prompt_template: string; escalation_enabled: boolean } }
      : null,
  };
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface AgentChatResult {
  reply: string;
  sourcesUsed: number;
  model: string;
  tokenUsage: { input_tokens: number; output_tokens: number };
  /** Estimated provider cost in USD, or null when the model has no rate. */
  costUsd: number | null;
  toolCalls: { name: string; toolId: string; input: unknown; output?: unknown; error?: string }[];
  memoryUsed: number;
}

export function agentConfig(config: unknown): Record<string, unknown> {
  return config && typeof config === "object" && !Array.isArray(config)
    ? (config as Record<string, unknown>)
    : {};
}

function boundedInteger(value: unknown, fallback: number, min: number, max: number): number {
  const n = typeof value === "number" && Number.isFinite(value) ? Math.floor(value) : fallback;
  return Math.min(max, Math.max(min, n));
}

async function fetchWithTimeout(url: string, init: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), PROVIDER_TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("AI provider timed out. Please retry or check the provider status.");
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

async function embedQuery(text: string): Promise<number[]> {
  const apiKey = process.env.VOYAGE_API_KEY;
  if (!apiKey) throw new Error("Knowledge retrieval is not configured: VOYAGE_API_KEY is missing.");
  const response = await fetchWithTimeout("https://api.voyageai.com/v1/embeddings", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ input: [text], model: process.env.VOYAGE_EMBEDDING_MODEL ?? "voyage-2" }),
  });
  if (!response.ok) throw new Error(`Voyage embeddings failed: ${response.status}`);
  const body: { data?: { embedding?: number[] }[] } = await response.json();
  const embedding = body.data?.[0]?.embedding;
  if (!embedding?.length) throw new Error("Voyage returned an empty embedding.");
  return embedding;
}

function providerConfigs(preferredModel?: string): ProviderConfig[] {
  const modelOverride = preferredModel?.trim();
  const anthropicEnabled = process.env.ANTHROPIC_ENABLED === "true";
  return [
    {
      name: "groq",
      apiKey: process.env.GROQ_API_KEY,
      baseUrl: "https://api.groq.com/openai/v1/chat/completions",
      model: process.env.GROQ_MODEL || (modelOverride?.includes("llama") ? modelOverride : DEFAULT_MODEL),
    },
    {
      name: "cerebras",
      apiKey: process.env.CEREBRAS_API_KEY,
      baseUrl: "https://api.cerebras.ai/v1/chat/completions",
      model: process.env.CEREBRAS_MODEL || (modelOverride?.includes("llama") ? modelOverride : "llama-3.3-70b"),
    },
    {
      name: "openrouter",
      apiKey: process.env.OPENROUTER_API_KEY,
      baseUrl: "https://openrouter.ai/api/v1/chat/completions",
      model: process.env.OPENROUTER_MODEL || "openai/gpt-oss-120b:free",
    },
    {
      name: "anthropic",
      apiKey: anthropicEnabled ? process.env.ANTHROPIC_API_KEY : undefined,
      baseUrl: "https://api.anthropic.com/v1/messages",
      model: modelOverride?.startsWith("claude-") ? modelOverride : process.env.ANTHROPIC_MODEL || "claude-sonnet-4-6",
    },
  ];
}

function isComplexTask(message: string, history: ChatMessage[], maxTokens: number): boolean {
  if (process.env.AI_FORCE_ANTHROPIC === "true" && process.env.ANTHROPIC_ENABLED === "true" && process.env.ANTHROPIC_API_KEY) return true;
  const normalized = message.toLowerCase();
  const complexSignals = [
    "analyze", "analysis", "architecture", "debug", "refactor", "compare", "research",
    "strategy", "reason", "step by step", "large document", "long document", "complex",
    "deep dive", "write a full", "design a system", "review this code", "solve this",
  ];
  const signal = complexSignals.some((word) => normalized.includes(word));
  const longInput = message.length >= Number(process.env.AI_COMPLEXITY_CHARS || 5000);
  const longHistory = history.length >= 12;
  const largeOutput = maxTokens >= 3000;
  return signal || longInput || longHistory || largeOutput;
}

function quotaOrTemporaryFailure(status: number): boolean {
  return status === 402 || status === 408 || status === 409 || status === 425 || status === 429 || status === 500 || status === 502 || status === 503 || status === 504;
}

function openAIHeaders(provider: ProviderConfig): Record<string, string> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${provider.apiKey}`,
    "Content-Type": "application/json",
  };
  if (provider.name === "openrouter") {
    if (process.env.OPENROUTER_SITE_URL) headers["HTTP-Referer"] = process.env.OPENROUTER_SITE_URL;
    if (process.env.OPENROUTER_APP_NAME) headers["X-Title"] = process.env.OPENROUTER_APP_NAME;
  }
  return headers;
}

function normalizeOpenAIContent(content: unknown): string {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content.map((part) => typeof part === "string" ? part : typeof part?.text === "string" ? part.text : "").join("\n").trim();
  }
  return "";
}

async function callOpenAICompatibleProvider(
  provider: ProviderConfig,
  systemPrompt: string,
  history: ChatMessage[],
  maxTokens: number,
  tools: ToolDefinition[],
): Promise<{ text: string; tokenUsage: { input_tokens: number; output_tokens: number }; toolCalls: AgentChatResult["toolCalls"] }> {
  if (!provider.apiKey) throw new Error(`${provider.name} is not configured.`);
  const messages: OpenAIChatMessage[] = [
    { role: "system", content: systemPrompt },
    ...history.map((m) => ({ role: m.role, content: m.content })),
  ];
  const toolCalls: AgentChatResult["toolCalls"] = [];
  let totalInput = 0;
  let totalOutput = 0;

  for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
    const response = await fetchWithTimeout(provider.baseUrl, {
      method: "POST",
      headers: openAIHeaders(provider),
      body: JSON.stringify({
        model: provider.model,
        max_tokens: maxTokens,
        messages,
        ...(tools.length ? { tools: tools.map(buildOpenAITool), tool_choice: "auto" } : {}),
      }),
    });
    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      const error = new Error(`${provider.name} API failed: ${response.status}${detail ? ` — ${detail.slice(0, 240)}` : ""}`) as Error & { provider?: ProviderName; retryable?: boolean };
      error.provider = provider.name;
      error.retryable = quotaOrTemporaryFailure(response.status);
      throw error;
    }
    const body: OpenAICompletionBody = await response.json();
    const usage = body.usage ?? {};
    totalInput += usage.prompt_tokens ?? usage.input_tokens ?? 0;
    totalOutput += usage.completion_tokens ?? usage.output_tokens ?? 0;
    const choice = body.choices?.[0];
    const message = choice?.message;
    if (!message) throw new Error(`${provider.name} returned an empty response.`);

    const calls = Array.isArray(message.tool_calls) ? message.tool_calls : [];
    if (!calls.length) {
      const text = normalizeOpenAIContent(message.content);
      if (!text) throw new Error(`${provider.name} returned no text content.`);
      return { text, tokenUsage: { input_tokens: totalInput, output_tokens: totalOutput }, toolCalls };
    }

    messages.push({ role: "assistant", ...message });
    const results: OpenAIChatMessage[] = [];
    for (const call of calls.slice(0, 4)) {
      const functionName = call?.function?.name ?? "";
      const tool = tools.find((t) => `agentmi_${t.id.replace(/-/g, "_")}` === functionName);
      let input: unknown = {};
      try { input = JSON.parse(call?.function?.arguments || "{}"); } catch { input = {}; }
      if (!tool) {
        const errorMessage = "Tool is not authorized for this agent.";
        results.push({ role: "tool", tool_call_id: call.id, content: errorMessage });
        toolCalls.push({ name: functionName, toolId: "unknown", input, error: errorMessage });
        continue;
      }
      try {
        const output = await executeTool(tool, input);
        results.push({ role: "tool", tool_call_id: call.id, content: JSON.stringify(output).slice(0, 20_000) });
        toolCalls.push({ name: tool.name, toolId: tool.id, input, output });
      } catch (error) {
        const messageText = error instanceof Error ? error.message : "Tool execution failed.";
        results.push({ role: "tool", tool_call_id: call.id, content: messageText });
        toolCalls.push({ name: tool.name, toolId: tool.id, input, error: messageText });
      }
    }
    messages.push(...results);
  }
  throw new Error(`${provider.name} exceeded the maximum tool execution rounds.`);
}

async function callAnthropic(
  provider: ProviderConfig,
  systemPrompt: string,
  history: ChatMessage[],
  maxTokens: number,
  tools: ToolDefinition[]
): Promise<{ text: string; tokenUsage: { input_tokens: number; output_tokens: number }; toolCalls: AgentChatResult["toolCalls"] }> {
  if (!provider.apiKey) throw new Error("Anthropic is not configured.");
  const messages: AnthropicMessage[] = history.map((m) => ({ role: m.role, content: m.content }));
  const toolCalls: AgentChatResult["toolCalls"] = [];
  let totalInput = 0, totalOutput = 0;

  for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
    const response = await fetchWithTimeout(provider.baseUrl, {
      method: "POST",
      headers: { "x-api-key": provider.apiKey, "anthropic-version": "2023-06-01", "Content-Type": "application/json" },
      body: JSON.stringify({ model: provider.model, max_tokens: maxTokens, system: systemPrompt, messages, ...(tools.length ? { tools: tools.map(buildAnthropicTool) } : {}) }),
    });
    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      const error = new Error(`Anthropic API failed: ${response.status}${detail ? ` — ${detail.slice(0, 240)}` : ""}`) as Error & { provider?: ProviderName; retryable?: boolean };
      error.provider = "anthropic";
      error.retryable = quotaOrTemporaryFailure(response.status);
      throw error;
    }
    const body: { stop_reason?: string; content?: AnthropicContentBlock[]; usage?: { input_tokens?: number; output_tokens?: number } } = await response.json();
    totalInput += body.usage?.input_tokens ?? 0;
    totalOutput += body.usage?.output_tokens ?? 0;
    const content = Array.isArray(body.content) ? body.content : [];
    const calls = content.filter((b): b is Extract<AnthropicContentBlock, { type: "tool_use" }> => b?.type === "tool_use");
    if (!calls.length) {
      const text = content
        .filter((b): b is Extract<AnthropicContentBlock, { type: "text" }> => b?.type === "text")
        .map((b) => b.text)
        .join("\n")
        .trim();
      if (!text) throw new Error("Anthropic returned no text content.");
      return { text, tokenUsage: { input_tokens: totalInput, output_tokens: totalOutput }, toolCalls };
    }
    messages.push({ role: "assistant", content });
    const results = [];
    for (const call of calls.slice(0, 4)) {
      const tool = tools.find((t) => `agentmi_${t.id.replace(/-/g, "_")}` === call.name);
      if (!tool) {
        results.push({ type: "tool_result", tool_use_id: call.id, is_error: true, content: "Tool is not authorized for this agent." });
        toolCalls.push({ name: call.name, toolId: "unknown", input: call.input, error: "Tool is not authorized for this agent." });
        continue;
      }
      try {
        const output = await executeTool(tool, call.input);
        results.push({ type: "tool_result", tool_use_id: call.id, content: JSON.stringify(output).slice(0, 20_000) });
        toolCalls.push({ name: tool.name, toolId: tool.id, input: call.input, output });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Tool execution failed.";
        results.push({ type: "tool_result", tool_use_id: call.id, is_error: true, content: message });
        toolCalls.push({ name: tool.name, toolId: tool.id, input: call.input, error: message });
      }
    }
    messages.push({ role: "user", content: results });
  }
  throw new Error("Anthropic exceeded the maximum tool execution rounds.");
}

async function callWithFallback(
  systemPrompt: string,
  history: ChatMessage[],
  maxTokens: number,
  tools: ToolDefinition[],
  preferredModel: string | undefined,
  complexTask: boolean,
): Promise<{ text: string; tokenUsage: { input_tokens: number; output_tokens: number }; toolCalls: AgentChatResult["toolCalls"]; provider: ProviderName; model: string }> {
  const all = providerConfigs(preferredModel);
  const anthropic = all.find((p) => p.name === "anthropic");
  const cheap = all.filter((p) => p.name !== "anthropic");
  const ordered = complexTask && anthropic?.apiKey ? [anthropic, ...cheap] : cheap;
  const configured = ordered.filter((p) => Boolean(p.apiKey));
  if (!configured.length) throw new Error("No AI provider is configured. Add GROQ_API_KEY, CEREBRAS_API_KEY, or OPENROUTER_API_KEY to .env.local.");

  const failures: string[] = [];
  for (const provider of configured) {
    try {
      const result = provider.name === "anthropic"
        ? await callAnthropic(provider, systemPrompt, history, maxTokens, tools)
        : await callOpenAICompatibleProvider(provider, systemPrompt, history, maxTokens, tools);
      return { ...result, provider: provider.name, model: provider.model };
    } catch (error) {
      const e = error as Error & { retryable?: boolean };
      failures.push(`${provider.name}: ${e.message}`);
      if (!e.retryable) {
        // A provider can be unavailable because of a bad request/model. Do not
        // hide it, but continue to the next configured provider for resilience.
        continue;
      }
    }
  }
  throw new Error(`All configured AI providers failed. ${failures.join(" | ")}`);
}

/**
 * Production Agentmi runtime for one conversational turn.
 * Provider routing is intentionally cost-first: Groq -> Cerebras -> OpenRouter.
 * Complex/large tasks prefer optional Anthropic when its key is connected.
 * Voyage is used only for optional RAG embeddings, never as a chat model.
 */
export async function runAgentChat(
  agent: AgentForChat,
  message: string,
  companyName: string,
  history: ChatMessage[] = []
): Promise<AgentChatResult> {
  const config = agentConfig(agent.config);
  const supabase = createServiceClient();

  let retrieved: { id: string; text: string; score: number }[] = [];
  try {
    const { count: knowledgeCount } = await supabase
      .from("knowledge_chunks")
      .select("id", { count: "exact", head: true })
      .eq("org_id", agent.org_id ?? "")
      .eq("agent_id", agent.id);
    if ((knowledgeCount ?? 0) > 0) {
      if (process.env.VOYAGE_ENABLED === "false" || !process.env.VOYAGE_API_KEY) {
        console.warn("Voyage is not configured; continuing without RAG retrieval.");
      } else {
        const queryVector = await embedQuery(message);
        const { data: matches, error: matchError } = await supabase.rpc("match_knowledge_chunks", {
          p_org_id: agent.org_id ?? "",
          p_agent_id: agent.id,
          p_query_embedding: queryVector,
          p_match_count: TOP_K,
          p_min_similarity: 0.20,
        });
        if (matchError) throw new Error(`Knowledge retrieval failed: ${matchError.message}`);
        retrieved = (matches ?? []).map((r: { id: string; content: string; similarity: number }) => ({ id: r.id, text: r.content, score: r.similarity }));
      }
    }
  } catch (error) {
    console.error("retrieval failed:", error instanceof Error ? error.message : error);
  }

  const template = agent.templates?.config.system_prompt_template ?? "You are a helpful assistant for {{company_name}}.";
  const customPrompt = typeof config.system_prompt === "string"
    ? config.system_prompt
    : typeof config.prompt === "string"
      ? config.prompt
      : template;

  const systemPrompt = buildSystemPrompt(customPrompt, {
    companyName,
    retrievedChunks: retrieved,
    escalationEnabled: agent.templates?.config.escalation_enabled ?? false,
  });

  const memoryContext = formatMemoryContext((config.__memory_context as AgentMemory[] | undefined) ?? []);
  const finalSystemPrompt = `${systemPrompt}\n\n${memoryContext}`;

  const configuredModel = typeof config.model === "string" && config.model.trim() ? config.model.trim() : undefined;
  const configuredToolIds = Array.isArray(config.tools) ? config.tools.filter((v): v is string => typeof v === "string").slice(0, 12) : [];
  let tools: ToolDefinition[] = [];
  if (configuredToolIds.length) {
    const { data: toolRows } = await supabase.from("agent_tools").select("id,name,description,kind,config,is_active").in("id", configuredToolIds).eq("org_id", agent.org_id ?? "");
    const rows: { id: string; name: string; description: string | null; kind: string; config: unknown; is_active: boolean }[] = toolRows ?? [];
    tools = await Promise.all(
      rows.filter((t) => t.is_active).map(async (t) => {
        const toolConfig = (t.config ?? {}) as Record<string, unknown>;
        const secretId = typeof toolConfig.secret_id === "string" ? toolConfig.secret_id : undefined;
        const resolved = secretId ? await resolveSecret(supabase, agent.org_id ?? "", secretId) : null;
        return { id: t.id, name: t.name, description: t.description ?? "", kind: t.kind, config: toolConfig, authHeaderValue: resolved?.value };
      })
    );
  }
  const maxTokens = boundedInteger(config.max_tokens, DEFAULT_MAX_TOKENS, 128, 4096);
  const safeHistory = history
    .filter((m) => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
    .map((m) => ({ role: m.role, content: m.content.slice(0, 4000) }))
    .slice(-MAX_HISTORY_MESSAGES);

  const result = await callWithFallback(
    finalSystemPrompt,
    [...safeHistory, { role: "user", content: message.slice(0, 4000) }],
    maxTokens,
    tools,
    configuredModel,
    isComplexTask(message, safeHistory, maxTokens),
  );

  return {
    reply: result.text,
    sourcesUsed: retrieved.length,
    model: `${result.provider}:${result.model}`,
    tokenUsage: result.tokenUsage,
    // null, not 0, when the model has no configured rate — see
    // lib/pricing/model-costs.ts. Callers persist it as-is.
    costUsd: estimateCostUsd(result.provider, result.model, result.tokenUsage),
    toolCalls: result.toolCalls,
    memoryUsed: Array.isArray(config.__memory_context) ? config.__memory_context.length : 0,
  };
}

export const __runtimeTestables = {
  boundedInteger,
  agentConfig,
  isComplexTask,
  quotaOrTemporaryFailure,
  providerConfigs,
  MAX_HISTORY_MESSAGES,
};
