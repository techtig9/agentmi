"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getOrgContext, requireRole } from "@/lib/data/org-context";
import { generateApiKey } from "@/lib/api-keys/generate";

export type CreateKeyState = { error: string | null; fullKey?: string };

export async function createApiKey(_prev: CreateKeyState, formData: FormData): Promise<CreateKeyState> {
  const name = (formData.get("name") as string) || "API Key";
  const ctx = await getOrgContext();
  const denied = requireRole(ctx, ["owner", "admin"]);
  if (denied) return { error: denied };
  const supabase = createClient();

  const generated = generateApiKey();

  const { error } = await supabase.from("api_keys").insert({
    org_id: ctx.orgId,
    name,
    key_hash: generated.hash,
    display_prefix: generated.displayPrefix,
    created_by: ctx.userId,
  });

  if (error) return { error: "Couldn't create the API key. Please try again." };

  revalidatePath("/dashboard/api-keys");
  // fullKey is returned ONCE — the UI must show/copy it now; it's never
  // retrievable again since only the hash is stored.
  return { error: null, fullKey: generated.fullKey };
}

export type RevokeKeyState = { error: string | null };

export async function revokeApiKey(_prev: RevokeKeyState, formData: FormData): Promise<RevokeKeyState> {
  const keyId = formData.get("keyId") as string;
  const ctx = await getOrgContext();
  const denied = requireRole(ctx, ["owner", "admin"]);
  if (denied) return { error: denied };
  const supabase = createClient();

  const { error } = await supabase
    .from("api_keys")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", keyId)
    .eq("org_id", ctx.orgId);

  if (error) return { error: "Couldn't revoke the key." };

  revalidatePath("/dashboard/api-keys");
  return { error: null };
}

export type RotateKeyState = { error: string | null; fullKey?: string; success?: string };

/**
 * Issues a replacement key and revokes the old one.
 *
 * Rotation is two rows, not an update: the key hash is one-way, so "changing" a
 * key means creating a new secret. Keeping the revoked row preserves the audit
 * trail of what was live and when, and leaves `last_used_at` intact so you can
 * see whether the old key is still being used by something you forgot to update.
 *
 * The new secret is returned once and never stored in plaintext.
 */
export async function rotateApiKey(
  _prev: RotateKeyState,
  formData: FormData
): Promise<RotateKeyState> {
  const keyId = formData.get("keyId");
  if (typeof keyId !== "string" || keyId.length === 0) return { error: "Invalid key." };

  const ctx = await getOrgContext();
  const denied = requireRole(ctx, ["owner", "admin"]);
  if (denied) return { error: denied };

  const supabase = createClient();
  const { data: existing } = await supabase
    .from("api_keys")
    .select("id, name, revoked_at")
    .eq("id", keyId)
    .eq("org_id", ctx.orgId)
    .single();

  if (!existing) return { error: "API key not found." };
  if (existing.revoked_at) return { error: "That key is already revoked — create a new one instead." };

  const generated = generateApiKey();
  const { error: insertError } = await supabase.from("api_keys").insert({
    org_id: ctx.orgId,
    name: existing.name,
    key_hash: generated.hash,
    display_prefix: generated.displayPrefix,
    created_by: ctx.userId,
  });
  if (insertError) return { error: "Couldn't issue the replacement key. Please try again." };

  // Only revoke the old key once the replacement exists, so a failure here
  // never leaves the workspace with no working key at all.
  const { error: revokeError } = await supabase
    .from("api_keys")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", existing.id)
    .eq("org_id", ctx.orgId);
  if (revokeError) {
    return { error: "The new key was created but the old one could not be revoked. Revoke it manually." };
  }

  await supabase.from("audit_logs").insert({
    org_id: ctx.orgId,
    actor_id: ctx.userId,
    action: "api_key_rotated",
    metadata: { rotated_key_id: existing.id, name: existing.name },
  });

  revalidatePath("/dashboard/api-keys");
  return {
    error: null,
    fullKey: generated.fullKey,
    success: `Rotated ${existing.name}. The old key no longer works.`,
  };
}
