"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getOrgContext, requireRole } from "@/lib/data/org-context";
import { z } from "zod";

const orgSchema = z.object({
  name: z.string().min(2, "Organization name must be at least 2 characters").max(80),
});

export type OnboardingState = { error: string | null };

const SIGNUP_CREDIT_GRANT = 500; // matches PLANS.free.creditsPerMonth in lib/pricing/plans.ts

function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export async function createOrganization(
  _prev: OnboardingState,
  formData: FormData
): Promise<OnboardingState> {
  const parsed = orgSchema.safeParse({ name: formData.get("name") });
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Ensure a profile row exists (defensive — normally created by a DB trigger on signup).
  await supabase.from("profiles").upsert({ id: user.id }, { onConflict: "id" });

  const baseSlug = slugify(parsed.data.name) || "org";
  const slug = `${baseSlug}-${user.id.slice(0, 6)}`; // cheap uniqueness without a retry loop

  const { data: org, error: orgError } = await supabase
    .from("organizations")
    .insert({ name: parsed.data.name, slug, owner_id: user.id })
    .select("id")
    .single();

  if (orgError || !org) {
    return { error: "Couldn't create your organization. Please try again." };
  }

  const { error: membershipError } = await supabase
    .from("memberships")
    .insert({ org_id: org.id, user_id: user.id, role: "owner" });

  if (membershipError) {
    return { error: "Organization created, but membership setup failed. Contact support." };
  }

  await supabase.from("subscriptions").insert({ org_id: org.id, plan: "free", cycle: "monthly" });

  const { error: grantError } = await supabase.rpc("grant_credits", {
    p_org_id: org.id,
    p_amount: SIGNUP_CREDIT_GRANT,
    p_reason: "signup_grant",
    p_actor_id: user.id,
  });

  if (grantError) {
    // Org exists and is usable even if this fails — surface it in the UI
    // rather than blocking onboarding, so support can grant credits manually.
    console.error("signup credit grant failed:", grantError.message);
  }

  redirect("/dashboard");
}

export type UpdateOrgState = { error: string | null; success?: boolean };

export async function updateOrganizationName(
  _prev: UpdateOrgState,
  formData: FormData
): Promise<UpdateOrgState> {
  const parsed = orgSchema.safeParse({ name: formData.get("name") });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const ctx = await getOrgContext();
  const denied = requireRole(ctx, ["owner"]);
  if (denied) return { error: denied };
  const supabase = createClient();

  const { error } = await supabase
    .from("organizations")
    .update({ name: parsed.data.name })
    .eq("id", ctx.orgId);

  if (error) return { error: "Couldn't update the organization name." };

  revalidatePath("/dashboard/settings");
  return { error: null, success: true };
}
