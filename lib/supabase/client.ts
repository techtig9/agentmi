import { createBrowserClient } from "@supabase/ssr";
import { required } from "@/lib/config/env";

export function createClient() {
  return createBrowserClient(
    required(process.env.NEXT_PUBLIC_SUPABASE_URL, "NEXT_PUBLIC_SUPABASE_URL"),
    required(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, "NEXT_PUBLIC_SUPABASE_ANON_KEY"),
    // Added for shared-project deployment: this Supabase project also
    // hosts other Techtig products in the "public" schema. All of
    // Agentmi's tables/functions live in "agentmi" instead — this tells
    // every query built from this client to look there, not in "public".
    { db: { schema: "agentmi" } }
  );
}
