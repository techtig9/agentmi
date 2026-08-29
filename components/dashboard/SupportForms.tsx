"use client";

import { useFormState, useFormStatus } from "react-dom";
import { createSupportTicket, type CreateTicketState } from "@/lib/actions/support";

const initialState: CreateTicketState = { error: null };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="btn-primary text-sm">
      {pending ? "Sending…" : "Submit request"}
    </button>
  );
}

export function CreateTicketForm() {
  const [state, formAction] = useFormState(createSupportTicket, initialState);
  if (state.success) {
    return <p className="text-sm text-neon-green">Your request has been submitted — we&apos;ll reply here once it&apos;s answered.</p>;
  }
  return (
    <form action={formAction} className="flex flex-col gap-3">
      <input name="subject" required minLength={3} maxLength={120} placeholder="What do you need help with?" className="w-full bg-base-800 border border-base-700 rounded-lg px-3 py-2 text-sm" />
      <textarea name="message" required minLength={10} maxLength={4000} rows={5} placeholder="Describe the issue in detail…" className="w-full bg-base-800 border border-base-700 rounded-lg px-3 py-2 text-sm" />
      {state.error && <p className="text-neon-pink text-sm">{state.error}</p>}
      <div><SubmitButton /></div>
    </form>
  );
}
