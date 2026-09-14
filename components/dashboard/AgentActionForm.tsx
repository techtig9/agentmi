"use client";

import { useEffect, useState } from "react";
import { useFormState } from "react-dom";
import { useRouter } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import {
  archiveAgent,
  duplicateAgent,
  restoreAgent,
  type AgentActionState,
} from "@/lib/actions/agent-config";
import { ConfirmDialog } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";

const initialState: AgentActionState = { error: null };

const ACTIONS = {
  archive: archiveAgent,
  restore: restoreAgent,
  duplicate: duplicateAgent,
} as const;

/**
 * A menu entry that runs a server action behind a confirmation dialog.
 *
 * The action is a real server action rather than a fetch, so credit checks,
 * RBAC and audit logging all run server-side — the client never decides
 * whether the operation is permitted, it only asks.
 */
export function AgentActionForm({
  action,
  agentId,
  icon: Icon,
  label,
  confirmTitle,
  confirmDescription,
  confirmLabel,
  destructive,
}: {
  action: keyof typeof ACTIONS;
  agentId: string;
  icon: LucideIcon;
  label: string;
  confirmTitle: string;
  confirmDescription: string;
  confirmLabel: string;
  destructive: boolean;
}) {
  const [state, formAction] = useFormState(ACTIONS[action], initialState);
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  // Surface the server's own result rather than assuming success on submit.
  useEffect(() => {
    if (state.error) {
      toast(state.error, "error");
      setSubmitting(false);
      setOpen(false);
    } else if (state.success) {
      toast(state.success, "success");
      setSubmitting(false);
      setOpen(false);
      router.refresh();
    }
  }, [state, toast, router]);

  return (
    <>
      <button
        type="button"
        role="menuitem"
        onClick={(event) => {
          // The dropdown closes on click; stop that so the dialog has an anchor.
          event.stopPropagation();
          setOpen(true);
        }}
        className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm transition-colors duration-150 ${
          destructive
            ? "text-neon-pink hover:bg-neon-pink/10"
            : "text-ink-400 hover:bg-base-800 hover:text-ink-100"
        }`}
      >
        <Icon size={15} aria-hidden="true" />
        {label}
      </button>

      <form action={formAction} id={`agent-action-${action}-${agentId}`}>
        <input type="hidden" name="agentId" value={agentId} />
      </form>

      <ConfirmDialog
        open={open}
        onClose={() => setOpen(false)}
        onConfirm={() => {
          setSubmitting(true);
          (
            document.getElementById(`agent-action-${action}-${agentId}`) as HTMLFormElement | null
          )?.requestSubmit();
        }}
        title={confirmTitle}
        description={confirmDescription}
        confirmLabel={confirmLabel}
        destructive={destructive}
        loading={submitting}
      />
    </>
  );
}
