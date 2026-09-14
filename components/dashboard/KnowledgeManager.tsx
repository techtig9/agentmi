"use client";

import { useState, useTransition } from "react";
import { ExternalLink, FileText, Globe, Link2, RefreshCw, Trash2, Upload } from "lucide-react";
import {
  ingestKnowledgeText,
  ingestKnowledgeUrl,
  deleteKnowledgeSource,
  reindexKnowledgeSource,
} from "@/lib/actions/knowledge";
import { Button, IconButton } from "@/components/ui/Button";
import { TextField, TextAreaField } from "@/components/ui/Field";
import { FormAlert } from "@/components/ui/FormAlert";
import { StatusBadge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/States";
import { ConfirmDialog } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { formatRelativeTime } from "@/lib/data/run-metrics";

export interface KnowledgeSource {
  id: string;
  title: string;
  kind: string;
  locator: string | null;
  status: string;
  char_count: number;
  chunk_count: number;
  error_message: string | null;
  created_at: string;
}

/**
 * Knowledge source management.
 *
 * Previously this was add-only: sources could be ingested but never removed or
 * refreshed, and every source rendered its status in green — a failed ingest
 * looked identical to a healthy one.
 */
export function KnowledgeManager({
  agentId,
  sources,
  totalChunks,
}: {
  agentId: string;
  sources: KnowledgeSource[];
  totalChunks: number;
}) {
  const [mode, setMode] = useState<"text" | "url">("text");
  const [value, setValue] = useState("");
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ kind: "error" | "success"; text: string } | null>(null);
  const [pendingSource, setPendingSource] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<KnowledgeSource | null>(null);
  const { toast } = useToast();

  function add() {
    setMessage(null);
    startTransition(async () => {
      const result =
        mode === "text"
          ? await ingestKnowledgeText(agentId, value)
          : await ingestKnowledgeUrl(agentId, value);

      if (result.error) {
        setMessage({ kind: "error", text: result.error });
        return;
      }
      setMessage({
        kind: "success",
        text: `${mode === "url" ? "Website" : "Source"} indexed — ${result.chunksCreated} chunks ready.`,
      });
      setValue("");
    });
  }

  function reindex(source: KnowledgeSource) {
    setPendingSource(source.id);
    startTransition(async () => {
      const result = await reindexKnowledgeSource(source.id);
      setPendingSource(null);
      if (result.error) toast(result.error, "error");
      else toast(`Re-indexed "${source.title}" — ${result.chunksCreated} chunks.`, "success");
    });
  }

  function remove(source: KnowledgeSource) {
    setPendingSource(source.id);
    startTransition(async () => {
      const result = await deleteKnowledgeSource(source.id);
      setPendingSource(null);
      setConfirmDelete(null);
      if (result.error) toast(result.error, "error");
      else toast(`Removed "${source.title}".`, "success");
    });
  }

  return (
    <div className="space-y-6">
      <div className="neon-card p-5">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-display text-sm font-bold">Add a knowledge source</h2>
            <p className="mt-1 text-xs text-ink-600">
              Paste text or point at a public HTTPS page. Existing sources are preserved.
            </p>
          </div>
          <span className="font-mono text-xs text-ink-600">
            {totalChunks.toLocaleString()} chunks indexed
          </span>
        </div>

        <div className="mb-4 flex gap-1 rounded-lg border border-base-700 p-0.5" role="group" aria-label="Source type">
          <ModeTab icon={FileText} label="Text" active={mode === "text"} onClick={() => setMode("text")} />
          <ModeTab icon={Globe} label="Website URL" active={mode === "url"} onClick={() => setMode("url")} />
        </div>

        {mode === "text" ? (
          <TextAreaField
            label="Source text"
            rows={7}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="Paste FAQ, documentation, policies or other source text…"
            hint="Longer sources are split into overlapping chunks so a fact is never cut in half."
          />
        ) : (
          <TextField
            label="Page URL"
            type="url"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="https://example.com/help"
            hint="Must be a public HTTPS page. The page is fetched once and its text indexed."
          />
        )}

        {message && (
          <div className="mt-4">
            <FormAlert message={message.text} tone={message.kind} />
          </div>
        )}

        <Button
          className="mt-4"
          onClick={add}
          loading={isPending && pendingSource === null}
          disabled={value.trim().length === 0}
          icon={Upload}
        >
          {mode === "url" ? "Fetch & index website" : "Index source"}
        </Button>
      </div>

      <div className="neon-card p-5">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold">Sources</h2>
            <p className="mt-1 text-xs text-ink-600">
              {sources.length} {sources.length === 1 ? "source" : "sources"} attached to this agent.
            </p>
          </div>
        </div>

        {sources.length === 0 ? (
          <EmptyState
            icon={Link2}
            title="No knowledge attached yet"
            description="Without knowledge the agent answers from the model alone. Add your documentation, policies or FAQs above to ground its answers in your material."
          />
        ) : (
          <ul className="space-y-3">
            {sources.map((source) => (
              <li key={source.id} className="rounded-xl border border-base-700 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate font-medium">{source.title}</p>
                      <StatusBadge status={source.status} />
                    </div>
                    <p className="mt-1.5 font-mono text-xs text-ink-600">
                      {source.kind.toUpperCase()} · {source.chunk_count} chunks ·{" "}
                      {source.char_count.toLocaleString()} chars · added{" "}
                      {formatRelativeTime(source.created_at)}
                    </p>
                    {source.locator && (
                      <a
                        href={source.locator}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="mt-1.5 inline-flex max-w-full items-center gap-1 truncate text-xs text-neon-cyan hover:underline"
                      >
                        <span className="truncate">{source.locator}</span>
                        <ExternalLink size={11} className="shrink-0" aria-hidden="true" />
                      </a>
                    )}
                    {source.error_message && (
                      <p className="mt-2 text-xs text-neon-pink">{source.error_message}</p>
                    )}
                  </div>

                  <div className="flex shrink-0 items-center gap-1">
                    <IconButton
                      icon={RefreshCw}
                      label={`Re-index ${source.title}`}
                      size="sm"
                      loading={isPending && pendingSource === source.id}
                      onClick={() => reindex(source)}
                    />
                    <IconButton
                      icon={Trash2}
                      label={`Delete ${source.title}`}
                      size="sm"
                      variant="danger"
                      onClick={() => setConfirmDelete(source)}
                    />
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <ConfirmDialog
        open={confirmDelete !== null}
        onClose={() => setConfirmDelete(null)}
        onConfirm={() => confirmDelete && remove(confirmDelete)}
        title="Delete this knowledge source?"
        description={
          confirmDelete
            ? `"${confirmDelete.title}" and its ${confirmDelete.chunk_count} indexed chunks will be removed. The agent will stop using this content immediately. This cannot be undone.`
            : ""
        }
        confirmLabel="Delete source"
        loading={isPending && pendingSource === confirmDelete?.id}
      />
    </div>
  );
}

function ModeTab({
  icon: Icon,
  label,
  active,
  onClick,
}: {
  icon: typeof FileText;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`inline-flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-1.5 text-xs transition-colors ${
        active ? "bg-base-800 text-neon-cyan" : "text-ink-400 hover:text-ink-100"
      }`}
    >
      <Icon size={13} aria-hidden="true" />
      {label}
    </button>
  );
}
