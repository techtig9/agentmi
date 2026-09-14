"use client";

import { useEffect } from "react";
import { useFormState } from "react-dom";
import { Plus, ShieldAlert } from "lucide-react";
import { createPlatformTool, type ToolActionState } from "@/lib/actions/platform-tools";
import { TextField, TextAreaField, SelectField } from "@/components/ui/Field";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { FormAlert } from "@/components/ui/FormAlert";
import { useToast } from "@/components/ui/Toast";

const initialState: ToolActionState = { error: null };

export function CreateToolForm({
  secrets,
}: {
  secrets: { id: string; name: string; provider: string }[];
}) {
  const [state, formAction] = useFormState(createPlatformTool, initialState);
  const { toast } = useToast();

  useEffect(() => {
    if (state.success) toast(state.success, "success");
  }, [state.success, toast]);

  return (
    <form action={formAction} className="neon-card space-y-4 p-5">
      <div>
        <h2 className="font-display font-bold">Create a tool</h2>
        <p className="mt-1 text-xs text-ink-600">
          An HTTP endpoint the agent can call mid-conversation. Attach a secret to authenticate it.
        </p>
      </div>

      <TextField name="name" label="Tool name" required minLength={2} maxLength={80} placeholder="lookup_order" />

      <TextAreaField
        name="description"
        label="Description"
        rows={2}
        maxLength={500}
        placeholder="Looks up an order by its reference number."
        hint="The model reads this to decide when to call the tool, so be specific."
      />

      <div className="grid gap-3 sm:grid-cols-2">
        <SelectField name="kind" label="Type" defaultValue="http">
          <option value="http">HTTP API</option>
          <option value="custom">Custom HTTP</option>
        </SelectField>
        <SelectField name="method" label="Method" defaultValue="GET">
          {["GET", "POST", "PUT", "PATCH", "DELETE"].map((method) => (
            <option key={method} value={method}>
              {method}
            </option>
          ))}
        </SelectField>
      </div>

      <TextField
        name="endpoint"
        type="url"
        label="Endpoint"
        required
        placeholder="https://api.example.com/orders"
        hint="Must be a public HTTPS URL."
        className="[&_input]:font-mono [&_input]:text-xs"
      />

      <SelectField
        name="secret_id"
        label="Authenticate with"
        hint={
          secrets.length === 0
            ? "No secrets yet — add one under Secrets to authenticate this tool."
            : "Sent as a bearer token. The value never leaves the server."
        }
      >
        <option value="">No secret (unauthenticated)</option>
        {secrets.map((secret) => (
          <option key={secret.id} value={secret.id}>
            {secret.name} ({secret.provider})
          </option>
        ))}
      </SelectField>

      <p className="flex items-start gap-2 rounded-lg border border-neon-amber/25 bg-neon-amber/5 p-3 text-xs text-neon-amber">
        <ShieldAlert size={14} className="mt-0.5 shrink-0" aria-hidden="true" />
        An agent decides on its own when to call this tool. Point it at read-only endpoints unless
        you intend the agent to make changes.
      </p>

      {state.error && <FormAlert message={state.error} />}

      <SubmitButton className="w-full" icon={Plus} pendingLabel="Creating…">
        Create tool
      </SubmitButton>
    </form>
  );
}
