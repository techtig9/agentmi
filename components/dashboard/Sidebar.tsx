"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import {
  Activity,
  BarChart3,
  Bell,
  Blocks,
  Bot,
  BookOpen,
  ChevronLeft,
  CircleDollarSign,
  Code2,
  CreditCard,
  Database,
  FileText,
  FlaskConical,
  KeyRound,
  LayoutDashboard,
  LayoutTemplate,
  LifeBuoy,
  ListChecks,
  Lock,
  Network,
  Plus,
  Rocket,
  ScrollText,
  Settings,
  ShieldCheck,
  Store,
  Users,
  Webhook,
  Workflow,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import { Tooltip } from "@/components/ui/Tooltip";

/**
 * The single source of truth for dashboard navigation — consumed by this
 * sidebar and by the ⌘K command palette, so a route can never appear in one
 * and not the other.
 *
 * Kept as [href, label, Icon] tuples because `tests/acceptance-matrix.test.ts`
 * parses this file to assert every sidebar link resolves to a real page.tsx.
 */
export const NAV_GROUPS: ReadonlyArray<{
  label: string;
  items: ReadonlyArray<readonly [string, string, LucideIcon]>;
}> = [
  {
    label: "BUILD",
    items: [
      ["/dashboard", "Dashboard", LayoutDashboard],
      ["/dashboard/agents", "Agents", Bot],
      ["/dashboard/create", "Create Agent", Plus],
      ["/dashboard/workflows", "Workflows", Workflow],
      ["/dashboard/multi-agent", "Multi-Agent", Network],
      ["/dashboard/tools", "Tools", Wrench],
      ["/dashboard/knowledge", "Knowledge", BookOpen],
      ["/dashboard/datasets", "Datasets", Database],
    ],
  },
  {
    label: "QUALITY",
    items: [
      ["/dashboard/runs", "Runs", ListChecks],
      ["/dashboard/evaluations", "Evaluations", FlaskConical],
      ["/dashboard/observability", "Observability", Activity],
    ],
  },
  {
    label: "DEPLOY",
    items: [
      ["/dashboard/deployments", "Deployments", Rocket],
      ["/dashboard/api", "API & SDK", Code2],
      ["/dashboard/api-keys", "API Keys", KeyRound],
      ["/dashboard/webhooks", "Webhooks", Webhook],
    ],
  },
  {
    label: "MANAGE",
    items: [
      ["/dashboard/analytics", "Analytics", BarChart3],
      ["/dashboard/usage", "Usage & Costs", CircleDollarSign],
      ["/dashboard/security", "Security", ShieldCheck],
      ["/dashboard/audit-logs", "Audit Logs", ScrollText],
      ["/dashboard/secrets", "Secrets", Lock],
      ["/dashboard/integrations", "Integrations", Blocks],
    ],
  },
  {
    label: "ECOSYSTEM",
    items: [
      ["/dashboard/templates", "Templates", LayoutTemplate],
      ["/dashboard/marketplace", "Marketplace", Store],
      ["/dashboard/docs", "Documentation", FileText],
    ],
  },
  {
    label: "WORKSPACE",
    items: [
      ["/dashboard/team", "Team", Users],
      ["/dashboard/billing", "Billing", CreditCard],
      ["/dashboard/notifications", "Notifications", Bell],
      ["/dashboard/support", "Support", LifeBuoy],
      ["/dashboard/settings", "Settings", Settings],
    ],
  },
];

