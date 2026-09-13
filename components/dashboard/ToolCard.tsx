"use client";

import { useEffect } from "react";
import { useFormState } from "react-dom";
import { Lock, Pause, Play, PlugZap } from "lucide-react";
import {
  testPlatformTool,
  toggleToolActive,
  type ToolActionState,
} from "@/lib/actions/platform-tools";
import { StatusBadge } from "@/components/ui/Badge";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { useToast } from "@/components/ui/Toast";
import { formatRelativeTime } from "@/lib/data/run-metrics";

const initialState: ToolActionState = { error: null };

export interface ToolListItem {
  id: string;
  name: string;
  description: string | null;
  kind: string;
  is_active: boolean;
  endpoint: string | null;
  method: string;
  hasSecret: boolean;
  /** Derived from recorded run traces, so it reflects real executions. */
  callCount: number;
  failureCount: number;
  lastUsedAt: string | null;
}

export function ToolCard({ tool, canToggle }: { tool: ToolListItem; canToggle: boolean }) {
  const [testState, testAction] = useFormState(testPlatformTool, initialState);
  const [toggleState, toggleAction] = useFormState(toggleToolActive, initialState);
  const { toast } = useToast();

  useEffect(() => {
    if (testState.success) toast(testState.success, "success");
    if (testState.error) toast(testState.error, "error");
  }, [testState, toast]);

  useEffect(() => {
    if (toggleState.success) toast(toggleState.success, "success");
    if (toggleState.error) toast(toggleState.error, "error");
  }, [toggleState, toast]);

  return (
    <div className="rounded-xl border border-base-700 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate font-medium">{tool.name}</p>
            {/*
              Status was previously rendered green whatever it said, so a paused
              tool looked identical to an active one.
            */}
            <StatusBadge status={tool.is_active ? "active" : "paused"} />
            {tool.hasSecret && (
              <span className="inline-flex items-center gap-1 text-[11px] text-neon-cyan">
                <Lock size={11} aria-hidden="true" />
                Authenticated
              </span>
            )}
          </div>
          <p className="mt-1.5 text-sm text-ink-400">{tool.description || "No description."}</p>
          {tool.endpoint && (
            <p className="mt-1.5 truncate font-mono text-[11px] text-ink-600" title={tool.endpoint}>
              {tool.method} {tool.endpoint}
            </p>
          )}
        </div>
      </div>

      <dl className="mt-4 flex flex-wrap gap-x-5 gap-y-1.5 border-t border-base-700 pt-3 font-mono text-[11px] text-ink-600">
        <div className="flex gap-1.5">
          <dt>Calls</dt>
          <dd className="text-ink-400">{tool.callCount}</dd>
        </div>
        <div className="flex gap-1.5">
          <dt>Failures</dt>
          <dd className={tool.failureCount > 0 ? "text-neon-pink" : "text-ink-400"}>
            {tool.failureCount}
          </dd>
        </div>
        <div className="flex gap-1.5">
          <dt>Last used</dt>
          <dd className="text-ink-400">
            {tool.lastUsedAt ? formatRelativeTime(tool.lastUsedAt) : "Never"}
          </dd>
        </div>
      </dl>

      <div className="mt-4 flex flex-wrap gap-2">
        <form action={testAction}>
          <input type="hidden" name="toolId" value={tool.id} />
          <SubmitButton size="sm" variant="secondary" icon={PlugZap} pendingLabel="Testing…">
            Test connection
          </SubmitButton>
        </form>

        {canToggle && (
          <form action={toggleAction}>
            <input type="hidden" name="toolId" value={tool.id} />
            <SubmitButton
              size="sm"
              variant="ghost"
              icon={tool.is_active ? Pause : Play}
              pendingLabel="Saving…"
            >
              {tool.is_active ? "Pause" : "Resume"}
            </SubmitButton>
          </form>
        )}
      </div>
    </div>
  );
}
