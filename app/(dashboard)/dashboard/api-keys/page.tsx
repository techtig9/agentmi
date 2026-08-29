import { createClient } from "@/lib/supabase/server";
import { getOrgContext } from "@/lib/data/org-context";
import { CreateApiKeyForm } from "@/components/dashboard/CreateApiKeyForm";
import { RevokeKeyButton } from "@/components/dashboard/RevokeKeyButton";

export default async function ApiKeysPage() {
  const ctx = await getOrgContext();
  const supabase = createClient();

  const { data: keys } = await supabase
    .from("api_keys")
    .select("id, name, display_prefix, created_at, last_used_at, revoked_at")
    .eq("org_id", ctx.orgId)
    .order("created_at", { ascending: false });

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold mb-1">API Keys</h1>
      <p className="text-ink-400 text-sm mb-6">
        Use these to call the public API: <code className="font-mono text-xs">POST /api/v1/agents/&#123;id&#125;/predict</code> and{" "}
        <code className="font-mono text-xs">/chat</code>, with{" "}
        <code className="font-mono text-xs">Authorization: Bearer &lt;key&gt;</code>.
      </p>

      <div className="mb-6">
        <CreateApiKeyForm />
      </div>

      <div className="flex flex-col gap-2">
        {(keys ?? []).map((key) => (
          <div key={key.id} className="neon-card p-4 flex items-center justify-between text-sm">
            <div>
              <p className="font-medium">{key.name}</p>
              <p className="text-ink-600 font-mono text-xs">{key.display_prefix}…</p>
            </div>
            {key.revoked_at ? (
              <span className="text-ink-600 text-xs">Revoked</span>
            ) : (
              <RevokeKeyButton keyId={key.id} />
            )}
          </div>
        ))}
        {(!keys || keys.length === 0) && (
          <p className="text-ink-600 text-sm">No API keys yet.</p>
        )}
      </div>
    </div>
  );
}
