"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getOrgContext } from "@/lib/data/org-context";

const ticketSchema = z.object({
  subject: z.string().trim().min(3).max(120),
  message: z.string().trim().min(10).max(4000),
});

export type CreateTicketState = { error: string | null; success?: boolean };

export async function createSupportTicket(_prev: CreateTicketState, formData: FormData): Promise<CreateTicketState> {
  const parsed = ticketSchema.safeParse({ subject: formData.get("subject"), message: formData.get("message") });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const ctx = await getOrgContext();
  const supabase = createClient();
  const { error } = await supabase.from("support_tickets").insert({
    org_id: ctx.orgId, created_by: ctx.userId, subject: parsed.data.subject, message: parsed.data.message, status: "open",
  });
  if (error) return { error: "Couldn't submit your request. Please try again." };

  revalidatePath("/dashboard/support");
  return { error: null, success: true };
}

/**
 * Platform-admin-only (not org-role-gated — this crosses org boundaries by
 * design, same as the rest of /admin). Replying resolves the ticket and
 * creates a real notification for the ticket's org, so "notifications"
 * isn't a standalone, disconnected feature — it's the actual delivery
 * mechanism for support responses.
 */
export async function replyToTicket(formData: FormData) {
  const ticketId = String(formData.get("ticketId") || "");
  const reply = String(formData.get("reply") || "").trim();
  if (!z.string().uuid().safeParse(ticketId).success) throw new Error("Invalid ticket.");
  if (reply.length < 2 || reply.length > 4000) throw new Error("Reply must be between 2 and 4000 characters.");

  const ctx = await getOrgContext();
  if (!ctx.isAdmin) throw new Error("Only Techtig admins can reply to support tickets.");

  const supabase = createClient();
  const { data: ticket } = await supabase.from("support_tickets").select("id,org_id,subject").eq("id", ticketId).single();
  if (!ticket) throw new Error("Ticket not found.");

  const { error } = await supabase
    .from("support_tickets")
    .update({ admin_reply: reply, status: "resolved", replied_by: ctx.userId, updated_at: new Date().toISOString() })
    .eq("id", ticketId);
  if (error) throw new Error(error.message);

  await supabase.from("notifications").insert({
    org_id: ticket.org_id,
    title: `Support replied: ${ticket.subject}`,
    body: reply,
  });

  revalidatePath("/admin/support");
  revalidatePath("/dashboard/support");
}

export async function markNotificationRead(formData: FormData) {
  const notificationId = String(formData.get("notificationId") || "");
  if (!z.string().uuid().safeParse(notificationId).success) throw new Error("Invalid notification.");
  const ctx = await getOrgContext();
  const supabase = createClient();
  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", notificationId)
    .eq("org_id", ctx.orgId);
  if (error) throw new Error(error.message);
  revalidatePath("/dashboard/notifications");
}
