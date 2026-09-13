import Link from "next/link";
import { redirect } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { getOrgContext } from "@/lib/data/org-context";
import { AdminNav } from "@/components/admin/AdminNav";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const ctx = await getOrgContext();

  // Middleware only guarantees "logged in" for /admin/*; the actual
  // is_admin check has to happen here where we can read the profile.
  if (!ctx.isAdmin) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen bg-base-950">
      <a href="#admin-content" className="skip-link">
        Skip to main content
      </a>
      <div className="p-4 md:p-8">
        <div className="mb-6 flex flex-wrap items-center gap-2">
          <ShieldCheck size={16} className="text-neon-violet" aria-hidden="true" />
          <span className="font-display font-bold text-neon-violet">Admin</span>
          <span className="text-sm text-ink-600">— full access, no billing applied</span>
          <Link
            href="/dashboard"
            className="ml-auto text-sm text-ink-400 transition-colors hover:text-neon-cyan"
          >
            Back to workspace
          </Link>
        </div>
        <AdminNav />
        <main id="admin-content" tabIndex={-1}>
          {children}
        </main>
      </div>
    </div>
  );
}
