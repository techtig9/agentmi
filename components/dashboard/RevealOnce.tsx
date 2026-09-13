"use client";

import { useEffect, useState } from "react";
import { Check, Copy, ShieldAlert } from "lucide-react";

/**
 * Shows a freshly generated secret exactly once.
 *
 * Only the hash is stored server-side, so this is genuinely the last time the
 * value exists anywhere — the copy affordance is the whole point of the
 * component, and the warning is not decoration.
 */
export function RevealOnce({ secret, message }: { secret: string; message: string }) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 3000);
    return () => clearTimeout(timer);
  }, [copied]);

  return (
    <div className="rounded-lg border border-neon-green/40 bg-neon-green/5 p-3.5">
      <p className="flex items-start gap-2 text-sm text-ink-100">
        <ShieldAlert size={15} className="mt-0.5 shrink-0 text-neon-green" aria-hidden="true" />
        {message}
      </p>
      <div className="mt-3 flex items-center gap-2">
        <code className="min-w-0 flex-1 overflow-x-auto rounded border border-base-700 bg-base-950 px-2.5 py-2 font-mono text-xs text-ink-100">
          {secret}
        </code>
        <button
          type="button"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(secret);
              setCopied(true);
            } catch {
              // Clipboard blocked — the value is still selectable above.
            }
          }}
          aria-label={copied ? "Secret copied" : "Copy secret"}
          className="shrink-0 rounded-md p-2 text-ink-600 transition-colors hover:text-ink-100"
        >
          {copied ? (
            <Check size={15} className="text-neon-green" aria-hidden="true" />
          ) : (
            <Copy size={15} aria-hidden="true" />
          )}
        </button>
      </div>
    </div>
  );
}
