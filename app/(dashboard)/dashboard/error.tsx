"use client";

import { useEffect } from "react";
import Link from "next/link";
import { RotateCcw } from "lucide-react";
import { ErrorState } from "@/components/ui/States";
import { Button } from "@/components/ui/Button";

/**
 * Error boundary for the dashboard segment.
 *
 * Scoped here rather than relying on the root boundary so a failure on one
 * screen does not take down the navigation with it — the sidebar and topbar
 * live in the layout above and stay usable, which means "go somewhere else" is
 * still an option.
 *
 * `digest` is Next's server-side error id. Showing it lets a user quote
 * something useful to support without exposing the stack trace itself.
 */
export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Agentmi dashboard error", error.digest ?? "");
  }, [error]);

  return (
    <div className="mx-auto max-w-2xl py-8">
      <ErrorState
        title="This page could not load"
        description="Something went wrong fetching the data for this screen. Nothing has been changed."
        details={error.digest ? `Reference: ${error.digest}` : undefined}
        action={
          <>
            <Button icon={RotateCcw} onClick={() => reset()}>
              Try again
            </Button>
            <Link href="/dashboard/support" className="btn-secondary">
              Contact support
            </Link>
          </>
        }
      />
    </div>
  );
}
