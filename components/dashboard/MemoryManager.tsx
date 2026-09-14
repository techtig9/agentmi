"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Brain, Trash2, User, Users } from "lucide-react";
import { IconButton } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/States";
import { ConfirmDialog } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { formatRelativeTime } from "@/lib/data/run-metrics";

export interface MemoryItem {
  id: string;
  kind: string;
  content: string;
  importance: number;
  source: string;
  user_id: string | null;
  expires_at: string | null;
  created_at: string;
}

/**
 * Stored-memory list with per-item deletion.
 *
 * The page previously stated that users "can inspect and delete stored memories
 * at any time" while offering no way to delete one — the DELETE endpoint has
 * existed all along, it simply had no UI. This wires the two together.
 */
export function MemoryManager({
  agentId,
  memories,
}: {
  agentId: string;
  memories: MemoryItem[];
}) {
  const [confirm, setConfirm] = useState<MemoryItem | null>(null);
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();
  const router = useRouter();

  function remove(memory: MemoryItem) {
    startTransition(async () => {
      try {
        const res = await fetch(`/api/dashboard/agents/${agentId}/memory`, {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: memory.id }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Unable to delete memory.");
        toast("Memory deleted.", "success");
        setConfirm(null);
        router.refresh();
      } catch (e) {
        toast(e instanceof Error ? e.message : "Unable to delete memory.", "error");
      }
    });
  }

  if (memories.length === 0) {
    return (
      <EmptyState
        icon={Brain}
        title="No memories stored yet"
        description="When memory is enabled, the agent retains useful facts from conversations so it does not have to be told the same thing twice. Anything it stores will be listed here for you to review or delete."
      />
    );
  }

  return (
    <>
      <ul className="space-y-3">
        {memories.map((memory) => {
          const expired = memory.expires_at !== null && new Date(memory.expires_at) <= new Date();
          return (
            <li key={memory.id} className="rounded-xl border border-base-700 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-[10px] uppercase tracking-wider text-neon-cyan">
                      {memory.kind}
                    </span>
                    <span className="inline-flex items-center gap-1 text-[11px] text-ink-600">
                      {memory.user_id ? (
                        <>
                          <User size={11} aria-hidden="true" />
                          Personal
                        </>
                      ) : (
                        <>
                          <Users size={11} aria-hidden="true" />
                          Workspace
                        </>
                      )}
                    </span>
                    {expired && <StatusBadge status="expired" />}
                  </div>
                  <p className="mt-2 text-sm text-ink-100">{memory.content}</p>
                  <p className="mt-2 font-mono text-[11px] text-ink-600">
                    importance {memory.importance}/5 · from {memory.source} ·{" "}
                    {formatRelativeTime(memory.created_at)}
                  </p>
                </div>
                <IconButton
                  icon={Trash2}
                  label="Delete this memory"
                  size="sm"
                  variant="danger"
                  onClick={() => setConfirm(memory)}
                />
              </div>
            </li>
          );
        })}
      </ul>

      <ConfirmDialog
        open={confirm !== null}
        onClose={() => setConfirm(null)}
        onConfirm={() => confirm && remove(confirm)}
        title="Delete this memory?"
        description={
          confirm
            ? `The agent will stop using "${truncate(confirm.content)}" in future conversations. This cannot be undone.`
            : ""
        }
        confirmLabel="Delete memory"
        loading={isPending}
      />
    </>
  );
}

function truncate(text: string, max = 90): string {
  return text.length > max ? `${text.slice(0, max)}…` : text;
}
