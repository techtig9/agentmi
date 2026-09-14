import { Blocks } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getOrgContext } from "@/lib/data/org-context";
import { PlatformPage } from "@/components/dashboard/PlatformPage";
import { IntegrationForm, DisconnectIntegration, SUPPORTED_PROVIDERS } from "./IntegrationForms";
import { StatusBadge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/States";
import { formatRelativeTime } from "@/lib/data/run-metrics";

export default async function IntegrationsPage() {
  const ctx = await getOrgContext();
  const db = createClient();

  const [{ data: integrations }, { data: secrets }] = await Promise.all([
    db
      .from("integrations")
      .select("id,name,provider,status,config,created_at")
      .eq("org_id", ctx.orgId)
      .order("created_at", { ascending: false }),
    db
      .from("agent_secrets")
      .select("id,name,provider")
      .eq("org_id", ctx.orgId)
      .is("revoked_at", null),
  ]);

  const rows = integrations ?? [];

  return (
    <PlatformPage
      eyebrow="Workspace"
      title="Integrations"
      description="Connect external services using organization-scoped secret references. Each connection is verified against the real provider before it is marked connected."
    >
      <section aria-label="Available providers" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {SUPPORTED_PROVIDERS.map((provider) => {
          const Icon = provider.icon;
          const connected = rows.filter(
            (row) => row.provider === provider.id && row.status === "connected"
          ).length;
          return (
            <div key={provider.id} className="neon-card p-5">
              <div className="flex items-start justify-between gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-base-700 bg-base-900">
                  <Icon size={16} className="text-neon-cyan" aria-hidden="true" />
                </span>
                <span className="font-mono text-[10px] uppercase tracking-wider text-ink-600">
                  {provider.category}
                </span>
              </div>
              <h3 className="mt-3.5 font-display font-bold">{provider.label}</h3>
              <p className="mt-1 text-xs text-ink-600">
                {connected > 0
                  ? `${connected} connected`
                  : provider.needs === "secret"
                    ? "Needs a secret"
                    : "Needs a URL"}
              </p>
            </div>
          );
        })}
      </section>

      <div className="mt-6">
        <IntegrationForm secretIds={secrets ?? []} />
      </div>

      <div className="neon-card mt-6 p-5">
        <h2 className="mb-5 text-lg font-bold">Connections</h2>
        {rows.length === 0 ? (
          <EmptyState
            icon={Blocks}
            title="No integrations connected"
            description="Connect Slack, GitHub or any HTTP endpoint above. Credentials are read from your secrets vault and never stored in plain text."
          />
        ) : (
          <ul className="divide-y divide-base-700">
            {rows.map((row) => {
              const config = (row.config ?? {}) as Record<string, unknown>;
              const detail =
                typeof config.verified_detail === "string" ? config.verified_detail : null;
              return (
                <li key={row.id} className="flex flex-wrap items-center justify-between gap-3 py-3.5">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="truncate font-medium">{row.name}</span>
                      <span className="font-mono text-[11px] uppercase text-ink-600">
                        {row.provider}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-ink-600">
                      {detail ? `${detail} · ` : ""}connected {formatRelativeTime(row.created_at)}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    {/* Reflects the stored status rather than colouring everything green. */}
                    <StatusBadge status={row.status} />
                    {row.status === "connected" && <DisconnectIntegration id={row.id} />}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </PlatformPage>
  );
}
