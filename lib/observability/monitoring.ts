/**
 * Error-reporting and analytics seams.
 *
 * Both are no-ops until a key is configured, and neither pulls in a vendor
 * SDK. The point is that call sites can report an error or an event today
 * without the product taking on a dependency, an egress path or a cookie
 * banner it does not yet need — and without those call sites changing when a
 * provider is eventually chosen.
 */
import { createLogger, newRequestId, type LogFields } from "./logger";

export function isErrorReportingConfigured(): boolean {
  return Boolean(process.env.SENTRY_DSN?.trim());
}

export function isAnalyticsConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_ANALYTICS_ID?.trim());
}

/**
 * Records an error. Until a DSN exists this writes a structured log line,
 * which is strictly better than swallowing it — the failure stays visible in
 * whatever already collects stdout.
 */
export function reportError(error: unknown, fields: LogFields = {}): void {
  const log = createLogger(typeof fields.requestId === "string" ? fields.requestId : newRequestId());
  const normalised =
    error instanceof Error
      ? { errorName: error.name, errorMessage: error.message }
      : { errorMessage: String(error) };

  log.error("unhandled_error", {
    ...fields,
    ...normalised,
    reportedToProvider: isErrorReportingConfigured(),
  });
}

/** Product analytics event. Dropped silently when analytics is unconfigured. */
export function trackEvent(name: string, properties: LogFields = {}): void {
  if (!isAnalyticsConfigured()) return;
  createLogger(newRequestId()).info("analytics_event", { event: name, ...properties });
}
