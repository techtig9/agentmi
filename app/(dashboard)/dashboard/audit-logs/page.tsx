import Link from "next/link";
import { ScrollText } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getOrgContext } from "@/lib/data/org-context";
import { PlatformPage } from "@/components/dashboard/PlatformPage";
import { EmptyState } from "@/components/ui/States";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/Table";
import { rangeOption, rangeStart, RANGE_OPTIONS } from "@/lib/data/run-metrics";
import { RangeTabs } from "@/components/ui/Chart";

const PAGE_LIMIT = 200;

export default async function AuditLogsPage({
  searchParams,
}: {
  searchParams: { action?: string; range?: string };
}) {
  const ctx = await getOrgContext();
  const db = createClient();
  const range = rangeOption(searchParams.range);

  let query = db
    .from("audit_logs")
    .select("id, action, metadata, actor_id, created_at")
    .eq("org_id", ctx.orgId)
    .gte("created_at", rangeStart(range.id))
    .order("created_at", { ascending: false })
    .limit(PAGE_LIMIT);

  if (searchParams.action) query = query.eq("action", searchParams.action);

  const [{ data: logs }, { data: allActions }, { data: memberships }] = await Promise.all([
    query,
    // The action list must not be derived from the filtered page, or filtering
    // to one action would leave you with no way back to the others.
    db
      .from("audit_logs")
      .select("action")
      .eq("org_id", ctx.orgId)
      .gte("created_at", rangeStart(range.id))
      .limit(1000),
    db.from("memberships").select("user_id, profiles(id)").eq("org_id", ctx.orgId),
  ]);

  const rows = logs ?? [];
  const actions = [...new Set((allActions ?? []).map((a) => a.action))].sort();
  const memberIds = new Set((memberships ?? []).map((m) => m.user_id));

  return (
    <PlatformPage
      eyebrow="Manage"
      title="Audit Logs"
      description="Configuration, deployment and security-sensitive changes in this organization, with the account that made each one."
    >
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-ink-600">
          {rows.length >= PAGE_LIMIT
            ? `Showing the ${PAGE_LIMIT} most recent entries`
            : `${rows.length} ${rows.length === 1 ? "entry" : "entries"}`}{" "}
          in the last {range.label}.
        </p>
        <RangeTabs options={RANGE_OPTIONS} active={range.id} basePath="/dashboard/audit-logs" />
      </div>

      {actions.length > 0 && (
        <nav aria-label="Filter by action" className="mb-5 flex flex-wrap gap-2">
          {actions.map((action) => {
            const active = searchParams.action === action;
            return (
              <Link
                key={action}
                href={`/dashboard/audit-logs?action=${encodeURIComponent(action)}&range=${range.id}`}
                aria-current={active ? "page" : undefined}
                className={`rounded-lg border px-3 py-1.5 font-mono text-xs transition-colors ${
                  active
                    ? "border-neon-cyan/40 bg-neon-cyan/10 text-neon-cyan"
                    : "border-base-700 text-ink-400 hover:border-neon-cyan/40 hover:text-ink-100"
                }`}
              >
                {action.replace(/_/g, " ")}
              </Link>
            );
          })}
          {searchParams.action && (
            <Link
              href={`/dashboard/audit-logs?range=${range.id}`}
              className="px-3 py-1.5 text-xs text-neon-cyan hover:underline"
            >
              Clear filter
            </Link>
          )}
        </nav>
      )}

      {rows.length === 0 ? (
        <EmptyState
          icon={ScrollText}
          title="No audit events"
          description="Creating agents, issuing keys, connecting integrations and changing deployments are all recorded here."
        />
      ) : (
        <div className="neon-card p-5">
          <Table caption="Audit log entries">
            <THead>
              <TR>
                <TH>Action</TH>
                <TH>Actor</TH>
                <TH>Details</TH>
                <TH align="right">When</TH>
              </TR>
            </THead>
            <TBody>
              {rows.map((entry) => (
                <TR key={entry.id}>
                  <TD mono>{entry.action.replace(/_/g, " ")}</TD>
                  <TD>
                    {entry.actor_id === ctx.userId
                      ? "You"
                      : entry.actor_id && memberIds.has(entry.actor_id)
                        ? "Team member"
                        : "System"}
                  </TD>
                  <TD>
                    <MetadataSummary metadata={entry.metadata} />
                  </TD>
                  <TD align="right" mono>
                    <time dateTime={entry.created_at}>
                      {new Date(entry.created_at).toLocaleString()}
                    </time>
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        </div>
      )}
    </PlatformPage>
  );
}

/**
 * Renders metadata as readable key/value pairs, with the raw JSON behind a
 * disclosure. Dumping `JSON.stringify` straight into the row, as this page used
 * to, made every entry an unreadable wall of braces.
 */
function MetadataSummary({ metadata }: { metadata: unknown }) {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return <span className="text-ink-600">—</span>;
  }
  const entries = Object.entries(metadata as Record<string, unknown>);
  if (entries.length === 0) return <span className="text-ink-600">—</span>;

  return (
    <details>
      <summary className="cursor-pointer text-xs text-ink-400 hover:text-ink-100">
        {entries.length} {entries.length === 1 ? "field" : "fields"}
      </summary>
      <dl className="mt-2 space-y-1">
        {entries.map(([key, value]) => (
          <div key={key} className="flex gap-2 font-mono text-[11px]">
            <dt className="shrink-0 text-ink-600">{key}</dt>
            <dd className="min-w-0 break-all text-ink-400">
              {typeof value === "object" ? JSON.stringify(value) : String(value)}
            </dd>
          </div>
        ))}
      </dl>
    </details>
  );
}
