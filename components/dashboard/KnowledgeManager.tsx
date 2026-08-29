"use client";

import { useState, useTransition } from "react";
import { ingestKnowledgeText, ingestKnowledgeUrl } from "@/lib/actions/knowledge";

export function KnowledgeManager({ agentId, chunkCount }: { agentId: string; chunkCount: number }) {
  const [mode, setMode] = useState<"text" | "url">("text");
  const [value, setValue] = useState("");
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ kind: "error" | "success"; text: string } | null>(null);

  function handleSubmit() {
    setMessage(null);
    startTransition(async () => {
      const result = mode === "text" ? await ingestKnowledgeText(agentId, value) : await ingestKnowledgeUrl(agentId, value);
      if (result.error) { setMessage({ kind: "error", text: result.error }); return; }
      setMessage({ kind: "success", text: `${mode === "url" ? "Website" : "Source"} indexed — ${result.chunksCreated} chunks ready.` });
      setValue("");
    });
  }

  return (
    <div className="neon-card p-5">
      <div className="flex items-center justify-between mb-3">
        <div><span className="font-display font-bold text-sm">Knowledge sources</span><p className="text-xs text-ink-600 mt-1">Add text or public HTTPS pages. Existing sources are preserved.</p></div>
        <span className="text-xs text-ink-600 font-mono">{chunkCount} chunks indexed</span>
      </div>
      <div className="flex gap-2 mb-3">
        <button type="button" onClick={() => setMode("text")} className={`btn-secondary text-xs ${mode === "text" ? "ring-1 ring-neon-cyan/60" : ""}`}>Text</button>
        <button type="button" onClick={() => setMode("url")} className={`btn-secondary text-xs ${mode === "url" ? "ring-1 ring-neon-cyan/60" : ""}`}>Website URL</button>
      </div>
      {mode === "text" ? (
        <textarea rows={7} value={value} onChange={(e) => setValue(e.target.value)} placeholder="Paste FAQ, documentation, policies or other source text…" className="w-full rounded-lg bg-base-900 border border-base-700 px-3.5 py-3 text-ink-100 placeholder:text-ink-600 outline-none focus:border-neon-cyan/60 resize-none mb-3" />
      ) : (
        <input value={value} onChange={(e) => setValue(e.target.value)} placeholder="https://example.com/help" className="w-full rounded-lg bg-base-900 border border-base-700 px-3.5 py-3 text-ink-100 placeholder:text-ink-600 outline-none focus:border-neon-cyan/60 mb-3" />
      )}
      {message && <p className={`text-sm mb-3 ${message.kind === "error" ? "text-neon-pink" : "text-neon-green"}`}>{message.text}</p>}
      <button type="button" onClick={handleSubmit} disabled={isPending || value.trim().length === 0} className="btn-secondary text-sm">
        {isPending ? "Indexing…" : mode === "url" ? "Fetch & index website" : "Index source"}
      </button>
    </div>
  );
}
