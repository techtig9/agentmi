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
