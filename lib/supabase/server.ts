import { createServerClient } from "@supabase/ssr";
import { required } from "@/lib/config/env";
import { cookies } from "next/headers";

export function createClient() {
  const cookieStore = cookies();

  return createServerClient(
    required(process.env.NEXT_PUBLIC_SUPABASE_URL, "NEXT_PUBLIC_SUPABASE_URL"),
    required(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, "NEXT_PUBLIC_SUPABASE_ANON_KEY"),
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options) {
          try {
            cookieStore.set({ name, value, ...options });
          } catch {
            // Called from a Server Component with no request context — safe to ignore
            // because middleware refreshes the session on every request anyway.
          }
        },
        remove(name: string, options) {
          try {
            cookieStore.set({ name, value: "", ...options });
          } catch {
            // See note above.
          }
        },
      },
      // Added for shared-project deployment: see lib/supabase/client.ts —
      // same reasoning, same "agentmi" schema.
      db: { schema: "agentmi" },
    }
  );
}
