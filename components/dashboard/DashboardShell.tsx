"use client";

import { useState } from "react";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";

interface DashboardShellProps {
  isAdmin: boolean;
  orgName: string;
  plan: string;
  creditBalance: number;
  unreadNotifications: number;
  children: React.ReactNode;
}

export function DashboardShell({ isAdmin, orgName, plan, creditBalance, unreadNotifications, children }: DashboardShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-base-950">
      {mobileOpen && (
        <button
          type="button"
          aria-label="Close navigation menu"
          className="fixed inset-0 bg-black/60 z-40 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}
      <div
        className={`fixed inset-y-0 left-0 z-50 transition-transform duration-200 lg:static lg:translate-x-0 lg:z-auto ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <Sidebar isAdmin={isAdmin} onNavigate={() => setMobileOpen(false)} />
      </div>
      <div className="flex-1 flex flex-col min-w-0">
        <Topbar
          orgName={orgName}
          plan={plan}
          creditBalance={creditBalance}
          isAdmin={isAdmin}
          unreadNotifications={unreadNotifications}
          onMenuClick={() => setMobileOpen(true)}
        />
        <main className="flex-1 min-w-0 p-4 md:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
