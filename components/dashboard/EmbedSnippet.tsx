"use client";

import { useState } from "react";

export function EmbedSnippet({ publicWidgetId, plan }: { publicWidgetId: string; plan: string }) {
  const [copied, setCopied] = useState(false);
  const snippet = `<script src="${typeof window !== "undefined" ? window.location.origin : ""}/widget.js" data-widget-id="${publicWidgetId}" async><\/script>`;

  return (
    <div className="neon-card p-5">
      <p className="font-display font-bold text-sm mb-2">Embed on your website</p>
      <p className="text-xs text-ink-600 mb-3">
        Paste this before <code className="font-mono">&lt;/body&gt;</code>. This ID is safe to
        publish — it only allows chatting with this one agent, unlike your API keys.
      </p>
      <div className="rounded-lg bg-base-900 border border-base-700 p-3 font-mono text-xs break-all mb-2">
        {snippet}
      </div>
      <button
        type="button"
        onClick={() => {
          navigator.clipboard.writeText(snippet);
          setCopied(true);
        }}
        className="btn-secondary text-xs px-3 py-1.5"
      >
        {copied ? "Copied" : "Copy snippet"}
      </button>
      {plan !== "business" && (
        <p className="text-xs text-ink-600 mt-3">
          Shows a small &quot;Powered by Agentmi&quot; footer on this plan — upgrade to Business
          to remove it.
        </p>
      )}
    </div>
  );
}
