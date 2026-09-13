"use client";

import { Plus, ShieldAlert } from "lucide-react";
import { createSecret, revokeSecret } from "@/lib/actions/governance";
import { TextField } from "@/components/ui/Field";
import { SubmitButton } from "@/components/ui/SubmitButton";

/**
 * The three inputs here previously carried `className="input"` — a class the
 * stylesheet never defines, so they rendered completely unstyled.
 */
export function SecretCreateForm() {
  return (
    <form action={createSecret} className="neon-card space-y-4 p-5">
      <div>
        <h2 className="font-display font-bold">Add a secret reference</h2>
        <p className="mt-1 text-xs text-ink-600">
          Agentmi stores the name of a server-side variable, not the credential. Set the variable on
          the server, then point at it here.
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <TextField name="name" label="Name" required placeholder="Production API" />
        <TextField name="provider" label="Provider" required placeholder="slack" />
        <TextField
          name="secret_ref"
          label="Variable name"
          required
          placeholder="SLACK_BOT_TOKEN"
          hint="The environment variable holding the value."
          className="[&_input]:font-mono [&_input]:text-xs"
        />
      </div>

      <p className="flex items-start gap-2 rounded-lg border border-neon-cyan/25 bg-neon-cyan/5 p-3 text-xs text-neon-cyan">
        <ShieldAlert size={14} className="mt-0.5 shrink-0" aria-hidden="true" />
        Never paste the credential itself into these fields — only the name of the variable that
        holds it.
      </p>

      <SubmitButton icon={Plus} pendingLabel="Saving…">
        Add reference
      </SubmitButton>
    </form>
  );
}

export function RevokeSecretButton({ id }: { id: string }) {
  return (
    <form action={revokeSecret}>
      <input type="hidden" name="id" value={id} />
      <SubmitButton size="sm" variant="danger" pendingLabel="Revoking…">
        Revoke
      </SubmitButton>
    </form>
  );
}
