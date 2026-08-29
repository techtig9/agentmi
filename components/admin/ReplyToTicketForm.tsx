"use client";

import { useFormStatus } from "react-dom";
import { replyToTicket } from "@/lib/actions/support";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="btn-primary text-xs px-3 py-1.5 mt-2">
      {pending ? "Sending…" : "Send reply & resolve"}
    </button>
  );
}

export function ReplyToTicketForm({ ticketId }: { ticketId: string }) {
  return (
    <form action={replyToTicket} className="mt-2">
      <input type="hidden" name="ticketId" value={ticketId} />
      <textarea name="reply" required minLength={2} maxLength={4000} rows={2} placeholder="Write a reply…" className="w-full bg-base-900 border border-base-700 rounded-lg px-2.5 py-1.5 text-xs" />
      <SubmitButton />
    </form>
  );
}
