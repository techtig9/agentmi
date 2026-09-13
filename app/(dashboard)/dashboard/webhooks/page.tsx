import { Webhook } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getOrgContext } from "@/lib/data/org-context";
import { PlatformPage } from "@/components/dashboard/PlatformPage";
import { CreateWebhookForm } from "@/components/dashboard/CreateWebhookForm";
import { StatusBadge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/States";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/Table";
import { formatRelativeTime } from "@/lib/data/run-metrics";

/** Bounded scan — enough to show real delivery health without an unbounded read. */
const DELIVERY_LOOKBACK = 500;

export default async function WebhooksPage() {
  const ctx = await getOrgContext();
  const db = createClient();

  const { data: endpoints } = await db
    .from("webhook_endpoints")
    .select("id, url, subscribed_events, is_active, created_at")
    .eq("org_id", ctx.orgId)
    .order("created_at", { ascending: false });

  const endpointIds = (endpoints ?? []).map((e) => e.id);

  // Deliveries are scoped by endpoint id, and those ids came from an
  // org-filtered query — so this cannot read another organization's deliveries.
  const { data: deliveries } = endpointIds.length
    ? await db
        .from("webhook_deliveries")
        .select("id, endpoint_id, event, response_status, attempted_at, succeeded")
        .in("endpoint_id", endpointIds)
        .order("attempted_at", { ascending: false })
        .limit(DELIVERY_LOOKBACK)
    : { data: [] as never[] };

  const stats = new Map<string, { total: number; failed: number; lastAt: string | null }>();
  for (const delivery of deliveries ?? []) {
    const current = stats.get(delivery.endpoint_id) ?? { total: 0, failed: 0, lastAt: null };
    current.total += 1;
    if (!delivery.succeeded) current.failed += 1;
    if (current.lastAt === null) current.lastAt = delivery.attempted_at;
    stats.set(delivery.endpoint_id, current);
  }

  const endpointUrl = new Map((endpoints ?? []).map((e) => [e.id, e.url]));

  return (
    <PlatformPage
      eyebrow="Deploy"
      title="Webhooks"
      description="Outbound events when your agents change state. Every delivery is HMAC-signed — verify the signature before trusting a payload."
      action={{ href: "/dashboard/api", label: "API reference" }}
    >
      <CreateWebhookForm />

      <section className="mt-6">
        <h2 className="mb-4 text-lg font-bold">Endpoints</h2>
        {(endpoints ?? []).length === 0 ? (
          <EmptyState
            icon={Webhook}
            title="No webhook endpoints"
            description="Register a URL above and Agentmi will POST a signed event to it whenever a subscribed thing happens."
          />
        ) : (
          <div className="space-y-3">
            {(endpoints ?? []).map((endpoint) => {
              const stat = stats.get(endpoint.id) ?? { total: 0, failed: 0, lastAt: null };
              return (
                <div key={endpoint.id} className="rounded-xl border border-base-700 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <code className="block break-all font-mono text-xs text-ink-100">
                        {endpoint.url}
                      </code>
                      <p className="mt-2 text-xs text-ink-600">
                        {endpoint.subscribed_events.join(" · ")}
                      </p>
                    </div>
                    <StatusBadge status={endpoint.is_active ? "active" : "paused"} />
                  </div>
                  <dl className="mt-4 flex flex-wrap gap-x-5 gap-y-1.5 border-t border-base-700 pt-3 font-mono text-[11px] text-ink-600">
                    <div className="flex gap-1.5">
                      <dt>Deliveries</dt>
                      <dd className="text-ink-400">{stat.total}</dd>
                    </div>
                    <div className="flex gap-1.5">
                      <dt>Failed</dt>
                      <dd className={stat.failed > 0 ? "text-neon-pink" : "text-ink-400"}>
                        {stat.failed}
                      </dd>
                    </div>
                    <div className="flex gap-1.5">
                      <dt>Last attempt</dt>
                      <dd className="text-ink-400">
                        {stat.lastAt ? formatRelativeTime(stat.lastAt) : "Never"}
                      </dd>
                    </div>
                  </dl>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section className="mt-8">
        <h2 className="mb-1 text-lg font-bold">Recent deliveries</h2>
        <p className="mb-4 text-xs text-ink-600">
          The last {DELIVERY_LOOKBACK} attempts across every endpoint.
        </p>
        {(deliveries ?? []).length === 0 ? (
          <EmptyState
            icon={Webhook}
            title="No deliveries yet"
            description="Once a subscribed event fires, each attempt and the status your endpoint returned will be listed here."
          />
        ) : (
          <div className="neon-card p-5">
            <Table caption="Recent webhook delivery attempts">
              <THead>
                <TR>
                  <TH>Event</TH>
                  <TH>Endpoint</TH>
                  <TH>Result</TH>
                  <TH align="right">Response</TH>
                  <TH align="right">Attempted</TH>
                </TR>
              </THead>
              <TBody>
                {(deliveries ?? []).slice(0, 100).map((delivery) => (
                  <TR key={delivery.id}>
                    <TD mono>{delivery.event}</TD>
                    <TD>
                      <span className="block max-w-[18rem] truncate font-mono text-xs">
                        {endpointUrl.get(delivery.endpoint_id) ?? "Removed endpoint"}
                      </span>
                    </TD>
                    <TD>
                      <StatusBadge status={delivery.succeeded ? "succeeded" : "failed"} />
                    </TD>
                    <TD align="right" mono>
                      {delivery.response_status ?? "—"}
                    </TD>
                    <TD align="right" mono>
                      {formatRelativeTime(delivery.attempted_at)}
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          </div>
        )}
      </section>
    </PlatformPage>
  );
}