/** `/dashboard` must match exactly; every other route also matches its children. */
export function isRouteActive(href: string, pathname: string): boolean {
  if (href === "/dashboard") return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function Sidebar({
  isAdmin,
  collapsed = false,
  onToggleCollapse,
  onNavigate,
}: {
  isAdmin: boolean;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();

  return (
    <aside
      className={clsx(
        "flex h-full min-h-screen shrink-0 flex-col overflow-y-auto border-r border-base-700 bg-base-900 p-3 lg:sticky lg:top-0 lg:h-screen lg:bg-base-900/80",
        collapsed ? "w-[4.5rem]" : "w-64"
      )}
    >
      <div className={clsx("mb-6 flex items-center gap-2 px-1 py-2", collapsed ? "justify-center" : "justify-between")}>
        {!collapsed && (
          <Link
            href="/dashboard"
            className="font-display text-xl font-bold tracking-tight"
            onClick={onNavigate}
          >
            agent<span className="text-neon-cyan">mi</span>
          </Link>
        )}
        {onToggleCollapse && (
          <button
            type="button"
            onClick={onToggleCollapse}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-expanded={!collapsed}
            className="hidden h-8 w-8 shrink-0 items-center justify-center rounded-lg text-ink-600 transition-colors hover:bg-base-800 hover:text-ink-100 lg:inline-flex"
          >
            <ChevronLeft
              size={16}
              aria-hidden="true"
              className={clsx("transition-transform duration-200", collapsed && "rotate-180")}
            />
          </button>
        )}
      </div>

      <nav aria-label="Main" className="flex-1 pr-0.5">
        {NAV_GROUPS.map((group) => (
          <div key={group.label} className="mb-5">
            {collapsed ? (
              <div className="mx-auto mb-2 h-px w-6 bg-base-700" role="presentation" />
            ) : (
              <p className="mb-2 px-3 font-mono text-[10px] tracking-[0.18em] text-ink-600">
                {group.label}
              </p>
            )}
            <ul className="flex flex-col gap-1">
              {group.items.map(([href, label, Icon]) => {
                const active = isRouteActive(href, pathname);
                const link = (
                  <Link
                    href={href}
                    onClick={onNavigate}
                    aria-current={active ? "page" : undefined}
                    aria-label={collapsed ? label : undefined}
                    className={clsx(
                      "flex items-center rounded-lg border px-3 py-2 text-sm transition-colors duration-150",
                      collapsed ? "justify-center" : "gap-3",
                      active
                        ? "border-neon-cyan/20 bg-neon-cyan/10 text-neon-cyan"
                        : "border-transparent text-ink-400 hover:bg-base-800 hover:text-ink-100"
                    )}
                  >
                    <Icon size={16} className="shrink-0" aria-hidden="true" />
                    {!collapsed && <span className="truncate">{label}</span>}
                  </Link>
                );

                return (
                  <li key={href}>
                    {collapsed ? (
                      <Tooltip label={label} side="right" className="w-full">
                        {link}
                      </Tooltip>
                    ) : (
                      link
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        ))}

        {isAdmin && (
          <div className="mt-2 border-t border-base-700 pt-4">
            {(() => {
              const adminLink = (
                <Link
                  href="/admin"
                  onClick={onNavigate}
                  aria-current={pathname.startsWith("/admin") ? "page" : undefined}
                  aria-label={collapsed ? "Admin Panel" : undefined}
                  className={clsx(
                    "flex items-center rounded-lg px-3 py-2 text-sm text-neon-violet transition-colors hover:bg-neon-violet/10",
                    collapsed ? "justify-center" : "gap-3"
                  )}
                >
                  <ShieldCheck size={16} className="shrink-0" aria-hidden="true" />
                  {!collapsed && <span>Admin Panel</span>}
                </Link>
              );
              return collapsed ? (
                <Tooltip label="Admin Panel" side="right" className="w-full">
                  {adminLink}
                </Tooltip>
              ) : (
                adminLink
              );
            })()}
          </div>
        )}
      </nav>

      {!collapsed && (
        <div className="mt-4 rounded-xl border border-base-700 bg-base-800/60 p-3">
          <p className="text-xs font-medium">Agentmi Workspace</p>
          <p className="mt-1 text-[11px] text-ink-600">Build · test · evaluate · deploy · observe.</p>
        </div>
      )}
    </aside>
  );
}
