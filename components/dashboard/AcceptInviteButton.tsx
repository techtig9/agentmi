"use client";

import { useState, useTransition } from "react";
import { acceptInvite } from "@/lib/actions/team";

export function AcceptInviteButton({ token }: { token: string }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div>
      <button
        type="button"
        disabled={isPending}
        onClick={() =>
          startTransition(async () => {
            const result = await acceptInvite(token);
            if (result?.error) setError(result.error);
          })
        }
        className="btn-primary w-full"
      >
        {isPending ? "Joining…" : "Accept invite"}
      </button>
      {error && <p className="text-neon-pink text-sm mt-3">{error}</p>}
    </div>
  );
}
