import { createClient } from "@supabase/supabase-js";

/**
 * Bypasses RLS entirely — only for server code that has already
 * authenticated the caller through a non-Supabase-session mechanism
 * (a verified API key, a verified webhook signature) and is now acting
 * on behalf of a specific, already-known org_id. Every query built on
 * this client MUST filter by that org_id explicitly — there's no RLS
 * safety net here, unlike lib/supabase/server.ts's cookie-based client.
 */
export function createServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    // Added for shared-project deployment: see lib/supabase/client.ts —
    // same reasoning, same "agentmi" schema.
    { db: { schema: "agentmi" } }
  );
}
