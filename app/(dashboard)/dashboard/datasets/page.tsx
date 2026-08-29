import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getOrgContext } from "@/lib/data/org-context";

export default async function DatasetsPage() {
  const ctx = await getOrgContext();
  const supabase = createClient();

  const { data: datasets } = await supabase
    .from("datasets")
    .select("id, agent_id, row_count, target_column, created_at, agents(name)")
    .eq("org_id", ctx.orgId)
    .order("created_at", { ascending: false });

  return (
    <div className="max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Datasets</h1>
        <Link href="/dashboard/create/ml" className="btn-primary">
          Train New Model
        </Link>
      </div>

      {!datasets || datasets.length === 0 ? (
        <div className="neon-card p-8 text-center text-ink-400">
          No datasets uploaded yet — datasets are created automatically when you train an ML
          Agent.
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {datasets.map((d) => (
            <Link
              key={d.id}
              href={`/dashboard/agents/${d.agent_id}`}
              className="neon-card p-4 flex items-center justify-between hover:border-neon-cyan/40 transition-colors"
            >
              <div>
                <p className="font-medium">
                  {(d.agents as unknown as { name: string } | null)?.name ?? "Untitled agent"}
                </p>
                <p className="text-xs text-ink-600">
                  {d.row_count} rows · target: {d.target_column}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
