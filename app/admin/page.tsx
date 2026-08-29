import { createClient } from "@/lib/supabase/server";
import { PLANS } from "@/lib/pricing/plans";

export default async function AdminDashboardPage() {
  const supabase = createClient();

  const [{ count: orgCount }, { count: aiAgentCount }, { count: mlAgentCount }, { data: subs }] =
    await Promise.all([
      supabase.from("organizations").select("id", { count: "exact", head: true }),
      supabase.from("agents").select("id", { count: "exact", head: true }).eq("kind", "ai"),
      supabase.from("agents").select("id", { count: "exact", head: true }).eq("kind", "ml"),
      supabase.from("subscriptions").select("plan, cycle").eq("status", "active"),
    ]);

  // Approximate MRR from active subscriptions — informational only; Paddle
  // remains the source of truth for actual billed amounts.
  const mrrCents = (subs ?? []).reduce((sum, s) => {
    const plan = PLANS[s.plan as keyof typeof PLANS];
    if (!plan) return sum;
    const monthlyEquivalent = s.cycle === "yearly" ? plan.price.yearly / 12 : plan.price.monthly;
    return sum + monthlyEquivalent;
  }, 0);

  const planCounts = (subs ?? []).reduce<Record<string, number>>((acc, s) => {
    acc[s.plan] = (acc[s.plan] ?? 0) + 1;
    return acc;
  }, {});

  const stats = [
    { label: "Organizations", value: orgCount ?? 0 },
    { label: "AI Agents built", value: aiAgentCount ?? 0 },
    { label: "ML Agents built", value: mlAgentCount ?? 0 },
    { label: "Est. MRR", value: `$${(mrrCents / 100).toFixed(2)}` },
  ];

  return (
    <div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {stats.map((s) => (
          <div key={s.label} className="neon-card p-5">
            <p className="text-ink-400 text-sm mb-1">{s.label}</p>
            <p className="text-2xl font-display font-bold">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="neon-card p-5">
        <p className="text-ink-400 text-sm mb-3">Active subscriptions by plan</p>
        <div className="flex gap-4">
          {Object.entries(planCounts).map(([plan, count]) => (
            <div key={plan} className="text-sm">
              <span className="capitalize text-ink-100">{plan}</span>
              <span className="text-ink-600"> — {count}</span>
            </div>
          ))}
          {Object.keys(planCounts).length === 0 && (
            <span className="text-ink-600 text-sm">No active paid subscriptions yet.</span>
          )}
        </div>
      </div>
    </div>
  );
}
