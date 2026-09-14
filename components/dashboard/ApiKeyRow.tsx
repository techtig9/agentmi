"use client";

import { useEffect, useState } from "react";
import { useFormState } from "react-dom";
import { RefreshCw, Trash2 } from "lucide-react";
import { revokeApiKey, rotateApiKey, type RevokeKeyState, type RotateKeyState } from "@/lib/actions/api-keys";
import { StatusBadge } from "@/components/ui/Badge";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { ConfirmDialog } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { RevealOnce } from "./RevealOnce";
import { formatRelativeTime } from "@/lib/data/run-metrics";

const revokeInitial: RevokeKeyState = { error: null };
const rotateInitial: RotateKeyState = { error: null };

export interface ApiKeyItem {
  id: string;
  name: string;
  displayPrefix: string;
  createdAt: string;
  lastUsedAt: string | null;
  revokedAt: string | null;
}

export function ApiKeyRow({ apiKey, canManage }: { apiKey: ApiKeyItem; canManage: boolean }) {
  const [revokeState, revokeAction] = useFormState(revokeApiKey, revokeInitial);
  const [rotateState, rotateAction] = useFormState(rotateApiKey, rotateInitial);
  const [confirmRevoke, setConfirmRevoke] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (revokeState.error) toast(revokeState.error, "error");
  }, [revokeState, toast]);

  useEffect(() => {
    if (rotateState.error) toast(rotateState.error, "error");
    if (rotateState.success) toast(rotateState.success, "success");
  }, [rotateState, toast]);

  const revoked = apiKey.revokedAt !== null;

  return (
    <div className="rounded-xl border border-base-700 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate font-medium">{apiKey.name}</p>
            <StatusBadge status={revoked ? "revoked" : "active"} />
          </div>
          <p className="mt-1.5 font-mono text-xs text-ink-600">{apiKey.displayPrefix}…</p>
          <dl className="mt-2 flex flex-wrap gap-x-5 gap-y-1 font-mono text-[11px] text-ink-600">
            <div className="flex gap-1.5">
              <dt>Created</dt>
              <dd className="text-ink-400">{formatRelativeTime(apiKey.createdAt)}</dd>
            </div>
            <div className="flex gap-1.5">
              <dt>Last used</dt>
              {/* "Never" is meaningful: an unused key is a key you can revoke safely. */}
              <dd className="text-ink-400">
                {apiKey.lastUsedAt ? formatRelativeTime(apiKey.lastUsedAt) : "Never"}
              </dd>
            </div>
            {revoked && (
              <div className="flex gap-1.5">
                <dt>Revoked</dt>
                <dd className="text-ink-400">{formatRelativeTime(apiKey.revokedAt as string)}</dd>
              </div>
            )}
          </dl>
        </div>

        {canManage && !revoked && (
          <div className="flex shrink-0 flex-wrap gap-2">
            <form action={rotateAction}>
              <input type="hidden" name="keyId" value={apiKey.id} />
              <SubmitButton size="sm" variant="secondary" icon={RefreshCw} pendingLabel="Rotating…">
                Rotate
              </SubmitButton>
            </form>
            <button
              type="button"
              onClick={() => setConfirmRevoke(true)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-neon-pink/40 px-3 py-1.5 text-xs text-neon-pink transition-colors hover:bg-neon-pink/10"
            >
              <Trash2 size={13} aria-hidden="true" />
              Revoke
            </button>
          </div>
        )}
      </div>

      {rotateState.fullKey && (
        <div className="mt-4">
          <RevealOnce
            secret={rotateState.fullKey}
            message="Your replacement key. Copy it now — it is never shown again."
          />
        </div>
      )}

      <form action={revokeAction} id={`revoke-${apiKey.id}`}>
        <input type="hidden" name="keyId" value={apiKey.id} />
      </form>

      <ConfirmDialog
        open={confirmRevoke}
        onClose={() => setConfirmRevoke(false)}
        onConfirm={() => {
          (document.getElementById(`revoke-${apiKey.id}`) as HTMLFormElement | null)?.requestSubmit();
          setConfirmRevoke(false);
        }}
        title="Revoke this API key?"
        description={`Any request using "${apiKey.name}" will start failing with 401 immediately. This cannot be undone — issue a new key instead. If you only want to replace the secret, use Rotate.`}
        confirmLabel="Revoke key"
      />
    </div>
  );
}
