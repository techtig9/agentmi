export type ToolDefinition = {
  id: string;
  name: string;
  description: string;
  kind: string;
  config: Record<string, unknown>;
  /**
   * A credential resolved from the tool's configured secret (see
   * lib/secrets/resolve.ts), if any. Never sourced from `config` itself —
   * config is arbitrary JSON a user can edit, so an Authorization value
   * placed there would mean storing a real credential in plaintext.
   * Resolving it separately, from the org-scoped secrets vault, is what
   * makes the vault an actual consumer instead of a set of unused rows.
   */
  authHeaderValue?: string;
};

export function isSafeHttpUrl(raw: string): boolean {
  try {
    const url = new URL(raw);
    if (url.protocol !== "https:" && url.protocol !== "http:") return false;
    const host = url.hostname.toLowerCase();
    if (host === "localhost" || host.endsWith(".localhost") || host === "::1") return false;
    if (/^127\./.test(host) || /^10\./.test(host) || /^192\.168\./.test(host) || /^169\.254\./.test(host)) return false;
    const m = host.match(/^172\.(\d+)\./);
    if (m && Number(m[1]) >= 16 && Number(m[1]) <= 31) return false;
    if (host === "0.0.0.0" || host === "::") return false;
    return true;
  } catch { return false; }
}

export function normalizeToolInput(input: unknown): Record<string, unknown> {
  return input && typeof input === "object" && !Array.isArray(input) ? input as Record<string, unknown> : {};
}

export function buildOpenAITool(tool: ToolDefinition) {
  const params = tool.config.parameters;
  const parameters = params && typeof params === "object" && !Array.isArray(params)
    ? params
    : { type: "object", properties: {}, additionalProperties: true };
  return {
    type: "function",
    function: {
      name: `agentmi_${tool.id.replace(/-/g, "_")}`,
      description: tool.description || `Execute ${tool.name}`,
      parameters,
    },
  };
}

export function buildAnthropicTool(tool: ToolDefinition) {
  const params = tool.config.parameters;
  const input_schema = params && typeof params === "object" && !Array.isArray(params)
    ? params
    : { type: "object", properties: {}, additionalProperties: true };
  return {
    name: `agentmi_${tool.id.replace(/-/g, "_")}`,
    description: tool.description || `Execute ${tool.name}`,
    input_schema,
  };
}

async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs = 15_000): Promise<Response> {
  if (!isSafeHttpUrl(url)) throw new Error("Tool endpoint is not an allowed public HTTP(S) URL.");
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal, redirect: "manual" });
  } finally { clearTimeout(timer); }
}

export async function executeHttpTool(tool: ToolDefinition, input: unknown): Promise<unknown> {
  const config = tool.config;
  const endpoint = typeof config.endpoint === "string" ? config.endpoint : "";
  if (!endpoint || !isSafeHttpUrl(endpoint)) throw new Error("Tool endpoint must be a valid public HTTP(S) URL.");
  const method = typeof config.method === "string" ? config.method.toUpperCase() : "GET";
  if (!["GET", "POST", "PUT", "PATCH", "DELETE"].includes(method)) throw new Error("Unsupported HTTP method.");
  const values = normalizeToolInput(input);
  const url = new URL(endpoint);
  const headers: Record<string, string> = { "Content-Type": "application/json", "Accept": "application/json, text/plain;q=0.9, */*;q=0.8" };
  if (config.headers && typeof config.headers === "object" && !Array.isArray(config.headers)) {
    for (const [k, v] of Object.entries(config.headers as Record<string, unknown>)) {
      if (typeof v === "string" && !/^authorization$/i.test(k)) headers[k] = v.slice(0, 1000);
    }
  }
  if (tool.authHeaderValue) headers.Authorization = `Bearer ${tool.authHeaderValue}`;
  let body: string | undefined;
  if (method === "GET" || method === "DELETE") {
    for (const [k, v] of Object.entries(values)) if (v !== undefined && v !== null) url.searchParams.set(k, String(v));
  } else body = JSON.stringify(values);
  const response = await fetchWithTimeout(url.toString(), { method, headers, body });
  if (response.status >= 300 && response.status < 400) throw new Error("Redirects are disabled for tool requests.");
  const text = await response.text();
  if (!response.ok) throw new Error(`Tool request failed: ${response.status} ${text.slice(0, 300)}`);
  const type = response.headers.get("content-type") || "";
  if (type.includes("application/json")) {
    try { return JSON.parse(text); } catch { return text.slice(0, 20_000); }
  }
  return text.slice(0, 20_000);
}

/**
 * The only tool kinds `executeTool` can actually run.
 *
 * Exported so the creation form and its server-side schema cannot drift out of
 * step with the runtime — offering a kind here that throws below is how you end
 * up with tools that are configurable but permanently broken.
 */
export const EXECUTABLE_TOOL_KINDS = ["http", "custom"] as const;
export type ExecutableToolKind = (typeof EXECUTABLE_TOOL_KINDS)[number];

export function isExecutableToolKind(kind: string): kind is ExecutableToolKind {
  return (EXECUTABLE_TOOL_KINDS as readonly string[]).includes(kind);
}

export async function executeTool(tool: ToolDefinition, input: unknown): Promise<unknown> {
  if (!isExecutableToolKind(tool.kind)) {
    throw new Error(
      `Tool kind '${tool.kind}' cannot be executed. Only ${EXECUTABLE_TOOL_KINDS.join(" and ")} tools run today.`
    );
  }
  return executeHttpTool(tool, input);
}

export const __toolRuntimeTestables = { isSafeHttpUrl, normalizeToolInput, buildAnthropicTool, buildOpenAITool };
