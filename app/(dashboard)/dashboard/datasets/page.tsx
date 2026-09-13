import Link from "next/link";
import { Database, Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getOrgContext } from "@/lib/data/org-context";
import { PlatformPage } from "@/components/dashboard/PlatformPage";
import { StatusBadge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/States";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/Table";
import { formatRelativeTime } from "@/lib/data/run-metrics";
import type { ColumnProfile } from "@/lib/ml/profile";

/**
 * Task type is inferred from the target column's own profile rather than stored
 * separately: a numeric target means regression, anything categorical or
 * boolean means classification. Unprofiled datasets say so instead of guessing.
 */
function taskTypeFor(columns: ColumnProfile[], target: string | null): string {
  if (!target) return "Not set";
  const column = columns.find((c) => c.name === target);
  if (!column) return "Unknown";
  return column.type === "numeric" ? "Regression" : "Classification";
}

export default async function DatasetsPage() {
  const ctx = await getOrgContext();
  const db = createClient();

  const { data: datasets } = await db
    .from("datasets")
    .select("id, agent_id, row_count, target_column, column_profile, created_at, agents(name, status)")
    .eq("org_id", ctx.orgId)
    .order("created_at", { ascending: false });

  const rows = datasets ?? [];

  return (
    <PlatformPage
      eyebrow="Build"
      title="Datasets"
      description="Training data behind your ML agents, with the column profile computed at upload — types, missing values and the target being predicted."
      action={{ href: "/dashboard/create/ml", label: "Train new model" }}
    >
      {rows.length === 0 ? (
        <EmptyState
          icon={Database}
          title="No datasets yet"
          description="Upload a CSV to train an ML agent. Agentmi profiles every column, suggests a target, trains a model and reports its metrics."
          action={
            <Link href="/dashboard/create/ml" className="btn-primary">
              <Plus size={16} aria-hidden="true" />
              Train an ML agent
            </Link>
          }
        />
      ) : (
        <div className="neon-card p-5">
          <Table caption="Datasets in this workspace">
            <THead>
              <TR>
                <TH>Agent</TH>
                <TH align="right">Rows</TH>
                <TH align="right">Columns</TH>
                <TH>Target</TH>
                <TH>Task</TH>
                <TH>Status</TH>
                <TH>Created</TH>
              </TR>
            </THead>
            <TBody>
              {rows.map((dataset) => {
                const agent = dataset.agents as unknown as {
                  name: string;
                  status: string;
                } | null;
                const profile = (dataset.column_profile ?? null) as {
                  columns?: ColumnProfile[];
                } | null;
                const columns = profile?.columns ?? [];
                const missing = columns.filter((c) => c.missingCount > 0).length;

                return (
                  <TR key={dataset.id}>
                    <TD>
                      {dataset.agent_id ? (
                        <Link
                          href={`/dashboard/agents/${dataset.agent_id}`}
                          className="font-medium text-ink-100 hover:text-neon-cyan"
                        >
                          {agent?.name ?? "Untitled agent"}
                        </Link>
                      ) : (
                        <span className="text-ink-600">Unlinked dataset</span>
                      )}
                    </TD>
                    <TD align="right" mono>
                      {(dataset.row_count ?? 0).toLocaleString()}
                    </TD>
                    <TD align="right" mono>
                      {columns.length || "—"}
                      {missing > 0 && (
                        <span className="ml-1.5 text-neon-amber" title={`${missing} columns have missing values`}>
                          ({missing} gappy)
                        </span>
                      )}
                    </TD>
                    <TD mono>{dataset.target_column ?? "—"}</TD>
                    <TD>{taskTypeFor(columns, dataset.target_column)}</TD>
                    <TD>{agent ? <StatusBadge status={agent.status} /> : "—"}</TD>
                    <TD mono>{formatRelativeTime(dataset.created_at)}</TD>
                  </TR>
                );
              })}
            </TBody>
          </Table>
        </div>
      )}
    </PlatformPage>
  );
}
