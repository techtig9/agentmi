export const MAX_KNOWLEDGE_CHARS = 200_000;
export const MAX_KNOWLEDGE_CHUNKS = 250;

export function validateKnowledgeText(text: string): { ok: true; text: string } | { ok: false; error: string } {
  const normalized = text.replace(/\u0000/g, "").trim();
  if (!normalized) return { ok: false, error: "Knowledge text cannot be empty." };
  if (normalized.length > MAX_KNOWLEDGE_CHARS) {
    return { ok: false, error: `Knowledge is too large. Maximum is ${MAX_KNOWLEDGE_CHARS.toLocaleString()} characters per source.` };
  }
  return { ok: true, text: normalized };
}

export function validateKnowledgeUrl(value: string): { ok: true; url: string } | { ok: false; error: string } {
  let url: URL;
  try { url = new URL(value.trim()); } catch { return { ok: false, error: "Enter a valid URL." }; }
  if (url.protocol !== "https:") return { ok: false, error: "Only HTTPS knowledge URLs are allowed." };
  if (url.username || url.password) return { ok: false, error: "URLs containing credentials are not allowed." };
  const host = url.hostname.toLowerCase();
  if (host === "localhost" || host.endsWith(".localhost") || host === "127.0.0.1" || host === "::1" || host === "0.0.0.0") {
    return { ok: false, error: "Local/private hosts are not allowed." };
  }
  if (/^10\./.test(host) || /^192\.168\./.test(host) || /^172\.(1[6-9]|2\d|3[0-1])\./.test(host)) {
    return { ok: false, error: "Private network hosts are not allowed." };
  }
  return { ok: true, url: url.toString() };
}

export function sourceTitle(kind: "text" | "url", value: string): string {
  if (kind === "url") {
    try { return new URL(value).hostname; } catch { return "Web source"; }
  }
  const first = value.split(/\r?\n/).find(Boolean)?.trim() ?? "Text source";
  return first.slice(0, 80);
}
