import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export interface OrgContext {
  userId: string;
  isAdmin: boolean;
  orgId: string;
  orgName: string;
  role: "owner" | "admin" | "member";
  creditBalance: number;
  plan: "free" | "starter" | "pro" | "business";
}

export type Role = OrgContext["role"];

/**
 * Enforces RBAC for a server action. `ctx.role` was previously fetched and
 * displayed (settings page) but never checked anywhere — meaning any
 * "member" could invite/remove teammates, revoke API keys, disconnect
 * integrations, or rename the organization, identical to an "owner". This
 * closes that gap. Platform admins (`ctx.isAdmin`) always pass, matching
 * the existing convention that admin accounts short-circuit org-level
 * checks elsewhere (see getOrgContext's credit-balance note above).
 *
 * Usage in a `useFormState`-style action (returns `{error}`):
 *   const denied = requireRole(ctx, ["owner", "admin"]);
 *   if (denied) return { error: denied };
 *
 * Usage in a throwing action (governance.ts's pattern):
 *   const denied = requireRole(ctx, ["owner", "admin"]);
 *   if (denied) throw new Error(denied);
 */
export function requireRole(ctx: Pick<OrgContext, "role" | "isAdmin">, allowed: Role[]): string | null {
  if (ctx.isAdmin) return null;
  if (allowed.includes(ctx.role)) return null;
  return "You don't have permission to do this. Ask an organization owner or admin.";
}

/**
 * Loads everything the dashboard shell needs in one place so every page
 * under (dashboard) shares one query instead of re-fetching per page.
 * Admin accounts still resolve to their own org (for building/testing),
 * but every credit check elsewhere in the app should short-circuit on
 * isAdmin === true rather than reading creditBalance.
 */
export async function getOrgContext(): Promise<OrgContext> {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  const { data: membership } = await supabase
    .from("memberships")
    .select("org_id, role, organizations(name)")
    .eq("user_id", user.id)
    .limit(1)
    .single();

  if (!membership) redirect("/onboarding"); // no org yet — first-run flow, Phase 2

  const { data: balance } = await supabase
    .from("credit_balances")
    .select("balance")
    .eq("org_id", membership.org_id)
    .single();

  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("plan")
    .eq("org_id", membership.org_id)
    .single();

  return {
    userId: user.id,
    isAdmin: profile?.is_admin ?? false,
    orgId: membership.org_id,
    orgName: (membership.organizations as unknown as { name: string })?.name ?? "Untitled",
    role: membership.role,
    creditBalance: balance?.balance ?? 0,
    plan: subscription?.plan ?? "free",
  };
}
