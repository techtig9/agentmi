"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  BookOpen,
  Brain,
  Check,
  Copy,
  Cpu,
  ExternalLink,
  Gauge,
  RotateCcw,
  SendHorizontal,
  Trash2,
  Wrench,
} from "lucide-react";
import { Button, IconButton } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/States";
import { formatDuration } from "@/lib/data/run-metrics";

interface ToolCall {
  name: string;
  toolId?: string;
  error?: string;
}

/** Everything the API reports about a single assistant turn. All of it is recorded server-side. */
interface RunMeta {
  runId: string | null;
  model: string | null;
  sourcesUsed: number;
  memoryUsed: number;
  durationMs: number | null;
  creditsUsed: number | null;
  toolCalls: ToolCall[];
}

interface Message {
  role: "user" | "assistant";
  content: string;
  meta?: RunMeta;
}

export function AgentPlayground({ agentId }: { agentId: string }) {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [error, setError] = useState<{ text: string; runId: string | null } | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const transcriptRef = useRef<HTMLDivElement>(null);

  // Keep the newest turn in view as the conversation grows.
  useEffect(() => {
    transcriptRef.current?.scrollTo({ top: transcriptRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  async function send(content: string, history: Message[]) {
    if (!content || loading) return;

    setLoading(true);
    setError(null);
    const nextMessages: Message[] = [...history, { role: "user", content }];
    setMessages(nextMessages);

    try {
      const res = await fetch(`/api/dashboard/agents/${agentId}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: content,
          history: history.map(({ role, content: text }) => ({ role, content: text })),
          ...(sessionId ? { session_id: sessionId } : {}),
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError({ text: data.error ?? "Request failed.", runId: data.run_id ?? null });
        setMessages(history);
        return;
      }

      setMessages([
        ...nextMessages,
        {
          role: "assistant",
          content: data.reply,
          meta: {
            runId: data.run_id ?? null,
            model: data.model ?? null,
            sourcesUsed: data.sources_used ?? 0,
            memoryUsed: data.memory_used ?? 0,
            durationMs: typeof data.duration_ms === "number" ? data.duration_ms : null,
            creditsUsed: typeof data.credits_used === "number" ? data.credits_used : null,
            toolCalls: Array.isArray(data.tool_calls) ? data.tool_calls : [],
          },
        },
      ]);
      if (data.session_id) setSessionId(data.session_id);
    } catch (e) {
      setError({ text: e instanceof Error ? e.message : "Request failed.", runId: null });
      setMessages(history);
    } finally {
      setLoading(false);
    }
  }

  function submit() {
    const content = message.trim();
    if (!content) return;
    setMessage("");
    void send(content, messages);
  }

  /** Re-sends the last user turn, dropping the assistant reply it produced. */
  function regenerate() {
    const lastUser = [...messages].reverse().find((m) => m.role === "user");
    if (!lastUser) return;
    const upto = messages.slice(0, messages.lastIndexOf(lastUser));
    void send(lastUser.content, upto);
  }

  function clear() {
    setMessages([]);
    setError(null);
    // A new session id is issued on the next send, so the cleared conversation
    // is not silently continued server-side from stored session history.
    setSessionId(null);
  }

  const hasConversation = messages.length > 0;

  return (
    <div className="neon-card flex min-h-[560px] flex-col p-0">
      <div className="flex items-center justify-between gap-3 border-b border-base-700 px-5 py-3">
        <p className="font-mono text-xs uppercase tracking-wider text-ink-600">Conversation</p>
        <div className="flex items-center gap-1">
          <IconButton
            icon={RotateCcw}
            label="Regenerate last response"
            size="sm"
            onClick={regenerate}
            disabled={!hasConversation || loading}
          />
          <IconButton
            icon={Trash2}
            label="Clear conversation"
            size="sm"
            onClick={clear}
            disabled={!hasConversation || loading}
          />
        </div>
      </div>

      <div ref={transcriptRef} className="flex-1 space-y-4 overflow-y-auto p-5">
        {!hasConversation && !error && (
          <EmptyState
            icon={SendHorizontal}
            title="Send a message to this agent"
            description="Conversation history is retained for this test session, and every execution is recorded in Runs with its latency, trace and cost."
          />
        )}

        {messages.map((m, i) => (
          <div key={i} className={m.role === "user" ? "sm:ml-10" : "sm:mr-10"}>
            <div
              className={`rounded-xl p-4 text-sm ${
                m.role === "user"
                  ? "border border-base-700 bg-base-800"
                  : "border border-base-700 bg-base-900"
              }`}
            >
              <p className="mb-1.5 font-mono text-[10px] uppercase text-ink-600">
                {m.role === "user" ? "You" : "Agent"}
              </p>
              <p className="whitespace-pre-wrap text-ink-100">{m.content}</p>
            </div>
            {m.meta && <ResponseMeta meta={m.meta} content={m.content} />}
          </div>
        ))}

        {loading && (
          <div className="sm:mr-10" role="status" aria-live="polite">
            <div className="rounded-xl border border-base-700 bg-base-900 p-4">
              <p className="mb-1.5 font-mono text-[10px] uppercase text-ink-600">Agent</p>
              <span className="inline-flex gap-1" aria-label="Agent is thinking">
                {[0, 1, 2].map((i) => (
                  <span
                    key={i}
                    className="h-1.5 w-1.5 animate-pulse rounded-full bg-neon-cyan motion-reduce:animate-none"
                    style={{ animationDelay: `${i * 150}ms` }}
                  />
                ))}
              </span>
            </div>
          </div>
        )}

        {error && (
          <div role="alert" className="rounded-xl border border-neon-pink/30 bg-neon-pink/5 p-4">
            <p className="flex items-start gap-2 text-sm text-neon-pink">
              <AlertTriangle size={15} className="mt-0.5 shrink-0" aria-hidden="true" />
              {error.text}
            </p>
            {error.runId && (
              <Link
                href={`/dashboard/runs/${error.runId}`}
                className="mt-3 inline-flex items-center gap-1.5 text-xs text-neon-cyan hover:underline"
              >
                Inspect the failed run
                <ExternalLink size={11} aria-hidden="true" />
              </Link>
            )}
          </div>
        )}
      </div>

      <div className="border-t border-base-700 p-4">
        <div className="flex gap-2">
          <label htmlFor="playground-input" className="sr-only">
            Message
          </label>
          <textarea
            id="playground-input"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={(e) => {
              // Enter sends; Shift+Enter inserts a newline, as in every chat UI.
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                submit();
              }
            }}
            rows={1}
            maxLength={4000}
            placeholder="Type a test message…  (Enter to send, Shift+Enter for a new line)"
            disabled={loading}
            className="max-h-40 min-h-[2.75rem] flex-1 resize-y rounded-lg border border-base-700 bg-base-800 px-3 py-2.5 text-sm
                       text-ink-100 outline-none transition-colors placeholder:text-ink-600
                       focus:border-neon-cyan/60 disabled:opacity-50"
          />
          <Button onClick={submit} loading={loading} disabled={!message.trim()} icon={SendHorizontal}>
            Send
          </Button>
        </div>
      </div>
    </div>
  );
}

function ResponseMeta({ meta, content }: { meta: RunMeta; content: string }) {
  const failedTools = meta.toolCalls.filter((t) => t.error);

  return (
    <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5 px-1 font-mono text-[11px] text-ink-600">
      {meta.durationMs !== null && (
        <span className="inline-flex items-center gap-1" title="Measured server-side for this run">
          <Gauge size={11} aria-hidden="true" />
          {formatDuration(meta.durationMs)}
        </span>
      )}
      {meta.creditsUsed !== null && (
        <span title="Credits consumed by this message">
          {meta.creditsUsed} {meta.creditsUsed === 1 ? "credit" : "credits"}
        </span>
      )}
      <span className="inline-flex items-center gap-1" title="Knowledge chunks retrieved">
        <BookOpen size={11} aria-hidden="true" />
        {meta.sourcesUsed}
      </span>
      {meta.toolCalls.length > 0 && (
        <span
          className={`inline-flex items-center gap-1 ${failedTools.length ? "text-neon-pink" : ""}`}
          title="Tool calls made during this run"
        >
          <Wrench size={11} aria-hidden="true" />
          {meta.toolCalls.length}
          {failedTools.length > 0 && ` (${failedTools.length} failed)`}
        </span>
      )}

      <CopyButton text={content} />

      <details className="w-full">
        <summary className="cursor-pointer py-1 hover:text-ink-400">Debug details</summary>
        <dl className="mt-2 space-y-1.5 rounded-lg border border-base-700 bg-base-900 p-3">
          <DebugRow icon={Cpu} label="Model" value={meta.model ?? "—"} />
          <DebugRow icon={BookOpen} label="Knowledge chunks" value={String(meta.sourcesUsed)} />
          <DebugRow icon={Brain} label="Memories applied" value={String(meta.memoryUsed)} />
          {meta.toolCalls.length > 0 && (
            <div className="flex gap-2">
              <dt className="flex shrink-0 items-center gap-1.5 text-ink-600">
                <Wrench size={11} aria-hidden="true" />
                Tools
              </dt>
              <dd className="min-w-0 flex-1 text-right">
                <ul className="space-y-0.5">
                  {meta.toolCalls.map((tool, i) => (
                    <li key={i} className={tool.error ? "text-neon-pink" : "text-neon-green"}>
                      {tool.name}
                      {tool.error ? " — failed" : " — ok"}
                    </li>
                  ))}
                </ul>
              </dd>
            </div>
          )}
          {meta.runId && (
            <div className="flex items-center gap-2 border-t border-base-700 pt-2">
              <dt className="shrink-0 text-ink-600">Run</dt>
              <dd className="min-w-0 flex-1 text-right">
                <Link
                  href={`/dashboard/runs/${meta.runId}`}
                  className="inline-flex items-center gap-1 truncate text-neon-cyan hover:underline"
                >
                  {meta.runId.slice(0, 8)}
                  <ExternalLink size={10} aria-hidden="true" />
                </Link>
              </dd>
            </div>
          )}
        </dl>
      </details>
    </div>
  );
}

function DebugRow({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Cpu;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <dt className="flex shrink-0 items-center gap-1.5 text-ink-600">
        <Icon size={11} aria-hidden="true" />
        {label}
      </dt>
      <dd className="min-w-0 flex-1 truncate text-right text-ink-400" title={value}>
        {value}
      </dd>
    </div>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(timer);
  }, [copied]);

  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
        } catch {
          // Clipboard blocked (insecure context or denied permission) — leave
          // the label unchanged rather than claiming a copy that did not happen.
        }
      }}
      className="inline-flex items-center gap-1 transition-colors hover:text-ink-400"
      aria-label={copied ? "Response copied" : "Copy response"}
    >
      {copied ? (
        <Check size={11} className="text-neon-green" aria-hidden="true" />
      ) : (
        <Copy size={11} aria-hidden="true" />
      )}
      {copied ? "Copied" : "Copy"}
    </button>
  );
}
