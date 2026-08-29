import { createClient } from "@/lib/supabase/server";
import { getOrgContext } from "@/lib/data/org-context";
import { InviteMemberForm } from "@/components/dashboard/InviteMemberForm";
import { RevokeInviteButton } from "@/components/dashboard/RevokeInviteButton";

export default async function TeamPage() {
  const ctx = await getOrgContext();
  const supabase = createClient();

  const [{ data: members }, { data: invites }] = await Promise.all([
    supabase.from("memberships").select("user_id, role, profiles(id)").eq("org_id", ctx.orgId),
    supabase
      .from("team_invites")
      .select("id, email, role, expires_at, accepted_at")
      .eq("org_id", ctx.orgId)
      .is("accepted_at", null)
      .order("created_at", { ascending: false }),
  ]);

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold mb-1">Team</h1>
      <p className="text-ink-400 text-sm mb-6">
        {members?.length ?? 0} member{members?.length === 1 ? "" : "s"} in {ctx.orgName}.
      </p>

      <div className="mb-6">
        <InviteMemberForm />
      </div>

      <div className="mb-6 flex flex-col gap-2">
        <p className="text-sm text-ink-400 mb-1">Members</p>
        {(members ?? []).map((m) => (
          <div key={m.user_id} className="neon-card p-3 flex items-center justify-between text-sm">
            <span className="font-mono text-xs text-ink-600">{m.user_id}</span>
            <span className="text-xs uppercase text-ink-400">{m.role}</span>
          </div>
        ))}
      </div>

      {invites && invites.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-sm text-ink-400 mb-1">Pending invites</p>
          {invites.map((inv) => {
            const expired = new Date(inv.expires_at) < new Date();
            return (
              <div key={inv.id} className="neon-card p-3 flex items-center justify-between text-sm">
                <div>
                  <span>{inv.email}</span>
                  <span className="text-ink-600 text-xs ml-2">
                    ({inv.role}{expired ? " · expired" : ""})
                  </span>
                </div>
                <RevokeInviteButton inviteId={inv.id} />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
