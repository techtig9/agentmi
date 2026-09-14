"use client";

import Link from "next/link";
import { Bell, ChevronDown, CreditCard, LogOut, Menu, Search, Settings, ShieldCheck, Users } from "lucide-react";
import { signOut } from "@/lib/actions/auth";
import { Dropdown, DropdownItem, DropdownLabel, DropdownSeparator } from "@/components/ui/Dropdown";

interface TopbarProps {
  orgName: string;
  plan: string;
  creditBalance: number;
  isAdmin: boolean;
  unreadNotifications: number;
  userEmail: string;
  onMenuClick: () => void;
  onSearchClick: () => void;
}

export function Topbar({
  orgName,
  plan,
  creditBalance,
  isAdmin,
  unreadNotifications,
  userEmail,
  onMenuClick,
  onSearchClick,
}: TopbarProps) {
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-3 border-b border-base-700 bg-base-950/80 px-4 backdrop-blur md:px-6">
      <div className="flex min-w-0 items-center gap-3">
        <button
          type="button"
          onClick={onMenuClick}
          className="shrink-0 rounded-lg p-1.5 text-ink-400 transition-colors hover:bg-base-800 hover:text-ink-100 lg:hidden"
          aria-label="Open navigation menu"
        >
          <Menu size={18} aria-hidden="true" />
        </button>

        {/*
          Workspace selector. Agentmi currently models one organization per
          user, so this presents the active workspace and its plan rather than
          offering a switcher that would have nothing to switch to.
        */}
        <div className="flex min-w-0 items-center gap-2">
          <span className="truncate font-body text-sm text-ink-100">{orgName}</span>
          <span className="shrink-0 rounded-full border border-base-700 px-2 py-0.5 text-xs uppercase tracking-wide text-ink-600">
            {plan}
          </span>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2 md:gap-3">
        <button
          type="button"
          onClick={onSearchClick}
          className="inline-flex items-center gap-2 rounded-lg border border-base-700 px-2.5 py-1.5 text-sm text-ink-600 transition-colors hover:border-neon-cyan/40 hover:text-ink-100"
          aria-label="Search pages (Command K)"
        >
          <Search size={15} aria-hidden="true" />
          <span className="hidden lg:inline">Search…</span>
          <kbd className="hidden rounded border border-base-700 px-1.5 py-0.5 font-mono text-[10px] lg:inline">
            ⌘K
          </kbd>
        </button>

        <Link
          href="/dashboard/notifications"
          className="relative rounded-lg p-1.5 text-ink-400 transition-colors hover:bg-base-800 hover:text-ink-100"
          aria-label={
            unreadNotifications > 0
              ? `Notifications, ${unreadNotifications} unread`
              : "Notifications"
          }
        >
          <Bell size={18} aria-hidden="true" />
          {unreadNotifications > 0 && (
            <span className="absolute -right-0.5 -top-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-neon-pink px-1 text-[10px] font-bold text-base-950">
              {unreadNotifications > 9 ? "9+" : unreadNotifications}
            </span>
          )}
        </Link>

        <Link
          href="/dashboard/usage"
          className="credit-badge hidden sm:inline-flex"
          title="Credits remaining — view usage and costs"
        >
          {isAdmin ? "Unlimited (admin)" : `${creditBalance.toLocaleString()} credits`}
        </Link>

        <Dropdown
          menuLabel="Account menu"
          trigger={({ open, toggle, ref }) => (
            <button
              ref={ref}
              type="button"
              onClick={toggle}
              aria-haspopup="menu"
              aria-expanded={open}
              className="inline-flex items-center gap-1.5 rounded-lg p-1 text-ink-400 transition-colors hover:text-ink-100"
              aria-label="Account menu"
            >
              <span
                aria-hidden="true"
                className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-neon-cyan/30 bg-neon-cyan/10 font-display text-xs font-bold text-neon-cyan"
              >
                {initialOf(userEmail)}
              </span>
              <ChevronDown size={14} aria-hidden="true" />
            </button>
          )}
        >
          <DropdownLabel>Signed in as</DropdownLabel>
          <p className="truncate px-3 pb-2 text-xs text-ink-400">{userEmail}</p>
          <DropdownSeparator />
          <Link href="/dashboard/settings" className="block">
            <DropdownItem icon={Settings}>Settings</DropdownItem>
          </Link>
          <Link href="/dashboard/team" className="block">
            <DropdownItem icon={Users}>Team</DropdownItem>
          </Link>
          <Link href="/dashboard/billing" className="block">
            <DropdownItem icon={CreditCard}>Billing</DropdownItem>
          </Link>
          {isAdmin && (
            <Link href="/admin" className="block">
              <DropdownItem icon={ShieldCheck}>Admin Panel</DropdownItem>
            </Link>
          )}
          <DropdownSeparator />
          <form action={signOut}>
            <button
              type="submit"
              role="menuitem"
              className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm text-ink-400 transition-colors duration-150 hover:bg-base-800 hover:text-ink-100"
            >
              <LogOut size={15} aria-hidden="true" />
              Sign out
            </button>
          </form>
        </Dropdown>
      </div>
    </header>
  );
}

function initialOf(email: string): string {
  return email?.trim()?.charAt(0)?.toUpperCase() || "A";
}
