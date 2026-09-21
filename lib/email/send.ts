import type { EmailContent } from "./templates";
import { createLogger, newRequestId } from "@/lib/observability/logger";

/**
 * Provider-agnostic sender.
 *
 * Nothing is sent unless a provider is configured. That is deliberate: a
 * half-configured deployment should not silently drop mail and report success,
 * and it certainly should not throw inside a signup flow because email was not
 * set up. The result says which happened, so a caller can decide.
 */
export type SendResult =
  | { status: "sent"; provider: string }
  | { status: "skipped"; reason: "not_configured" }
  | { status: "failed"; reason: string };

export function isEmailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY?.trim() && process.env.EMAIL_FROM?.trim());
}

export async function sendEmail(to: string, content: EmailContent): Promise<SendResult> {
  const log = createLogger(newRequestId(), { subject: content.subject });

  if (!isEmailConfigured()) {
    log.info("email_skipped", { reason: "not_configured" });
    return { status: "skipped", reason: "not_configured" };
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM,
        to,
        subject: content.subject,
        html: content.html,
        text: content.text,
      }),
    });

    if (!response.ok) {
      const reason = `provider responded ${response.status}`;
      log.warn("email_failed", { reason });
      return { status: "failed", reason };
    }

    log.info("email_sent", { provider: "resend" });
    return { status: "sent", provider: "resend" };
  } catch (error) {
    const reason = error instanceof Error ? error.message : "unknown transport error";
    log.warn("email_failed", { reason });
    return { status: "failed", reason };
  }
}
