import { createServiceClient } from "@/lib/supabase/service";
import { verifyApiKey } from "./generate";

export interface ApiAuthResult {
  orgId: string;
  keyId: string;
}

/**
 * Looks up candidate keys by nothing more specific than "not revoked" and
 * verifies in-process with a constant-time comparison — we don't look up
 * by full-key equality in SQL (that would mean storing/comparing
 * plaintext). At API-key-table scale this linear scan is fine; if it ever
 * isn't, the display_prefix can narrow the SQL filter first.
 *
 * Uses the service-role client deliberately: the caller here is an
 * external API consumer with no Supabase auth session, so RLS's
 * is_org_member() (which reads auth.uid()) would match nothing and this
 * would silently return zero keys even for valid ones.
 */
export async function authenticateApiRequest(request: Request): Promise<ApiAuthResult | null> {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;
  const providedKey = authHeader.slice("Bearer ".length).trim();
  if (!providedKey) return null;

  const supabase = createServiceClient();
  const { data: candidates } = await supabase
    .from("api_keys")
    .select("id, org_id, key_hash")
    .is("revoked_at", null);

  const match = (candidates ?? []).find((k) => verifyApiKey(providedKey, k.key_hash));
  if (!match) return null;

  await supabase.from("api_keys").update({ last_used_at: new Date().toISOString() }).eq("id", match.id);

  return { orgId: match.org_id, keyId: match.id };
}
