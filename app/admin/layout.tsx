import { redirect } from "next/navigation";
import { getOrgContext } from "@/lib/data/org-context";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const ctx = await getOrgContext();

  // Middleware only guarantees "logged in" for /admin/*; the actual
  // is_admin check has to happen here where we can read the profile.
  if (!ctx.isAdmin) {
    redirect("/dashboard");
  }

  return (
    <div className="p-8">
      <div className="mb-6 flex items-center gap-2">
        <span className="text-neon-violet font-display font-bold">Admin</span>
        <span className="text-ink-600 text-sm">— full access, no billing applied</span>
      </div>
      <nav className="flex gap-4 mb-6 text-sm">
        <a href="/admin" className="text-ink-400 hover:text-neon-cyan">Overview</a>
        <a href="/admin/users" className="text-ink-400 hover:text-neon-cyan">Organizations</a>
        <a href="/admin/support" className="text-ink-400 hover:text-neon-cyan">Support</a>
      </nav>
      {children}
    </div>
  );
}
