import { createClient } from "@/lib/supabase/server";
import { getOrgContext } from "@/lib/data/org-context";
import { CreateWebhookForm } from "@/components/dashboard/CreateWebhookForm";

export default async function WebhooksPage() {
  const ctx = await getOrgContext();
  const supabase = createClient();

  const { data: endpoints } = await supabase
    .from("webhook_endpoints")
    .select("id, url, subscribed_events, is_active, created_at")
    .eq("org_id", ctx.orgId)
    .order("created_at", { ascending: false });

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold mb-1">Webhooks</h1>
      <p className="text-ink-400 text-sm mb-6">
        Get notified when your agents change state. Every delivery is signed —
        verify it with the HMAC scheme in the docs before trusting the payload.
      </p>

      <div className="mb-6">
        <CreateWebhookForm />
      </div>

      <div className="flex flex-col gap-2">
        {(endpoints ?? []).map((e) => (
          <div key={e.id} className="neon-card p-4 text-sm">
            <div className="flex items-center justify-between">
              <code className="font-mono text-xs break-all">{e.url}</code>
              <span className={e.is_active ? "text-neon-green text-xs" : "text-ink-600 text-xs"}>
                {e.is_active ? "Active" : "Inactive"}
              </span>
            </div>
            <p className="text-ink-600 text-xs mt-1">{e.subscribed_events.join(", ")}</p>
          </div>
        ))}
        {(!endpoints || endpoints.length === 0) && (
          <p className="text-ink-600 text-sm">No webhook endpoints yet.</p>
        )}
      </div>
    </div>
  );
}
