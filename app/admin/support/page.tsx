import { createClient } from "@/lib/supabase/server";
import { ReplyToTicketForm } from "@/components/admin/ReplyToTicketForm";

type TicketRow = {
  id: string; subject: string; message: string; status: string; admin_reply: string | null; created_at: string;
  organizations: { name: string } | { name: string }[] | null;
};

export default async function AdminSupportPage() {
  const supabase = createClient();
  const { data: tickets } = await supabase
    .from("support_tickets")
    .select("id,subject,message,status,admin_reply,created_at,organizations(name)")
    .order("created_at", { ascending: false })
    .limit(100);

  const rows: TicketRow[] = tickets ?? [];
  const open = rows.filter((t) => t.status === "open");
  const resolved = rows.filter((t) => t.status !== "open");

  return (
    <div>
      <h1 className="text-xl font-bold mb-6">Support tickets</h1>
      <p className="text-sm text-ink-400 mb-4">{open.length} open</p>
      <div className="flex flex-col gap-3 mb-8">
        {open.map((t) => {
          const org = Array.isArray(t.organizations) ? t.organizations[0] : t.organizations;
          return (
            <div key={t.id} className="neon-card p-4">
              <div className="flex justify-between items-start">
                <div>
                  <b className="text-sm">{t.subject}</b>
                  <p className="text-xs text-ink-600">{org?.name ?? "Unknown org"} · {new Date(t.created_at).toLocaleString()}</p>
                </div>
                <span className="text-xs text-neon-cyan">open</span>
              </div>
              <p className="text-sm text-ink-400 mt-2">{t.message}</p>
              <ReplyToTicketForm ticketId={t.id} />
            </div>
          );
        })}
        {open.length === 0 && <p className="text-sm text-ink-600">No open tickets.</p>}
      </div>
      <p className="text-sm text-ink-400 mb-4">{resolved.length} resolved</p>
      <div className="flex flex-col gap-2">
        {resolved.map((t) => {
          const org = Array.isArray(t.organizations) ? t.organizations[0] : t.organizations;
          return (
            <div key={t.id} className="rounded-lg border border-base-700 p-3 text-sm">
              <span className="text-ink-100">{t.subject}</span>
              <span className="text-ink-600 text-xs ml-2">{org?.name ?? "Unknown org"} · resolved</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
