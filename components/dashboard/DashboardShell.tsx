"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import { CommandPalette, useCommandPaletteShortcut } from "./CommandPalette";
import { ToastProvider } from "@/components/ui/Toast";
import { useFocusTrap } from "@/components/ui/useFocusTrap";

const COLLAPSE_STORAGE_KEY = "agentmi:sidebar-collapsed";

interface DashboardShellProps {
  isAdmin: boolean;
  orgName: string;
  plan: string;
  creditBalance: number;
  unreadNotifications: number;
  userEmail: string;
  children: React.ReactNode;
}

export function DashboardShell({
  isAdmin,
  orgName,
  plan,
  creditBalance,
  unreadNotifications,
  userEmail,
  children,
}: DashboardShellProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const drawerRef = useRef<HTMLDivElement>(null);

  const closeMobile = useCallback(() => setMobileOpen(false), []);
  const openPalette = useCallback(() => setPaletteOpen(true), []);

  useCommandPaletteShortcut(openPalette);
  useFocusTrap(drawerRef, mobileOpen, closeMobile);

  // Restore the collapse preference after mount rather than during render:
  // reading localStorage while rendering would desynchronise the server and
  // client markup and trigger a hydration mismatch.
  useEffect(() => {
    try {
      setCollapsed(window.localStorage.getItem(COLLAPSE_STORAGE_KEY) === "true");
    } catch {
      // Private browsing or blocked storage — the default (expanded) is fine.
    }
  }, []);

  const toggleCollapse = useCallback(() => {
    setCollapsed((current) => {
      const next = !current;
      try {
        window.localStorage.setItem(COLLAPSE_STORAGE_KEY, String(next));
      } catch {
        // Preference simply will not persist; the toggle still works.
      }
      return next;
    });
  }, []);

  // A route change should never leave the mobile drawer covering the page.
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  // Prevent background scroll behind the open mobile drawer.
  useEffect(() => {
    if (!mobileOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [mobileOpen]);

  return (
    <ToastProvider>
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>

      <div className="flex min-h-screen bg-base-950">
        {mobileOpen && (
          <div
            className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm animate-fade-in lg:hidden"
            onClick={closeMobile}
            aria-hidden="true"
          />
        )}

        <div
          ref={drawerRef}
          className={clsx(
            "fixed inset-y-0 left-0 z-50 transition-transform duration-200 lg:static lg:z-auto lg:translate-x-0",
            mobileOpen ? "translate-x-0" : "-translate-x-full"
          )}
          {...(mobileOpen ? { role: "dialog", "aria-modal": true, "aria-label": "Navigation" } : {})}
        >
          <Sidebar
            isAdmin={isAdmin}
            collapsed={collapsed}
            onToggleCollapse={toggleCollapse}
            onNavigate={closeMobile}
          />
        </div>

        <div className="flex min-w-0 flex-1 flex-col">
          <Topbar
            orgName={orgName}
            plan={plan}
            creditBalance={creditBalance}
            isAdmin={isAdmin}
            unreadNotifications={unreadNotifications}
            userEmail={userEmail}
            onMenuClick={() => setMobileOpen(true)}
            onSearchClick={openPalette}
          />
          <main id="main-content" tabIndex={-1} className="min-w-0 flex-1 p-4 md:p-6 lg:p-8">
            {children}
          </main>
        </div>
      </div>

      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} isAdmin={isAdmin} />
    </ToastProvider>
  );
}
