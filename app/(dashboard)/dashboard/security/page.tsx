import Link from "next/link";
import {
  AlertTriangle,
  Blocks,
  CheckCircle2,
  KeyRound,
  Lock,
  ScrollText,
  ShieldCheck,
  Users,
  type LucideIcon,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getOrgContext } from "@/lib/data/org-context";
import { PlatformPage } from "@/components/dashboard/PlatformPage";
import { formatRelativeTime } from "@/lib/data/run-metrics";

/**
 * Security centre.
 *
 * Everything here reflects the real state of this workspace. The previous
 * version advertised an "Approvals — require human confirmation before
 * sensitive tool actions" capability that does not exist anywhere in the
 * codebase; claiming a safety control you do not have is worse than not
 * having it, so it is gone rather than restyled.
 */
export default async function SecurityPage() {
  const ctx = await getOrgContext();
  const db = createClient();

  const { data: factors } = await db.auth.mfa.listFactors();
  const mfaVerified = Boolean(factors?.totp.find((factor) => factor.status === "verified"));

  const [
    { count: activeKeys },
    { count: revokedKeys },
    { count: activeSecrets },
    { count: connectedIntegrations },
    { count: members },
    { data: recentAudit },
  ] = await Promise.all([
    db
      .from("api_keys")
      .select("id", { count: "exact", head: true })
      .eq("org_id", ctx.orgId)
      .is("revoked_at", null),
    db
      .from("api_keys")
      .select("id", { count: "exact", head: true })
      .eq("org_id", ctx.orgId)
      .not("revoked_at", "is", null),
    db
      .from("agent_secrets")
      .select("id", { count: "exact", head: true })
      .eq("org_id", ctx.orgId)
      .is("revoked_at", null),
    db
      .from("integrations")
      .select("id", { count: "exact", head: true })
      .eq("org_id", ctx.orgId)
      .eq("status", "connected"),
    db.from("memberships").select("id", { count: "exact", head: true }).eq("org_id", ctx.orgId),
    db
      .from("audit_logs")
      .select("id, action, created_at")
      .eq("org_id", ctx.orgId)
      .order("created_at", { ascending: false })
      .limit(6),
  ]);

  return (
    <PlatformPage
      eyebrow="Manage"
      title="Security"
      description="The current security posture of this workspace, and the controls that protect it."
    >
      {!mfaVerified && (
        <div
          role="alert"
          className="mb-6 flex flex-wrap items-center gap-3 rounded-xl border border-neon-amber/40 bg-neon-amber/5 p-4"
        >
          <AlertTriangle size={18} className="shrink-0 text-neon-amber" aria-hidden="true" />
          <p className="min-w-0 flex-1 text-sm text-ink-100">
            Two-factor authentication is not enabled on your account. A password alone protects
            every agent, key and secret in this workspace.
          </p>
          <Link href="/dashboard/settings" className="btn-primary shrink-0 !px-4 !py-2 text-sm">
            Enable 2FA
          </Link>
        </div>
      )}

      <section aria-label="Account security" className="grid gap-4 sm:grid-cols-2">
        <PostureCard
          icon={ShieldCheck}
          title="Two-factor authentication"
          status={mfaVerified ? "active" : "draft"}
          statusLabel={mfaVerified ? "Enabled" : "Not enabled"}
          description={
            mfaVerified
              ? "Your account requires a time-based code in addition to your password."
              : "Add an authenticator app so a stolen password is not enough on its own."
          }
          href="/dashboard/settings"
          cta={mfaVerified ? "Manage" : "Enable 2FA"}
        />
        <PostureCard
          icon={Users}
          title="Access control"
          status="active"
          statusLabel={`${members ?? 0} ${members === 1 ? "member" : "members"}`}
          description={`You are signed in as ${ctx.role}. Permissions are checked on the server for every action, and every table is scoped to this organization by row-level security.`}
          href="/dashboard/team"
          cta="Manage team"
        />
        <PostureCard
          icon={KeyRound}
          title="API keys"
          status={(activeKeys ?? 0) > 0 ? "active" : "draft"}
          statusLabel={`${activeKeys ?? 0} active`}
          description={`Only a hash of each key is stored, so a secret is shown once and never again.${
            (revokedKeys ?? 0) > 0 ? ` ${revokedKeys} revoked keys are kept for the audit trail.` : ""
          }`}
          href="/dashboard/api-keys"
          cta="Manage keys"
        />
        <PostureCard
          icon={Lock}
          title="Secrets"
          status={(activeSecrets ?? 0) > 0 ? "active" : "draft"}
          statusLabel={`${activeSecrets ?? 0} stored`}
          description="Credentials are held as references and resolved server-side. Values are never sent to the browser."
          href="/dashboard/secrets"
          cta="Manage secrets"
        />
        <PostureCard
          icon={Blocks}
          title="Integrations"
          status={(connectedIntegrations ?? 0) > 0 ? "active" : "draft"}
          statusLabel={`${connectedIntegrations ?? 0} connected`}
          description="Each connection is verified against the real provider before it is marked connected."
          href="/dashboard/integrations"
          cta="Manage integrations"
        />
        <PostureCard
          icon={ScrollText}
          title="Audit trail"
          status="active"
          statusLabel="Recording"
          description="Configuration, deployment and security-sensitive changes are recorded with the account that made them."
          href="/dashboard/audit-logs"
          cta="View audit logs"
        />
      </section>

      <section className="mt-6 neon-card p-5">
        <h2 className="mb-1 text-lg font-bold">Recent security-relevant activity</h2>
        <p className="mb-5 text-xs text-ink-600">The latest entries from the audit trail.</p>
        {(recentAudit ?? []).length === 0 ? (
          <p className="text-sm text-ink-600">Nothing recorded yet.</p>
        ) : (
          <ul className="divide-y divide-base-700">
            {(recentAudit ?? []).map((entry) => (
              <li key={entry.id} className="flex items-center justify-between gap-4 py-2.5">
                <span className="truncate font-mono text-sm text-ink-400">
                  {entry.action.replace(/_/g, " ")}
                </span>
                <span className="shrink-0 font-mono text-xs text-ink-600">
                  {formatRelativeTime(entry.created_at)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </PlatformPage>
  );
}

function PostureCard({
  icon: Icon,
  title,
  status,
  statusLabel,
  description,
  href,
  cta,
}: {
  icon: LucideIcon;
  title: string;
  status: string;
  statusLabel: string;
  description: string;
  href: string;
  cta: string;
}) {
  return (
    <div className="neon-card flex flex-col p-5">
      <div className="flex items-start justify-between gap-3">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-base-700 bg-base-900">
          <Icon size={16} className="text-neon-cyan" aria-hidden="true" />
        </span>
        {/* Icon + label, never colour alone. */}
        <span className="inline-flex items-center gap-1.5">
          {status === "active" ? (
            <CheckCircle2 size={12} className="text-neon-green" aria-hidden="true" />
          ) : (
            <AlertTriangle size={12} className="text-neon-amber" aria-hidden="true" />
          )}
          <span
            className={`font-mono text-[11px] ${status === "active" ? "text-neon-green" : "text-neon-amber"}`}
          >
            {statusLabel}
          </span>
        </span>
      </div>
      <h3 className="mt-3.5 font-display font-bold">{title}</h3>
      <p className="mt-1.5 flex-1 text-sm text-ink-400">{description}</p>
      <Link href={href} className="mt-4 text-sm text-neon-cyan hover:underline">
        {cta}
      </Link>
    </div>
  );
}
