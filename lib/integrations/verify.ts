import { isSafeHttpUrl } from "@/lib/chat/tool-runtime";

export type VerifyResult = { ok: true; detail?: string } | { ok: false; error: string };

export async function verifySlack(token: string, fetchImpl: typeof fetch = fetch): Promise<VerifyResult> {
  try {
    const res = await fetchImpl("https://slack.com/api/auth.test", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
    const body = (await res.json()) as { ok?: boolean; team?: string; error?: string };
    if (body.ok) return { ok: true, detail: body.team ? `Connected to ${body.team}` : undefined };
    return { ok: false, error: typeof body.error === "string" ? `Slack rejected the token: ${body.error}` : "Slack rejected the token." };
  } catch {
    return { ok: false, error: "Couldn't reach Slack. Please try again." };
  }
}

export async function verifyGithub(token: string, fetchImpl: typeof fetch = fetch): Promise<VerifyResult> {
  try {
    const res = await fetchImpl("https://api.github.com/user", {
      headers: { Authorization: `Bearer ${token}`, "User-Agent": "agentmi", Accept: "application/vnd.github+json" },
    });
    if (res.status === 200) {
      const body = (await res.json()) as { login?: string };
      return { ok: true, detail: typeof body.login === "string" ? `Connected as ${body.login}` : undefined };
    }
    return { ok: false, error: `GitHub rejected the token (HTTP ${res.status}).` };
  } catch {
    return { ok: false, error: "Couldn't reach GitHub. Please try again." };
  }
}

/**
 * "Connected" for a webhook/custom integration means the URL is real and
 * reachable — a 4xx from the endpoint still proves it exists and answers,
 * so only a network-level failure (DNS, timeout, connection refused)
 * counts as not connected.
 */
export async function verifyWebhookReachable(url: string, authValue: string | undefined, fetchImpl: typeof fetch = fetch): Promise<VerifyResult> {
  if (!isSafeHttpUrl(url)) return { ok: false, error: "Enter a valid public HTTP(S) URL." };
  try {
    const headers: Record<string, string> = {};
    if (authValue) headers.Authorization = `Bearer ${authValue}`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10_000);
    try {
      const res = await fetchImpl(url, { method: "HEAD", headers, redirect: "manual", signal: controller.signal });
      return { ok: true, detail: `Responded with HTTP ${res.status}.` };
    } finally {
      clearTimeout(timer);
    }
  } catch {
    return { ok: false, error: "Couldn't reach that URL. Check it's correct and publicly accessible." };
  }
}
