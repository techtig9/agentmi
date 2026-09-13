"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import { Building2, LayoutDashboard, LifeBuoy, type LucideIcon } from "lucide-react";

const ADMIN_LINKS: ReadonlyArray<readonly [string, string, LucideIcon]> = [
  ["/admin", "Overview", LayoutDashboard],
  ["/admin/users", "Organizations", Building2],
  ["/admin/support", "Support", LifeBuoy],
];

/**
 * Admin section navigation.
 *
 * Uses next/link rather than the raw `<a href>` these links used to be: those
 * triggered a full document reload on every admin tab change, throwing away the
 * client router and re-running the whole auth/profile round trip each time.
 */
export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Admin sections" className="mb-6 flex flex-wrap gap-1 border-b border-base-700">
      {ADMIN_LINKS.map(([href, label, Icon]) => {
        const active = href === "/admin" ? pathname === href : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={clsx(
              "inline-flex items-center gap-2 border-b-2 px-3 py-2.5 text-sm transition-colors duration-200",
              active
                ? "border-neon-violet text-neon-violet"
                : "border-transparent text-ink-400 hover:text-ink-100"
            )}
          >
            <Icon size={15} aria-hidden="true" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
