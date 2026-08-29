"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { getOrgContext, requireRole } from "@/lib/data/org-context";
import { generateInviteToken, verifyInviteToken } from "@/lib/team/invite-token";
import { z } from "zod";

const INVITE_TTL_DAYS = 7;

const inviteSchema = z.object({
  email: z.string().email(),
  role: z.enum(["admin", "member"]),
});

export type InviteState = { error: string | null; inviteLink?: string };

export async function inviteTeamMember(_prev: InviteState, formData: FormData): Promise<InviteState> {
  const parsed = inviteSchema.safeParse({ email: formData.get("email"), role: formData.get("role") });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const ctx = await getOrgContext();
  const denied = requireRole(ctx, ["owner", "admin"]);
  if (denied) return { error: denied };
  const supabase = createClient();
  const { fullToken, hash } = generateInviteToken();

  const { error } = await supabase.from("team_invites").insert({
    org_id: ctx.orgId,
    email: parsed.data.email,
    role: parsed.data.role,
    token_hash: hash,
    invited_by: ctx.userId,
    expires_at: new Date(Date.now() + INVITE_TTL_DAYS * 24 * 60 * 60 * 1000).toISOString(),
  });

  if (error) return { error: "Couldn't create the invite." };

  revalidatePath("/dashboard/team");
  // No email service is wired up yet — the org owner copies this link and
  // sends it themselves. Shown once, same pattern as API keys/webhook secrets.
  const inviteLink = `${process.env.NEXT_PUBLIC_APP_URL}/invite/${fullToken}`;
  return { error: null, inviteLink };
}

export type RevokeInviteState = { error: string | null };

export async function revokeInvite(_prev: RevokeInviteState, formData: FormData): Promise<RevokeInviteState> {
  const inviteId = formData.get("inviteId") as string;
  const ctx = await getOrgContext();
  const denied = requireRole(ctx, ["owner", "admin"]);
  if (denied) return { error: denied };
  const supabase = createClient();

  const { error } = await supabase.from("team_invites").delete().eq("id", inviteId).eq("org_id", ctx.orgId);
  if (error) return { error: "Couldn't revoke the invite." };

  revalidatePath("/dashboard/team");
  return { error: null };
}

export type AcceptInviteState = { error: string | null };

/**
 * Called from /invite/[token] once the visitor is logged in. Uses the
 * service-role client deliberately: a freshly-signed-up invitee has no
 * org membership yet, so RLS's is_org_member() would block reading the
 * very invite row that's about to grant them one.
 */
export async function acceptInvite(token: string): Promise<AcceptInviteState> {
  const sessionClient = createClient();
  const {
    data: { user },
  } = await sessionClient.auth.getUser();
  if (!user) return { error: "You must be logged in to accept an invite." };

  const supabase = createServiceClient();

  const { data: invites } = await supabase
    .from("team_invites")
    .select("id, org_id, role, token_hash, expires_at, accepted_at")
    .is("accepted_at", null);

  const invite = (invites ?? []).find((i) => verifyInviteToken(token, i.token_hash));
  if (!invite) return { error: "This invite link is invalid or has already been used." };
  if (new Date(invite.expires_at) < new Date()) return { error: "This invite has expired." };

  const { error: membershipError } = await supabase
    .from("memberships")
    .upsert({ org_id: invite.org_id, user_id: user.id, role: invite.role }, { onConflict: "org_id,user_id" });
  if (membershipError) return { error: "Couldn't join the organization." };

  await supabase.from("team_invites").update({ accepted_at: new Date().toISOString() }).eq("id", invite.id);
  await supabase.from("profiles").upsert({ id: user.id }, { onConflict: "id" });

  redirect("/dashboard");
}
