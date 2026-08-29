"use client";

import { useFormStatus } from "react-dom";
import { markNotificationRead } from "@/lib/actions/support";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="text-xs text-neon-cyan hover:underline shrink-0">
      {pending ? "…" : "Mark read"}
    </button>
  );
}

export function MarkReadButton({ notificationId }: { notificationId: string }) {
  return (
    <form action={markNotificationRead}>
      <input type="hidden" name="notificationId" value={notificationId} />
      <SubmitButton />
    </form>
  );
}
