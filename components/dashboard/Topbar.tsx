import Link from "next/link";
import { signOut } from "@/lib/actions/auth";

interface TopbarProps {
  orgName: string;
  plan: string;
  creditBalance: number;
  isAdmin: boolean;
  unreadNotifications: number;
  onMenuClick?: () => void;
}

export function Topbar({ orgName, plan, creditBalance, isAdmin, unreadNotifications, onMenuClick }: TopbarProps) {
  return (
    <header className="h-16 border-b border-base-700 flex items-center justify-between px-4 md:px-6 gap-3">
      <div className="flex items-center gap-3 min-w-0">
        <button
          type="button"
          onClick={onMenuClick}
          className="lg:hidden shrink-0 text-ink-400 hover:text-ink-100 text-xl leading-none px-1"
          aria-label="Open navigation menu"
        >
          ☰
        </button>
        <span className="font-body text-sm text-ink-100 truncate">{orgName}</span>
        <span className="text-xs uppercase tracking-wide text-ink-600 border border-base-700 rounded-full px-2 py-0.5 shrink-0">
          {plan}
        </span>
      </div>
      <div className="flex items-center gap-4 shrink-0">
        <Link href="/dashboard/notifications" className="relative text-ink-400 hover:text-ink-100 transition-colors text-sm inline-flex items-center" aria-label="Notifications">
          <span aria-hidden="true" className="sm:hidden text-base">🔔</span>
          <span className="hidden sm:inline">Notifications</span>
          {unreadNotifications > 0 && (
            <span className="ml-1.5 inline-flex items-center justify-center rounded-full bg-neon-pink text-base-950 text-[10px] font-bold w-4 h-4">
              {unreadNotifications > 9 ? "9+" : unreadNotifications}
            </span>
          )}
        </Link>
        <span className="credit-badge" title="Credits remaining this billing period">
          {isAdmin ? "∞ credits (admin)" : `${creditBalance.toLocaleString()} credits`}
        </span>
        <form action={signOut}>
          <button type="submit" className="text-sm text-ink-400 hover:text-ink-100 transition-colors">
            Sign out
          </button>
        </form>
      </div>
    </header>
  );
}
