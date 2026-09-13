import { KeyRound } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getOrgContext } from "@/lib/data/org-context";
import { PlatformPage } from "@/components/dashboard/PlatformPage";
import { CreateApiKeyForm } from "@/components/dashboard/CreateApiKeyForm";
import { ApiKeyRow, type ApiKeyItem } from "@/components/dashboard/ApiKeyRow";
import { EmptyState } from "@/components/ui/States";

export default async function ApiKeysPage() {
  const ctx = await getOrgContext();
  const db = createClient();

  const { data: keys } = await db
    .from("api_keys")
    .select("id, name, display_prefix, created_at, last_used_at, revoked_at")
    .eq("org_id", ctx.orgId)
    .order("created_at", { ascending: false });

  const items: ApiKeyItem[] = (keys ?? []).map((key) => ({
    id: key.id,
    name: key.name,
    displayPrefix: key.display_prefix,
    createdAt: key.created_at,
    lastUsedAt: key.last_used_at,
    revokedAt: key.revoked_at,
  }));

  const active = items.filter((key) => key.revokedAt === null);
  const revoked = items.filter((key) => key.revokedAt !== null);
  const canManage = ctx.isAdmin || ctx.role === "owner" || ctx.role === "admin";

  return (
    <PlatformPage
      eyebrow="Deploy"
      title="API Keys"
      description="Workspace-scoped bearer tokens for the public API. Only a hash is stored, so a secret is shown exactly once when it is created or rotated."
      action={{ href: "/dashboard/api", label: "API reference" }}
    >
      {canManage ? (
        <CreateApiKeyForm />
      ) : (
        <p className="rounded-lg border border-base-700 bg-base-900/60 p-4 text-sm text-ink-400">
          Only an organization owner or admin can create API keys.
        </p>
      )}

      <section className="mt-6">
        <h2 className="mb-4 text-lg font-bold">Active keys</h2>
        {active.length === 0 ? (
          <EmptyState
            icon={KeyRound}
            title="No active API keys"
            description="Create a key to call your agents and deployments from your own product."
          />
        ) : (
          <div className="space-y-3">
            {active.map((key) => (
              <ApiKeyRow key={key.id} apiKey={key} canManage={canManage} />
            ))}
          </div>
        )}
      </section>

      {revoked.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-1 text-lg font-bold">Revoked keys</h2>
          <p className="mb-4 text-xs text-ink-600">
            Kept for the audit trail. These no longer authenticate anything.
          </p>
          <div className="space-y-3 opacity-60">
            {revoked.map((key) => (
              <ApiKeyRow key={key.id} apiKey={key} canManage={canManage} />
            ))}
          </div>
        </section>
      )}
    </PlatformPage>
  );
}
