"use client";

import { useEffect, useState } from "react";
import { Check, Copy } from "lucide-react";

/**
 * Code sample with a copy button.
 *
 * Deliberately never renders a real key: the samples show the placeholder
 * `<agentmi-api-key>`, because a page that prints a live credential into the
 * DOM is a page that leaks it into screenshots, bug reports and caches.
 */
export function CodeBlock({ code, language }: { code: string; language: string }) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(timer);
  }, [copied]);

  return (
    <div className="overflow-hidden rounded-lg border border-base-700 bg-base-900">
      <div className="flex items-center justify-between border-b border-base-700 px-3 py-1.5">
        <span className="font-mono text-[10px] uppercase tracking-wider text-ink-600">
          {language}
        </span>
        <button
          type="button"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(code);
              setCopied(true);
            } catch {
              // Clipboard unavailable — leave the label alone rather than lying.
            }
          }}
          aria-label={copied ? `${language} sample copied` : `Copy ${language} sample`}
          className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] text-ink-600 transition-colors hover:text-ink-100"
        >
          {copied ? (
            <>
              <Check size={12} className="text-neon-green" aria-hidden="true" />
              Copied
            </>
          ) : (
            <>
              <Copy size={12} aria-hidden="true" />
              Copy
            </>
          )}
        </button>
      </div>
      <pre tabIndex={0} className="overflow-x-auto p-3.5 font-mono text-xs leading-relaxed text-ink-400">
        <code>{code}</code>
      </pre>
    </div>
  );
}

/** Language tabs over a set of samples for the same request. */
export function CodeTabs({ samples }: { samples: Array<{ language: string; code: string }> }) {
  const [active, setActive] = useState(0);

  return (
    <div>
      <div className="mb-2 flex gap-1 rounded-lg border border-base-700 p-0.5" role="tablist" aria-label="Language">
        {samples.map((sample, i) => (
          <button
            key={sample.language}
            type="button"
            role="tab"
            aria-selected={i === active}
            onClick={() => setActive(i)}
            className={`flex-1 rounded-md px-3 py-1.5 text-xs transition-colors ${
              i === active ? "bg-base-800 text-neon-cyan" : "text-ink-400 hover:text-ink-100"
            }`}
          >
            {sample.language}
          </button>
        ))}
      </div>
      <CodeBlock code={samples[active].code} language={samples[active].language} />
    </div>
  );
}
