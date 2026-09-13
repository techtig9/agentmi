"use client";

import { Github, Link2, MessageSquare, Plug, Webhook } from "lucide-react";
import { createIntegration, disconnectIntegration } from "@/lib/actions/governance";
import { TextField, SelectField } from "@/components/ui/Field";
import { SubmitButton } from "@/components/ui/SubmitButton";

/**
 * Only the providers `createIntegration` can actually verify are offered.
 * Slack and GitHub are checked against their real APIs; webhook and custom are
 * checked for reachability. Nothing here is marked connected without that.
 */
export const SUPPORTED_PROVIDERS = [
  { id: "slack", label: "Slack", icon: MessageSquare, category: "Communication", needs: "secret" },
  { id: "github", label: "GitHub", icon: Github, category: "Developer", needs: "secret" },
  { id: "webhook", label: "Webhook", icon: Webhook, category: "Webhooks", needs: "url" },
  { id: "custom", label: "Custom HTTP", icon: Plug, category: "Custom", needs: "url" },
] as const;

export function IntegrationForm({
  secretIds,
}: {
  secretIds: { id: string; name: string; provider: string }[];
}) {
  return (
    <form action={createIntegration} className="neon-card space-y-4 p-5">
      <div>
        <h2 className="font-display font-bold">Connect a service</h2>
        <p className="mt-1 text-xs text-ink-600">
          The connection is verified against the real provider before it is saved — nothing is
          marked connected on trust.
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <TextField name="name" label="Connection name" required placeholder="Support Slack" />
        <SelectField name="provider" label="Provider" defaultValue="slack">
          {SUPPORTED_PROVIDERS.map((provider) => (
            <option key={provider.id} value={provider.id}>
              {provider.label}
            </option>
          ))}
        </SelectField>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <SelectField
          name="secret_id"
          label="Secret"
          hint="Slack and GitHub require a secret holding their token."
        >
          <option value="">No secret</option>
          {secretIds.map((secret) => (
            <option key={secret.id} value={secret.id}>
              {secret.name} ({secret.provider})
            </option>
          ))}
        </SelectField>
        <TextField
          name="url"
          type="url"
          label="URL"
          placeholder="https://example.com/hook"
          hint="Required for webhook and custom connections."
          className="[&_input]:font-mono [&_input]:text-xs"
        />
      </div>

      <SubmitButton icon={Link2} pendingLabel="Verifying…">
        Connect
      </SubmitButton>
    </form>
  );
}

export function DisconnectIntegration({ id }: { id: string }) {
  return (
    <form action={disconnectIntegration}>
      <input type="hidden" name="id" value={id} />
      <SubmitButton size="sm" variant="danger" pendingLabel="Disconnecting…">
        Disconnect
      </SubmitButton>
    </form>
  );
}
