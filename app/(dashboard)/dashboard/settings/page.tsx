import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getOrgContext } from "@/lib/data/org-context";
import { OrgNameForm } from "@/components/dashboard/OrgNameForm";
import { MfaEnrollment } from "@/components/dashboard/MfaEnrollment";

export default async function SettingsPage() {
  const ctx = await getOrgContext();
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: mfaFactors } = await supabase.auth.mfa.listFactors();
  const verifiedFactor = mfaFactors?.totp.find((f) => f.status === "verified") ?? null;

  return (
    <div className="max-w-2xl flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold mb-1">Settings</h1>
        <p className="text-ink-400 text-sm">Organization and account details.</p>
      </div>

      <div className="neon-card p-5">
        <p className="font-display font-bold text-sm mb-3">Organization</p>
        <OrgNameForm currentName={ctx.orgName} />
      </div>

      <div className="neon-card p-5">
        <p className="font-display font-bold text-sm mb-3">Account</p>
        <dl className="flex flex-col gap-2 text-sm">
          <div className="flex justify-between">
            <dt className="text-ink-400">Email</dt>
            <dd>{user?.email ?? "—"}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-ink-400">Role in this org</dt>
            <dd className="uppercase text-xs">{ctx.role}</dd>
          </div>
          {ctx.isAdmin && (
            <div className="flex justify-between">
              <dt className="text-ink-400">Account type</dt>
              <dd className="text-neon-violet text-xs">Techtig admin — unlimited access</dd>
            </div>
          )}
        </dl>
      </div>

      <div className="neon-card p-5">
        <p className="font-display font-bold text-sm mb-3">Plan &amp; credits</p>
        <p className="text-sm text-ink-400">
          On the <span className="text-ink-100 capitalize">{ctx.plan}</span> plan with{" "}
          {ctx.isAdmin ? "unlimited access" : `${ctx.creditBalance.toLocaleString()} credits remaining`}.
          Manage your plan on the{" "}
          <Link href="/dashboard/billing" className="text-neon-cyan hover:underline">
            Billing
          </Link>{" "}
          page.
        </p>
      </div>

      <div className="neon-card p-5">
        <p className="font-display font-bold text-sm mb-3">Security</p>
        <MfaEnrollment factor={verifiedFactor ? { id: verifiedFactor.id } : null} />
      </div>
    </div>
  );
}
