"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";

const LINKS = [
  ["#platform", "Platform"],
  ["#pricing", "Pricing"],
] as const;

/**
 * Marketing header. The mobile sheet is a plain disclosure rather than a modal
 * dialog: it pushes no focus trap because it sits inline in the document and
 * closing it is a single Escape-free tap, unlike the app's navigation drawer.
 */
export function LandingNav() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-base-700 bg-base-950/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3.5">
        <Link href="/" className="font-display text-lg font-bold tracking-tight">
          agent<span className="text-neon-cyan">mi</span>
        </Link>

        <nav aria-label="Marketing" className="hidden items-center gap-6 sm:flex">
          {LINKS.map(([href, label]) => (
            <a key={href} href={href} className="text-sm text-ink-400 transition-colors hover:text-ink-100">
              {label}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-2 sm:flex">
          <Link href="/login" className="text-sm text-ink-400 transition-colors hover:text-ink-100">
            Sign in
          </Link>
          <Link href="/signup" className="btn-primary !px-4 !py-2 text-sm">
            Start Building
          </Link>
        </div>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls="landing-mobile-nav"
          aria-label={open ? "Close menu" : "Open menu"}
          className="rounded-lg p-1.5 text-ink-400 transition-colors hover:bg-base-800 hover:text-ink-100 sm:hidden"
        >
          {open ? <X size={18} aria-hidden="true" /> : <Menu size={18} aria-hidden="true" />}
        </button>
      </div>

      <div id="landing-mobile-nav" hidden={!open} className="border-t border-base-700 px-4 py-4 sm:hidden">
        <nav aria-label="Marketing (mobile)" className="flex flex-col gap-1">
          {LINKS.map(([href, label]) => (
            <a
              key={href}
              href={href}
              onClick={() => setOpen(false)}
              className="rounded-lg px-3 py-2 text-sm text-ink-400 transition-colors hover:bg-base-800 hover:text-ink-100"
            >
              {label}
            </a>
          ))}
        </nav>
        <div className="mt-3 flex flex-col gap-2">
          <Link href="/login" className="btn-secondary w-full" onClick={() => setOpen(false)}>
            Sign in
          </Link>
          <Link href="/signup" className="btn-primary w-full" onClick={() => setOpen(false)}>
            Start Building
          </Link>
        </div>
      </div>
    </header>
  );
}
