"use server";

import { revalidatePath } from "next/cache";
import { randomBytes } from "node:crypto";
import { createClient } from "@/lib/supabase/server";
import { getOrgContext, requireRole } from "@/lib/data/org-context";
import { z } from "zod";

const ALL_EVENTS = [
  "agent.created",
  "agent.training_completed",
  "agent.training_failed",
  "knowledge.updated",
] as const;

const schema = z.object({
  url: z.string().url("Enter a valid URL"),
  events: z.array(z.enum(ALL_EVENTS)).min(1, "Select at least one event"),
});

export type WebhookState = { error: string | null; secret?: string };

export async function upsertWebhookEndpoint(_prev: WebhookState, formData: FormData): Promise<WebhookState> {
  const parsed = schema.safeParse({
    url: formData.get("url"),
    events: formData.getAll("events"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const ctx = await getOrgContext();
  const denied = requireRole(ctx, ["owner", "admin"]);
  if (denied) return { error: denied };
  const supabase = createClient();
  const secret = `whsec_${randomBytes(16).toString("hex")}`;

  const { error } = await supabase.from("webhook_endpoints").insert({
    org_id: ctx.orgId,
    url: parsed.data.url,
    secret,
    subscribed_events: parsed.data.events,
    created_by: ctx.userId,
  });

  if (error) return { error: "Couldn't save the webhook endpoint." };

  revalidatePath("/dashboard/webhooks");
  return { error: null, secret }; // shown once, same pattern as API keys
}

export type DeactivateState = { error: string | null };

export async function deactivateWebhookEndpoint(_prev: DeactivateState, formData: FormData): Promise<DeactivateState> {
  const endpointId = formData.get("endpointId") as string;
  const ctx = await getOrgContext();
  const denied = requireRole(ctx, ["owner", "admin"]);
  if (denied) return { error: denied };
  const supabase = createClient();

  const { error } = await supabase
    .from("webhook_endpoints")
    .update({ is_active: false })
    .eq("id", endpointId)
    .eq("org_id", ctx.orgId);

  if (error) return { error: "Couldn't deactivate the endpoint." };

  revalidatePath("/dashboard/webhooks");
  return { error: null };
}
