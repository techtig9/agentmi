import Link from "next/link";
import { ListChecks } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getOrgContext } from "@/lib/data/org-context";
import { PlatformPage } from "@/components/dashboard/PlatformPage";
import { StatusBadge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/States";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/Table";
import { RunFilters } from "@/components/dashboard/RunFilters";
import { formatDuration, formatRelativeTime, rangeOption, rangeStart } from "@/lib/data/run-metrics";

const PAGE_SIZE = 50;

/** A run started from a deployment came from the API; anything else was a dashboard test. */
function triggerOf(deploymentId: string | null): string {
  return deploymentId ? "API" : "Dashboard";
}

export default async function RunsPage({
  searchParams,
}: {
  searchParams: { agent?: string; status?: string; range?: string; page?: string };
}) {
  const ctx = await getOrgContext();
  const db = createClient();

  const range = rangeOption(searchParams.range);
  const page = Math.max(1, Number.parseInt(searchParams.page ?? "1", 10) || 1);
  const from = (page - 1) * PAGE_SIZE;

  let query = db
    .from("agent_runs")
    .select("id, agent_id, deployment_id, status, duration_ms, created_at, agents(name)", {
      count: "exact",
    })
    .eq("org_id", ctx.orgId)
    .gte("created_at", rangeStart(range.id))
    .order("created_at", { ascending: false })
    .range(from, from + PAGE_SIZE - 1);

  // Filters are applied in the query, not after fetching, so paging stays correct.
  if (searchParams.agent) query = query.eq("agent_id", searchParams.agent);
  if (searchParams.status) query = query.eq("status", searchParams.status);

  const [{ data: runs, count }, { data: agents }] = await Promise.all([
    query,
    db.from("agents").select("id, name").eq("org_id", ctx.orgId).order("name"),
  ]);

  const rows = runs ?? [];
  const total = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <PlatformPage
      eyebrow="Quality"
      title="Runs"
      description="Every execution, from the playground and from the API, with its outcome, duration and trace."
    >
      <RunFilters
        agents={agents ?? []}
        selected={{
          agent: searchParams.agent ?? "",
          status: searchParams.status ?? "",
          range: range.id,
        }}
      />

      <p className="mb-4 text-xs text-ink-600" role="status">
        {total.toLocaleString()} {total === 1 ? "run" : "runs"} in the last {range.label}
        {totalPages > 1 && ` · page ${page} of ${totalPages}`}
      </p>

      {rows.length === 0 ? (
        <EmptyState
          icon={ListChecks}
          title="No runs match"
          description="Test an agent in the playground or call a deployment over the API — every execution is recorded here with its full trace."
        />
      ) : (
        <>
          <div className="neon-card p-5">
            <Table caption="Recorded agent runs">
              <THead>
                <TR>
                  <TH>Run</TH>
                  <TH>Agent</TH>
                  <TH>Status</TH>
                  <TH align="right">Duration</TH>
                  <TH>Trigger</TH>
                  <TH align="right">Started</TH>
                </TR>
              </THead>
              <TBody>
                {rows.map((run) => {
                  const embed = run.agents as unknown as { name: string } | { name: string }[] | null;
                  const agentName =
                    (Array.isArray(embed) ? embed[0]?.name : embed?.name) ?? "Deleted agent";
                  return (
                    <TR key={run.id}>
                      <TD mono>
                        <Link
                          href={`/dashboard/runs/${run.id}`}
                          className="text-neon-cyan hover:underline"
                        >
                          {run.id.slice(0, 8)}
                        </Link>
                      </TD>
                      <TD>{agentName}</TD>
                      <TD>
                        <StatusBadge status={run.status} />
                      </TD>
                      <TD align="right" mono>
                        {formatDuration(run.duration_ms)}
                      </TD>
                      <TD mono>{triggerOf(run.deployment_id)}</TD>
                      <TD align="right" mono>
                        {formatRelativeTime(run.created_at)}
                      </TD>
                    </TR>
                  );
                })}
              </TBody>
            </Table>
          </div>

          {totalPages > 1 && (
            <nav aria-label="Pagination" className="mt-4 flex items-center justify-between gap-3">
              <PageLink
                page={page - 1}
                disabled={page <= 1}
                params={searchParams}
                label="Previous"
              />
              <span className="font-mono text-xs text-ink-600">
                {page} / {totalPages}
              </span>
              <PageLink
                page={page + 1}
                disabled={page >= totalPages}
                params={searchParams}
                label="Next"
              />
            </nav>
          )}
        </>
      )}
    </PlatformPage>
  );
}

function PageLink({
  page,
  disabled,
  params,
  label,
}: {
  page: number;
  disabled: boolean;
  params: Record<string, string | undefined>;
  label: string;
}) {
  if (disabled) {
    return (
      <span aria-disabled="true" className="btn-secondary pointer-events-none opacity-40">
        {label}
      </span>
    );
  }
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value && key !== "page") query.set(key, value);
  }
  query.set("page", String(page));
  return (
    <Link href={`/dashboard/runs?${query.toString()}`} className="btn-secondary">
      {label}
    </Link>
  );
}
