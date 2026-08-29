"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getOrgContext } from "@/lib/data/org-context";

export type AdminActionState = { error: string | null; success?: boolean };

async function requireAdmin() {
  const ctx = await getOrgContext();
  if (!ctx.isAdmin) {
    throw new Error("forbidden: admin only");
  }
  return ctx;
}

export async function adminGrantCredits(
  _prev: AdminActionState,
  formData: FormData
): Promise<AdminActionState> {
  const ctx = await requireAdmin();
  const targetOrgId = formData.get("orgId") as string;
  const amount = Number(formData.get("amount"));

  if (!targetOrgId || !Number.isFinite(amount) || amount <= 0) {
    return { error: "Invalid org or amount." };
  }

  const supabase = createClient();
  const { error } = await supabase.rpc("grant_credits", {
    p_org_id: targetOrgId,
    p_amount: amount,
    p_reason: "admin_override",
    p_actor_id: ctx.userId,
  });

  if (error) return { error: "Grant failed. Please try again." };

  await supabase.from("audit_logs").insert({
    org_id: targetOrgId,
    actor_id: ctx.userId,
    action: "admin_credit_grant",
    metadata: { amount },
  });

  revalidatePath("/admin/users");
  return { error: null, success: true };
}
