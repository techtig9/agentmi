import Link from "next/link";
import { redirect } from "next/navigation";
import { missingSupabaseEnv, REQUIRED_SUPABASE_ENV } from "@/lib/supabase/config";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Setup required — Agentmi",
  robots: { index: false, follow: false },
};

/**
 * Configuration screen for a deployment that has no database credentials.
 *
 * This reports the live state of `process.env` — it lists the variables that
 * are actually absent, never a fixed list, and never a value. A deployment
 * that is correctly configured cannot reach this page: it redirects to the
 * landing page instead, so the screen can never become a stale banner
 * claiming a healthy install is broken.
 */
export default function SetupPage() {
  const missing = missingSupabaseEnv();

  if (missing.length === 0) redirect("/");

  return (
    <main className="min-h-screen px-5 py-12 grid place-items-center">
      <section className="neon-card w-full max-w-xl p-6 sm:p-8">
        <p className="font-mono text-sm text-neon-cyan mb-2">AGENTMI</p>
        <h1 className="text-2xl font-bold mb-3">Setup required</h1>
        <p className="text-ink-400 mb-6">
          The application built and deployed correctly, but it has no database
          credentials, so it cannot sign anyone in or load a workspace.
          Add the {missing.length === 1 ? "variable" : `${missing.length} variables`} below
          to your hosting environment, then redeploy.
        </p>

        <h2 className="font-mono text-xs uppercase tracking-wide text-ink-600 mb-2">
          Missing environment {missing.length === 1 ? "variable" : "variables"}
        </h2>
        <ul className="mb-6 divide-y divide-base-700 rounded-lg border border-base-700">
          {REQUIRED_SUPABASE_ENV.map((name) => {
            const isMissing = missing.includes(name);
            return (
              <li key={name} className="flex items-center justify-between gap-3 px-3 py-2.5">
                <code className="min-w-0 truncate font-mono text-xs text-ink-100">{name}</code>
                <span
                  className={
                    isMissing
                      ? "shrink-0 font-mono text-[11px] uppercase text-neon-pink"
                      : "shrink-0 font-mono text-[11px] uppercase text-neon-green"
                  }
                >
                  {isMissing ? "missing" : "set"}
                </span>
              </li>
            );
          })}
        </ul>

        <h2 className="font-mono text-xs uppercase tracking-wide text-ink-600 mb-2">
          Where the values come from
        </h2>
        <ol className="mb-6 list-decimal space-y-1.5 pl-5 text-sm text-ink-400">
          <li>Create a Supabase project and run <code className="font-mono text-xs text-ink-100">supabase/schema.sql</code> against it.</li>
          <li>Copy the project URL and the two API keys from Supabase → Settings → API.</li>
          <li>Add them to your host&apos;s environment variables, then redeploy — a deployment does not rebuild when variables change.</li>
        </ol>

        <p className="text-sm text-ink-600">
          The service-role key is server-only. Never expose it to the browser or
          commit it to a repository. Full instructions are in{" "}
          <code className="font-mono text-xs text-ink-100">DEPLOYMENT.md</code>.
        </p>

        <div className="mt-6 flex flex-wrap gap-3">
          <Link className="btn-primary" href="/">Back to home</Link>
          <Link className="btn-secondary" href="/api/ready">View readiness check</Link>
        </div>
      </section>
    </main>
  );
}
