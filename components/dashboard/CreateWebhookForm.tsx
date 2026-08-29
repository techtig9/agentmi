"use client";

import { useFormState, useFormStatus } from "react-dom";
import { upsertWebhookEndpoint, type WebhookState } from "@/lib/actions/webhooks";

const EVENTS = [
  { id: "agent.created", label: "Agent created" },
  { id: "agent.training_completed", label: "Training completed" },
  { id: "agent.training_failed", label: "Training failed" },
  { id: "knowledge.updated", label: "Knowledge base updated" },
] as const;

const initialState: WebhookState = { error: null };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="btn-primary text-sm">
      {pending ? "Saving…" : "Add endpoint"}
    </button>
  );
}

export function CreateWebhookForm() {
  const [state, formAction] = useFormState(upsertWebhookEndpoint, initialState);

  return (
    <div className="neon-card p-5">
      <form action={formAction} className="flex flex-col gap-3">
        <div>
          <label className="text-sm text-ink-400 block mb-1.5">Endpoint URL</label>
          <input
            name="url"
            type="url"
            placeholder="https://yourapp.com/webhooks/agentmi"
            required
            className="w-full rounded-lg bg-base-900 border border-base-700 px-3 py-2 text-sm text-ink-100
                       outline-none focus:border-neon-cyan/60"
          />
        </div>
        <div>
          <label className="text-sm text-ink-400 block mb-1.5">Events</label>
          <div className="flex flex-col gap-1.5">
            {EVENTS.map((e) => (
              <label key={e.id} className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="events" value={e.id} defaultChecked />
                {e.label}
              </label>
            ))}
          </div>
        </div>
        {state.error && <p className="text-neon-pink text-sm">{state.error}</p>}
        <div>
          <SubmitButton />
        </div>
      </form>

      {state.secret && (
        <div className="mt-4 rounded-lg border border-neon-green/40 bg-neon-green/5 p-3 text-sm">
          <p className="text-ink-100 mb-1">Signing secret — copy this now, it won&apos;t be shown again:</p>
          <code className="font-mono text-neon-green break-all">{state.secret}</code>
        </div>
      )}
    </div>
  );
}
