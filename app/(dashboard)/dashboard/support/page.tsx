import { LifeBuoy, MessageSquare } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getOrgContext } from "@/lib/data/org-context";
import { PlatformPage } from "@/components/dashboard/PlatformPage";
import { CreateTicketForm } from "@/components/dashboard/SupportForms";
import { MetricCard } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/States";
import { formatRelativeTime } from "@/lib/data/run-metrics";

export default async function SupportPage({
  searchParams,
}: {
  searchParams: { status?: string };
}) {
  const ctx = await getOrgContext();
  const db = createClient();

  const { data: tickets } = await db
    .from("support_tickets")
    .select("id, subject, message, status, admin_reply, created_at, updated_at")
    .eq("org_id", ctx.orgId)
    .order("updated_at", { ascending: false });

  const all = tickets ?? [];
  const open = all.filter((t) => t.status === "open");
  const resolved = all.filter((t) => t.status === "resolved");

  const filter = searchParams.status === "open" || searchParams.status === "resolved"
    ? searchParams.status
    : "all";
  const visible = filter === "all" ? all : all.filter((t) => t.status === filter);

  return (
    <PlatformPage
      eyebrow="Help"
      title="Support"
      description="Reach the Techtig team directly. Replies appear on the request here and as a notification."
      action={{ href: "/dashboard/docs", label: "Read the docs" }}
    >
      <section aria-label="Request summary" className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-3">
        <MetricCard label="Open" value={open.length} icon={MessageSquare} tone={open.length > 0 ? "warning" : "default"} />
        <MetricCard label="Resolved" value={resolved.length} icon={LifeBuoy} tone="success" />
        <MetricCard
          label="Last update"
          value={all[0] ? formatRelativeTime(all[0].updated_at ?? all[0].created_at) : "—"}
          hint={all.length === 0 ? "No requests yet" : undefined}
        />
      </section>

      <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
        <div className="neon-card h-fit p-5">
          <h2 className="mb-1 font-display font-bold">New request</h2>
          <p className="mb-4 text-xs text-ink-600">
            Include what you were doing and what happened — it saves a round trip.
          </p>
          <CreateTicketForm />
        </div>

        <div className="neon-card p-5">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-bold">Your requests</h2>
            <nav aria-label="Filter requests" className="flex flex-wrap gap-1.5">
              {(
                [
                  ["all", `All (${all.length})`],
                  ["open", `Open (${open.length})`],
                  ["resolved", `Resolved (${resolved.length})`],
                ] as const
              ).map(([id, label]) => (
                <a
                  key={id}
                  href={id === "all" ? "/dashboard/support" : `/dashboard/support?status=${id}`}
                  aria-current={filter === id ? "page" : undefined}
                  className={`rounded-lg border px-3 py-1.5 text-xs transition-colors ${
                    filter === id
                      ? "border-neon-cyan/40 bg-neon-cyan/10 text-neon-cyan"
                      : "border-base-700 text-ink-400 hover:border-neon-cyan/40 hover:text-ink-100"
                  }`}
                >
                  {label}
                </a>
              ))}
            </nav>
          </div>

          {visible.length === 0 ? (
            <EmptyState
              icon={LifeBuoy}
              title={all.length === 0 ? "No requests yet" : "Nothing in this view"}
              description={
                all.length === 0
                  ? "Ask anything about building, deploying or billing — a real person reads these."
                  : "Switch the filter to see your other requests."
              }
            />
          ) : (
            <ul className="space-y-3">
              {visible.map((ticket) => (
                <li key={ticket.id} className="rounded-xl border border-base-700 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium">{ticket.subject}</p>
                      <p className="mt-1 font-mono text-[11px] text-ink-600">
                        opened {formatRelativeTime(ticket.created_at)}
                        {ticket.updated_at && ticket.updated_at !== ticket.created_at && (
                          <> · updated {formatRelativeTime(ticket.updated_at)}</>
                        )}
                      </p>
                    </div>
                    <StatusBadge status={ticket.status === "resolved" ? "succeeded" : "pending"} />
                  </div>

                  {/* Conversation: your message, then the reply if one has come back. */}
                  <div className="mt-4 space-y-3">
                    <div className="rounded-lg border border-base-700 bg-base-900 p-3">
                      <p className="mb-1.5 font-mono text-[10px] uppercase tracking-wider text-ink-600">
                        You
                      </p>
                      <p className="whitespace-pre-wrap text-sm text-ink-400">{ticket.message}</p>
                    </div>

                    {ticket.admin_reply ? (
                      <div className="rounded-lg border border-neon-cyan/25 bg-neon-cyan/5 p-3">
                        <p className="mb-1.5 font-mono text-[10px] uppercase tracking-wider text-neon-cyan">
                          Techtig support
                        </p>
                        <p className="whitespace-pre-wrap text-sm text-ink-100">
                          {ticket.admin_reply}
                        </p>
                      </div>
                    ) : (
                      <p className="text-xs text-ink-600">
                        No reply yet. You will get a notification when there is one.
                      </p>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </PlatformPage>
  );
}
