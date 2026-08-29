import { createClient } from "@/lib/supabase/server";
import { GrantCreditsForm } from "@/components/admin/GrantCreditsForm";

export default async function AdminUsersPage() {
  const supabase = createClient();

  const { data: orgs } = await supabase
    .from("organizations")
    .select("id, name, created_at, subscriptions(plan, status), credit_balances(balance)")
    .order("created_at", { ascending: false });

  return (
    <div>
      <h1 className="text-xl font-bold mb-6">Organizations</h1>
      <div className="flex flex-col gap-3">
        {(orgs ?? []).map((org) => {
          const sub = Array.isArray(org.subscriptions) ? org.subscriptions[0] : org.subscriptions;
          const balance = Array.isArray(org.credit_balances)
            ? org.credit_balances[0]
            : org.credit_balances;

          return (
            <div key={org.id} className="neon-card p-4 flex items-center justify-between gap-4">
              <div>
                <p className="font-medium">{org.name}</p>
                <p className="text-xs text-ink-600">
                  {(sub as { plan?: string })?.plan ?? "free"} ·{" "}
                  {(balance as { balance?: number })?.balance ?? 0} credits
                </p>
              </div>
              <GrantCreditsForm orgId={org.id} />
            </div>
          );
        })}
        {(!orgs || orgs.length === 0) && (
          <p className="text-ink-400 text-sm">No organizations yet.</p>
        )}
      </div>
    </div>
  );
}
