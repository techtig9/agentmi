"use client";

import { useEffect, useState } from "react";
import { useFormState } from "react-dom";
import Link from "next/link";
import { Check, Copy, Power, PowerOff, Undo2 } from "lucide-react";
import {
  disableDeployment,
  enableDeployment,
  rollbackDeployment,
  type DeploymentActionState,
} from "@/lib/actions/deployments";
import { StatusBadge } from "@/components/ui/Badge";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { formatRelativeTime } from "@/lib/data/run-metrics";

const initialState: DeploymentActionState = { error: null };

export interface DeploymentItem {
  id: string;
  name: string;
  agentId: string;
  agentName: string;
  environment: string;
  status: string;
  version: number;
  endpointUrl: string | null;
  createdAt: string;
  runCount: number;
  lastRunAt: string | null;
  isLatestVersion: boolean;
}

export function DeploymentCard({
  deployment,
  canManage,
  origin,
}: {
  deployment: DeploymentItem;
  canManage: boolean;
  origin: string;
}) {
  const [disableState, disableAction] = useFormState(disableDeployment, initialState);
  const [enableState, enableAction] = useFormState(enableDeployment, initialState);
  const [rollbackState, rollbackAction] = useFormState(rollbackDeployment, initialState);
  const { toast } = useToast();

  useEffect(() => {
    for (const state of [disableState, enableState, rollbackState]) {
      if (state.success) toast(state.success, "success");
      if (state.error) toast(state.error, "error");
    }
  }, [disableState, enableState, rollbackState, toast]);

  const fullEndpoint = deployment.endpointUrl ? `${origin}${deployment.endpointUrl}` : null;
  const isActive = deployment.status === "active";

  return (
    <div className="rounded-xl border border-base-700 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate font-display font-bold">{deployment.name}</p>
            <StatusBadge status={isActive ? "live" : deployment.status} />
            <span className="rounded-full border border-base-700 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-ink-600">
              {deployment.environment}
            </span>
          </div>
          <p className="mt-1.5 text-xs text-ink-600">
            <Link href={`/dashboard/agents/${deployment.agentId}`} className="hover:text-neon-cyan">
              {deployment.agentName}
            </Link>{" "}
            · v{deployment.version} · created {formatRelativeTime(deployment.createdAt)}
          </p>
        </div>
      </div>

      {fullEndpoint && (
        <div className="mt-4 flex items-center gap-2 rounded-lg border border-base-700 bg-base-900 p-2.5">
          <code className="min-w-0 flex-1 truncate font-mono text-[11px] text-ink-400">
            POST {fullEndpoint}
          </code>
          <CopyEndpoint value={fullEndpoint} />
        </div>
      )}

      <dl className="mt-4 flex flex-wrap gap-x-5 gap-y-1.5 border-t border-base-700 pt-3 font-mono text-[11px] text-ink-600">
        <div className="flex gap-1.5">
          <dt>Runs</dt>
          <dd className="text-ink-400">{deployment.runCount}</dd>
        </div>
        <div className="flex gap-1.5">
          <dt>Last run</dt>
          <dd className="text-ink-400">
            {deployment.lastRunAt ? formatRelativeTime(deployment.lastRunAt) : "Never"}
          </dd>
        </div>
      </dl>

      {canManage && (
        <div className="mt-4 flex flex-wrap gap-2">
          {isActive ? (
            <form action={disableAction}>
              <input type="hidden" name="deploymentId" value={deployment.id} />
              <SubmitButton size="sm" variant="secondary" icon={PowerOff} pendingLabel="Disabling…">
                Disable
              </SubmitButton>
            </form>
          ) : (
            <form action={enableAction}>
              <input type="hidden" name="deploymentId" value={deployment.id} />
              <SubmitButton size="sm" variant="secondary" icon={Power} pendingLabel="Enabling…">
                Enable
              </SubmitButton>
            </form>
          )}

          {/*
            Rolling back re-promotes this snapshot as a new version. Offering it
            on the newest deployment would be a no-op, so it is hidden there.
          */}
          {!deployment.isLatestVersion && (
            <form action={rollbackAction}>
              <input type="hidden" name="deploymentId" value={deployment.id} />
              <SubmitButton size="sm" variant="ghost" icon={Undo2} pendingLabel="Rolling back…">
                Roll back to this version
              </SubmitButton>
            </form>
          )}

          <Link href={`/dashboard/runs?agent=${deployment.agentId}`} className="ml-auto">
            <Button size="sm" variant="ghost">
              View runs
            </Button>
          </Link>
        </div>
      )}
    </div>
  );
}

function CopyEndpoint({ value }: { value: string }) {
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
          await navigator.clipboard.writeText(value);
          setCopied(true);
        } catch {
          // Clipboard denied (insecure context or blocked permission) — say
          // nothing rather than claiming a copy that did not happen.
        }
      }}
      aria-label={copied ? "Endpoint copied" : "Copy endpoint URL"}
      className="shrink-0 rounded-md p-1.5 text-ink-600 transition-colors hover:text-ink-100"
    >
      {copied ? (
        <Check size={14} className="text-neon-green" aria-hidden="true" />
      ) : (
        <Copy size={14} aria-hidden="true" />
      )}
    </button>
  );
}
