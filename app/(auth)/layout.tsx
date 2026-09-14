import { redirect } from "next/navigation";
import { isSupabaseConfigured } from "@/lib/supabase/config";

// Read per request: these routes must reflect the deployment's live
// configuration, not whatever was set when the build ran.
export const dynamic = "force-dynamic";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  // Sign-in and sign-up cannot do anything without an auth server. Sending the
  // operator to the setup screen states the real problem; rendering the form
  // would fail only once they had typed their credentials.
  if (!isSupabaseConfigured()) redirect("/setup");

  return (
    <div className="aurora-backdrop flex min-h-screen items-center justify-center px-4 py-10">
      <main className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <span className="font-display text-xl font-bold tracking-tight text-ink-100">
            agent<span className="text-neon-cyan">mi</span>
          </span>
        </div>
        <div className="neon-card p-6 sm:p-8">{children}</div>
      </main>
    </div>
  );
}
