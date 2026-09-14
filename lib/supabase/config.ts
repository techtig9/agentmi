/**
 * Whether this deployment has the credentials Supabase needs.
 *
 * The clients in this directory assert their environment variables with `!`,
 * so constructing one without them throws. That is the right default for
 * anything that genuinely needs the database, but it means an unconfigured
 * deployment answers *every* route — including the public marketing page,
 * which only ever asks "is anyone signed in?" — with an unhandled exception.
 *
 * These helpers let a caller ask the question first and degrade honestly
 * instead of crashing. The pure functions take the environment as an argument
 * so they are unit-testable; the wrappers read `process.env` with static
 * property access, which is what Next.js needs in order to inline
 * `NEXT_PUBLIC_*` values correctly.
 */

/** Names only — a value is never read back out of here or rendered anywhere. */
export const REQUIRED_SUPABASE_ENV = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
] as const;

export type RequiredSupabaseEnv = (typeof REQUIRED_SUPABASE_ENV)[number];

export interface SupabaseEnv {
  url?: string;
  anonKey?: string;
  serviceRoleKey?: string;
}

export interface SupabaseConfigStatus {
  /** URL + anon key present: enough to authenticate and read under RLS. */
  configured: boolean;
  /** Service-role key present: required for admin-side and webhook writes. */
  serviceRoleConfigured: boolean;
  /** Names of the variables that are absent or blank, in declaration order. */
  missing: RequiredSupabaseEnv[];
}

/** A variable set to an empty or whitespace-only string counts as absent. */
function present(value: string | undefined): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

export function supabaseConfigStatus(env: SupabaseEnv): SupabaseConfigStatus {
  const hasUrl = present(env.url);
  const hasAnon = present(env.anonKey);
  const hasServiceRole = present(env.serviceRoleKey);

  const missing: RequiredSupabaseEnv[] = [];
  if (!hasUrl) missing.push("NEXT_PUBLIC_SUPABASE_URL");
  if (!hasAnon) missing.push("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  if (!hasServiceRole) missing.push("SUPABASE_SERVICE_ROLE_KEY");

  return {
    configured: hasUrl && hasAnon,
    serviceRoleConfigured: hasServiceRole,
    missing,
  };
}

/** Static property access so Next.js can inline the `NEXT_PUBLIC_*` values. */
export function readSupabaseEnv(): SupabaseEnv {
  return {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL,
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  };
}

/** True when an auth session could exist at all. */
export function isSupabaseConfigured(): boolean {
  return supabaseConfigStatus(readSupabaseEnv()).configured;
}

export function missingSupabaseEnv(): RequiredSupabaseEnv[] {
  return supabaseConfigStatus(readSupabaseEnv()).missing;
}
