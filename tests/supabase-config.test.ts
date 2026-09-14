import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  supabaseConfigStatus,
  REQUIRED_SUPABASE_ENV,
  type SupabaseEnv,
} from "../lib/supabase/config";

const COMPLETE: SupabaseEnv = {
  url: "https://example.supabase.co",
  anonKey: "anon-key",
  serviceRoleKey: "service-role-key",
};

test("a fully configured environment reports no missing variables", () => {
  const status = supabaseConfigStatus(COMPLETE);
  assert.equal(status.configured, true);
  assert.equal(status.serviceRoleConfigured, true);
  assert.deepEqual(status.missing, []);
});

test("an empty environment reports every required variable as missing", () => {
  const status = supabaseConfigStatus({});
  assert.equal(status.configured, false);
  assert.equal(status.serviceRoleConfigured, false);
  assert.deepEqual(status.missing, [...REQUIRED_SUPABASE_ENV]);
});

test("a blank or whitespace-only value counts as absent, not as set", () => {
  // Vercel stores an empty variable as "", which would otherwise pass a
  // truthiness check on the key's existence and fail later at the client.
  const status = supabaseConfigStatus({ url: "   ", anonKey: "", serviceRoleKey: "\t\n" });
  assert.equal(status.configured, false);
  assert.deepEqual(status.missing, [...REQUIRED_SUPABASE_ENV]);
});

test("the service-role key alone does not make the app renderable", () => {
  // Authentication needs the URL and anon key; the service-role key is for
  // server-side writes. Treating it as sufficient would let the guards pass
  // and then throw inside createClient().
  const status = supabaseConfigStatus({ serviceRoleKey: "service-role-key" });
  assert.equal(status.configured, false);
  assert.equal(status.serviceRoleConfigured, true);
  assert.deepEqual(status.missing, ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY"]);
});

test("missing variables are reported in declaration order", () => {
  const status = supabaseConfigStatus({ anonKey: "anon-key" });
  assert.deepEqual(status.missing, ["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"]);
});

// ---------------------------------------------------------------------------
// Wiring: the guards must actually be installed at every unauthenticated entry
// point, or the crash comes back the next time someone edits these files.
// ---------------------------------------------------------------------------

const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("the landing page checks configuration before constructing a client", () => {
  const source = read("app/page.tsx");
  assert.match(source, /isSupabaseConfigured/, "landing page must guard the session lookup");
  const guardAt = source.indexOf("isSupabaseConfigured()");
  const clientAt = source.indexOf("createClient()");
  assert.ok(guardAt > 0 && clientAt > guardAt, "the guard must precede createClient()");
});

test("the landing page is rendered per request", () => {
  // The guard can skip cookies(), so without this Next.js would prerender the
  // unconfigured branch at build time and keep serving it afterwards.
  assert.match(read("app/page.tsx"), /export const dynamic = "force-dynamic"/);
});

test("middleware redirects to setup instead of constructing a client", () => {
  const source = read("middleware.ts");
  const guardAt = source.indexOf("isSupabaseConfigured()");
  const clientAt = source.indexOf("createServerClient(");
  assert.ok(guardAt > 0, "middleware must check configuration");
  assert.ok(clientAt > guardAt, "the guard must precede createServerClient()");
  assert.match(source, /"\/setup"/);
});

test("the setup route is outside the middleware matcher so it cannot loop", () => {
  const source = read("middleware.ts");
  const matcher = source.slice(source.indexOf("matcher:"));
  assert.doesNotMatch(matcher, /setup/, "matching /setup would redirect it to itself forever");
});

test("the auth layout sends an unconfigured deployment to setup", () => {
  const source = read("app/(auth)/layout.tsx");
  assert.match(source, /isSupabaseConfigured/);
  assert.match(source, /redirect\("\/setup"\)/);
});

test("the setup page never renders a variable's value", () => {
  // It reports which names are absent. Printing a value would leak the
  // service-role key to anyone who opened the page.
  const source = read("app/setup/page.tsx");
  assert.doesNotMatch(source, /process\.env\[/, "no dynamic env reads on the setup page");
  assert.doesNotMatch(
    source,
    /process\.env\.(NEXT_PUBLIC_SUPABASE|SUPABASE)/,
    "the setup page must go through missingSupabaseEnv(), not read values"
  );
});

test("a configured deployment cannot land on the setup page", () => {
  const source = read("app/setup/page.tsx");
  assert.match(source, /missing\.length === 0.*redirect\("\/"\)/s);
});
