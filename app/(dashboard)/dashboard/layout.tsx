import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { getOrgContext } from "@/lib/data/org-context";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const ctx = await getOrgContext();
  const supabase = createClient();
  const { count: unreadNotifications } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("org_id", ctx.orgId)
    .is("read_at", null);

  return (
    <DashboardShell
      isAdmin={ctx.isAdmin}
      orgName={ctx.orgName}
      plan={ctx.plan}
      creditBalance={ctx.creditBalance}
      unreadNotifications={unreadNotifications ?? 0}
    >
      {children}
    </DashboardShell>
  );
}
