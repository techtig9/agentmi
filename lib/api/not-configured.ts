import { NextResponse } from "next/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { isConfigurationError } from "@/lib/config/env";

/**
 * The body every route returns when the deployment has no database.
 *
 * 503 rather than 500: the request was valid and the service is expected to
 * work once configured, which is exactly what "Service Unavailable" means. The
 * variable name is safe to return — it is a name, never a value — and it is
 * what an operator needs in order to fix the deployment.
 */
export function notConfiguredBody(variable?: string) {
  return {
    error: "This deployment is not configured.",
    detail: variable
      ? `Set ${variable} in the hosting environment and redeploy.`
      : "Set the Supabase environment variables and redeploy. See /setup.",
    code: "not_configured" as const,
  };
}

/**
 * Call at the top of a route handler, before anything that builds a client.
 * Returns a response to send, or null when the route may proceed.
 */
export function guardConfigured(): NextResponse | null {
  if (isSupabaseConfigured()) return null;
  return NextResponse.json(notConfiguredBody(), {
    status: 503,
    headers: { "Cache-Control": "no-store" },
  });
}

/**
 * Turns a ConfigurationError thrown deeper in a request into the same 503,
 * and rethrows anything else so real bugs are not swallowed.
 */
export function configurationErrorResponse(error: unknown): NextResponse | null {
  if (!isConfigurationError(error)) return null;
  return NextResponse.json(notConfiguredBody(error.variable), {
    status: 503,
    headers: { "Cache-Control": "no-store" },
  });
}
