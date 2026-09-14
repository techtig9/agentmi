import { Lock } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getOrgContext } from "@/lib/data/org-context";
import { PlatformPage } from "@/components/dashboard/PlatformPage";
import { SecretCreateForm, RevokeSecretButton } from "./SecretForms";
import { StatusBadge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/States";
import { formatRelativeTime } from "@/lib/data/run-metrics";

export default async function SecretsPage() {
  const ctx = await getOrgContext();
  const db = createClient();

  const [{ data: secrets }, { data: tools }, { data: integrations }] = await Promise.all([
    // secret_ref is the environment variable NAME, never a credential value —
    // showing it tells an admin which variable to set without exposing anything.
    db
      .from("agent_secrets")
      .select("id, name, provider, secret_ref, created_at, revoked_at")
      .eq("org_id", ctx.orgId)
      .order("created_at", { ascending: false }),
    db.from("agent_tools").select("id, name, config").eq("org_id", ctx.orgId),
    db.from("integrations").select("id, name, secret_id").eq("org_id", ctx.orgId),
  ]);

  // "Used by" is computed from real references, so revoking a secret shows you
  // exactly what will break.
  const usage = new Map<string, string[]>();
  for (const tool of tools ?? []) {
    const config = (tool.config ?? {}) as Record<string, unknown>;
    const secretId = typeof config.secret_id === "string" ? config.secret_id : null;
    if (!secretId) continue;
    usage.set(secretId, [...(usage.get(secretId) ?? []), `Tool: ${tool.name}`]);
  }
  for (const integration of integrations ?? []) {
    if (!integration.secret_id) continue;
    usage.set(integration.secret_id, [
      ...(usage.get(integration.secret_id) ?? []),
      `Integration: ${integration.name}`,
    ]);
  }

  const rows = secrets ?? [];

  return (
    <PlatformPage
      eyebrow="Manage"
      title="Secrets"
      description="References to credentials held outside the database. Agentmi stores the name of the variable, never the value, so a secret cannot be read back from here or from the browser."
    >
      <SecretCreateForm />

      <div className="mt-6">
        {rows.length === 0 ? (
          <EmptyState
            icon={Lock}
            title="No secrets stored"
            description="Add a reference so tools and integrations can authenticate without a credential ever appearing in a prompt, a config field or client-side code."
          />
        ) : (
          <div className="space-y-3">
            {rows.map((secret) => {
              const usedBy = usage.get(secret.id) ?? [];
              const revoked = secret.revoked_at !== null;
              return (
                <div key={secret.id} className="rounded-xl border border-base-700 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate font-medium">{secret.name}</p>
                        <StatusBadge status={revoked ? "revoked" : "active"} />
                        <span className="font-mono text-[11px] uppercase text-ink-600">
                          {secret.provider}
                        </span>
                      </div>
                      <p className="mt-1.5 font-mono text-xs text-ink-600">
                        reads {secret.secret_ref} · added {formatRelativeTime(secret.created_at)}
                      </p>
                      <p className="mt-2 text-xs text-ink-600">
                        {usedBy.length === 0 ? (
                          "Not referenced by any tool or integration."
                        ) : (
                          <>Used by {usedBy.join(", ")}</>
                        )}
                      </p>
                    </div>
                    {!revoked && <RevokeSecretButton id={secret.id} />}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </PlatformPage>
  );
}
