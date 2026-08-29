import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    // Added for shared-project deployment: this Supabase project also
    // hosts other Techtig products in the "public" schema. All of
    // Agentmi's tables/functions live in "agentmi" instead — this tells
    // every query built from this client to look there, not in "public".
    { db: { schema: "agentmi" } }
  );
}
