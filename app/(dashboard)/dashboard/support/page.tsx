import { createClient } from "@/lib/supabase/server";
import { getOrgContext } from "@/lib/data/org-context";
import { PlatformPage } from "@/components/dashboard/PlatformPage";
import { CreateTicketForm } from "@/components/dashboard/SupportForms";

export default async function SupportPage() {
  const c = await getOrgContext();
  const s = createClient();
  const { data: tickets } = await s
    .from("support_tickets")
    .select("id,subject,message,status,admin_reply,created_at")
    .eq("org_id", c.orgId)
    .order("created_at", { ascending: false });

  return (
    <PlatformPage eyebrow="Help" title="Support" description="Reach the Techtig team directly — replies show up here and as a notification.">
      <div className="grid lg:grid-cols-[360px_1fr] gap-6">
        <div className="neon-card p-5">
          <p className="font-bold mb-3">New request</p>
          <CreateTicketForm />
        </div>
        <div className="neon-card p-5">
          <p className="font-bold mb-4">Your requests</p>
          {(tickets ?? []).length === 0 && <p className="text-sm text-ink-600">No support requests yet.</p>}
          <div className="flex flex-col gap-3">
            {(tickets ?? []).map((t) => (
              <div key={t.id} className="rounded-lg border border-base-700 p-4">
                <div className="flex justify-between items-start">
                  <b className="text-sm">{t.subject}</b>
                  <span className={`text-xs ${t.status === "resolved" ? "text-neon-green" : "text-neon-cyan"}`}>{t.status}</span>
                </div>
                <p className="text-xs text-ink-500 mt-2">{t.message}</p>
                {t.admin_reply && (
                  <div className="mt-3 rounded-lg bg-base-900 border border-neon-cyan/20 p-3">
                    <p className="text-xs text-neon-cyan mb-1">Reply</p>
                    <p className="text-xs text-ink-400">{t.admin_reply}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </PlatformPage>
  );
}
