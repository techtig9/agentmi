"use client";

import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { createApiKey, type CreateKeyState } from "@/lib/actions/api-keys";

const initialState: CreateKeyState = { error: null };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="btn-primary text-sm">
      {pending ? "Creating…" : "Create key"}
    </button>
  );
}

export function CreateApiKeyForm() {
  const [state, formAction] = useFormState(createApiKey, initialState);
  const [copied, setCopied] = useState(false);

  return (
    <div className="neon-card p-5">
      <form action={formAction} className="flex items-end gap-3 mb-3">
        <div className="flex-1">
          <label className="text-sm text-ink-400 block mb-1.5">Key name</label>
          <input
            name="name"
            placeholder="e.g. Production"
            className="w-full rounded-lg bg-base-900 border border-base-700 px-3 py-2 text-sm text-ink-100
                       outline-none focus:border-neon-cyan/60"
          />
        </div>
        <SubmitButton />
      </form>

      {state.error && <p className="text-neon-pink text-sm">{state.error}</p>}

      {state.fullKey && (
        <div className="rounded-lg border border-neon-green/40 bg-neon-green/5 p-3 text-sm">
          <p className="text-ink-100 mb-2">
            Copy this now — it won&apos;t be shown again:
          </p>
          <div className="flex items-center gap-2">
            <code className="font-mono text-neon-green break-all">{state.fullKey}</code>
            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(state.fullKey!);
                setCopied(true);
              }}
              className="btn-secondary text-xs px-2 py-1 shrink-0"
            >
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
