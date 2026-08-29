import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AcceptInviteButton } from "@/components/dashboard/AcceptInviteButton";

export default async function InvitePage({ params }: { params: { token: string } }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?next=/invite/${params.token}`);
  }

  return (
    <div className="aurora-backdrop min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm neon-card p-8 text-center">
        <h1 className="text-lg font-bold mb-2">You&apos;ve been invited</h1>
        <p className="text-sm text-ink-400 mb-6">
          Accept to join this team&apos;s workspace on Agentmi.
        </p>
        <AcceptInviteButton token={params.token} />
      </div>
    </div>
  );
}
