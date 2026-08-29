import type { createClient } from "@/lib/supabase/server";
import type { createServiceClient } from "@/lib/supabase/service";

export interface ResolvedSecret {
  value: string;
  provider: string;
}

type AgentmiSupabaseClient = ReturnType<typeof createClient> | ReturnType<typeof createServiceClient>;

/**
 * Resolves a stored secret reference to its actual credential value.
 *
 * `secret_ref` is documented to the user (see the create-secret form) as a
 * "secret manager reference", not the raw credential — the actual value is
 * never stored in Postgres. This deployment's secrets manager is the
 * server's own environment: `secret_ref` names an environment variable
 * (e.g. `secret_ref = "SLACK_BOT_TOKEN"`), which is looked up here. This
 * keeps the documented contract honest without requiring a third-party
 * vault integration this deployment doesn't have credentials for.
 *
 * Returns null (never throws) if the secret doesn't exist, doesn't belong
 * to the given org, has been revoked, or its referenced environment
 * variable isn't set — callers treat all of these as "not usable" the
 * same way.
 */
export async function resolveSecret(
  supabase: AgentmiSupabaseClient,
  orgId: string,
  secretId: string
): Promise<ResolvedSecret | null> {
  const { data: secret } = await supabase
    .from("agent_secrets")
    .select("id,provider,secret_ref,revoked_at")
    .eq("id", secretId)
    .eq("org_id", orgId)
    .is("revoked_at", null)
    .single();
  if (!secret) return null;

  const value = process.env[secret.secret_ref as string];
  if (!value) return null;

  return { value, provider: secret.provider as string };
}
