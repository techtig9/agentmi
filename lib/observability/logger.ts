/**
 * Structured logging.
 *
 * One JSON object per line, so a log drain can filter on fields instead of
 * matching substrings. Every entry carries a request id, which is what makes
 * a user's report ("it failed around 14:30") resolvable to a single request
 * and the chain of work it triggered.
 *
 * Nothing here sends data anywhere. It writes to stdout/stderr, which is what
 * Vercel, Docker and systemd all collect already — adding a vendor SDK would
 * mean adding a dependency, a key and an egress path for no gain.
 */

export type LogLevel = "debug" | "info" | "warn" | "error";

export interface LogFields {
  [key: string]: unknown;
}

/**
 * Keys whose values are never written, at any nesting depth.
 *
 * A logger is one of the easiest ways to leak a secret: someone logs a whole
 * request body or config object for debugging and a token ends up in a
 * retained log store. Redaction is applied centrally so no call site has to
 * remember.
 */
const REDACTED_KEYS = [
  "password",
  "token",
  "secret",
  "apikey",
  "api_key",
  "authorization",
  "cookie",
  "key",
  "credential",
  "service_role",
];

const REDACTED = "[redacted]";

function shouldRedact(key: string): boolean {
  const normalised = key.toLowerCase().replace(/[-_\s]/g, "");
  return REDACTED_KEYS.some((needle) => normalised.includes(needle.replace(/[-_]/g, "")));
}

/** Depth-limited so a cyclic or enormous object cannot stall a request. */
export function redact(value: unknown, depth = 0): unknown {
  if (depth > 4) return "[truncated]";
  if (value === null || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.slice(0, 50).map((item) => redact(item, depth + 1));

  const out: Record<string, unknown> = {};
  for (const [key, inner] of Object.entries(value as Record<string, unknown>)) {
    out[key] = shouldRedact(key) ? REDACTED : redact(inner, depth + 1);
  }
  return out;
}

/** Correlates every log line produced while handling one request. */
export function newRequestId(): string {
  return globalThis.crypto?.randomUUID?.() ?? `req_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * Reads the incoming correlation id if the caller or proxy set one, so a
 * trace spans the edge and the function rather than restarting here.
 */
export function requestIdFrom(request: Request): string {
  const headers = ["x-request-id", "x-vercel-id", "x-correlation-id"];
  for (const header of headers) {
    const value = request.headers.get(header)?.trim();
    if (value) return value.slice(0, 200);
  }
  return newRequestId();
}

export function formatLogLine(level: LogLevel, message: string, fields: LogFields = {}): string {
  return JSON.stringify({
    level,
    message,
    timestamp: new Date().toISOString(),
    ...(redact(fields) as LogFields),
  });
}

function emit(level: LogLevel, message: string, fields?: LogFields) {
  const line = formatLogLine(level, message, fields);
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.info(line);
}

export interface Logger {
  readonly requestId: string;
  debug(message: string, fields?: LogFields): void;
  info(message: string, fields?: LogFields): void;
  warn(message: string, fields?: LogFields): void;
  error(message: string, fields?: LogFields): void;
  child(fields: LogFields): Logger;
}

export function createLogger(requestId: string, base: LogFields = {}): Logger {
  const withBase = (fields?: LogFields) => ({ requestId, ...base, ...fields });
  return {
    requestId,
    debug: (m, f) => emit("debug", m, withBase(f)),
    info: (m, f) => emit("info", m, withBase(f)),
    warn: (m, f) => emit("warn", m, withBase(f)),
    error: (m, f) => emit("error", m, withBase(f)),
    child: (fields) => createLogger(requestId, { ...base, ...fields }),
  };
}

export function loggerForRequest(request: Request, fields: LogFields = {}): Logger {
  return createLogger(requestIdFrom(request), fields);
}
