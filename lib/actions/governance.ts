"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getOrgContext, requireRole } from "@/lib/data/org-context";
import { resolveSecret } from "@/lib/secrets/resolve";
import { verifySlack, verifyGithub, verifyWebhookReachable, type VerifyResult } from "@/lib/integrations/verify";

const secretSchema = z.object({
  name: z.string().trim().min(2).max(80),
  provider: z.string().trim().min(2).max(60),
  secretRef: z.string().trim().min(2).max(240),
});

export async function createSecret(formData: FormData) {
  const parsed = secretSchema.safeParse({
    name: formData.get("name"), provider: formData.get("provider"), secretRef: formData.get("secret_ref"),
  });
  if (!parsed.success) throw new Error(parsed.error.issues[0].message);
  const ctx = await getOrgContext();
  const denied = requireRole(ctx, ["owner", "admin"]);
  if (denied) throw new Error(denied);
  const supabase = createClient();
  const { error } = await supabase.from("agent_secrets").insert({
    org_id: ctx.orgId, name: parsed.data.name, provider: parsed.data.provider,
    secret_ref: parsed.data.secretRef, created_by: ctx.userId,
  });
  if (error) throw new Error(error.message);
  await supabase.from("audit_logs").insert({ org_id: ctx.orgId, actor_id: ctx.userId, action: "secret_created", metadata: { name: parsed.data.name, provider: parsed.data.provider } });
  revalidatePath("/dashboard/secrets"); revalidatePath("/dashboard/security");
}

export async function revokeSecret(formData: FormData) {
  const id = String(formData.get("id") || "");
  if (!z.string().uuid().safeParse(id).success) throw new Error("Invalid secret.");
  const ctx = await getOrgContext();
  const denied = requireRole(ctx, ["owner", "admin"]);
  if (denied) throw new Error(denied);
  const supabase = createClient();
  const { data: secret } = await supabase.from("agent_secrets").select("id,name,provider").eq("id", id).eq("org_id", ctx.orgId).single();
  if (!secret) throw new Error("Secret not found.");
  const { error } = await supabase.from("agent_secrets").update({ revoked_at: new Date().toISOString() }).eq("id", id).eq("org_id", ctx.orgId);
  if (error) throw new Error(error.message);
  await supabase.from("audit_logs").insert({ org_id: ctx.orgId, actor_id: ctx.userId, action: "secret_revoked", metadata: { secret_id: id, name: secret.name, provider: secret.provider } });
  revalidatePath("/dashboard/secrets");
}

const integrationSchema = z.object({
  name: z.string().trim().min(2).max(80),
  provider: z.enum(["slack", "github", "webhook", "custom"]),
  secretId: z.string().uuid().optional().or(z.literal("")),
  url: z.string().url().optional().or(z.literal("")),
});

export async function createIntegration(formData: FormData) {
  const parsed = integrationSchema.safeParse({
    name: formData.get("name"),
    provider: formData.get("provider"),
    secretId: formData.get("secret_id") || undefined,
    url: formData.get("url") || undefined,
  });
  if (!parsed.success) throw new Error(parsed.error.issues[0].message);
  const ctx = await getOrgContext();
  const denied = requireRole(ctx, ["owner", "admin"]);
  if (denied) throw new Error(denied);
  const supabase = createClient();

  let resolvedToken: string | undefined;
  if (parsed.data.secretId) {
    const resolved = await resolveSecret(supabase, ctx.orgId, parsed.data.secretId);
    if (!resolved) throw new Error("Selected secret is unavailable, or its referenced credential isn't configured.");
    resolvedToken = resolved.value;
  }

  let verification: VerifyResult;
  let extraConfig: Record<string, unknown> = {};
  if (parsed.data.provider === "slack") {
    if (!resolvedToken) throw new Error("Slack integrations require a secret containing a bot token.");
    verification = await verifySlack(resolvedToken);
  } else if (parsed.data.provider === "github") {
    if (!resolvedToken) throw new Error("GitHub integrations require a secret containing a personal access token.");
    verification = await verifyGithub(resolvedToken);
  } else {
    if (!parsed.data.url) throw new Error("Webhook and custom integrations require a URL.");
    verification = await verifyWebhookReachable(parsed.data.url, resolvedToken);
    extraConfig = { url: parsed.data.url };
  }

  // This is the actual fix: status now reflects a real verification result
  // instead of being set unconditionally the moment the form is submitted.
  if (!verification.ok) throw new Error(verification.error);

  const { data, error } = await supabase.from("integrations").insert({
    org_id: ctx.orgId, name: parsed.data.name, provider: parsed.data.provider, status: "connected",
    secret_id: parsed.data.secretId || null, created_by: ctx.userId,
    config: { managed_by: "agentmi", version: 1, verified_detail: verification.detail ?? null, ...extraConfig },
  }).select("id").single();
  if (error) throw new Error(error.message);
  await supabase.from("audit_logs").insert({ org_id: ctx.orgId, actor_id: ctx.userId, action: "integration_connected", metadata: { integration_id: data?.id, name: parsed.data.name, provider: parsed.data.provider, verified: true } });
  revalidatePath("/dashboard/integrations");
}

export async function disconnectIntegration(formData: FormData) {
  const id = String(formData.get("id") || "");
  if (!z.string().uuid().safeParse(id).success) throw new Error("Invalid integration.");
  const ctx = await getOrgContext();
  const denied = requireRole(ctx, ["owner", "admin"]);
  if (denied) throw new Error(denied);
  const supabase = createClient();
  const { data: integration } = await supabase.from("integrations").select("id,name,provider").eq("id", id).eq("org_id", ctx.orgId).single();
  if (!integration) throw new Error("Integration not found.");
  const { error } = await supabase.from("integrations").update({ status: "disconnected" }).eq("id", id).eq("org_id", ctx.orgId);
  if (error) throw new Error(error.message);
  await supabase.from("audit_logs").insert({ org_id: ctx.orgId, actor_id: ctx.userId, action: "integration_disconnected", metadata: { integration_id: id, name: integration.name, provider: integration.provider } });
  revalidatePath("/dashboard/integrations");
}
