import { createClient } from "@/lib/supabase/server";
import { getOrgContext } from "@/lib/data/org-context";
import { PlatformPage } from "@/components/dashboard/PlatformPage";
import { MarkReadButton } from "@/components/dashboard/MarkReadButton";

export default async function NotificationsPage() {
  const c = await getOrgContext();
  const s = createClient();
  const { data: notifications } = await s
    .from("notifications")
    .select("id,title,body,read_at,created_at")
    .eq("org_id", c.orgId)
    .order("created_at", { ascending: false })
    .limit(50);

  return (
    <PlatformPage eyebrow="Manage" title="Notifications" description="Updates from the Techtig team, including support replies.">
      <div className="flex flex-col gap-3">
        {(notifications ?? []).map((n) => (
          <div key={n.id} className={`neon-card p-4 ${n.read_at ? "opacity-60" : ""}`}>
            <div className="flex justify-between items-start gap-4">
              <div>
                <b className="text-sm">{n.title}</b>
                <p className="mt-1 text-xs text-ink-400">{n.body}</p>
                <p className="text-xs text-ink-600 mt-1">{new Date(n.created_at).toLocaleString()}</p>
              </div>
              {!n.read_at && <MarkReadButton notificationId={n.id} />}
            </div>
          </div>
        ))}
        {(!notifications || notifications.length === 0) && <p className="text-sm text-ink-600">No notifications yet.</p>}
      </div>
    </PlatformPage>
  );
}
