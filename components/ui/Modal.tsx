"use client";

import { useCallback, useRef, type ReactNode } from "react";
import clsx from "clsx";
import { X } from "lucide-react";
import { Button, IconButton } from "./Button";
import { useFocusTrap, useScrollLock } from "./useFocusTrap";

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children?: ReactNode;
  footer?: ReactNode;
  size?: "sm" | "md" | "lg";
}

const SIZE_CLASS = { sm: "max-w-sm", md: "max-w-lg", lg: "max-w-2xl" };

/** Centered dialog with a focus trap, Escape-to-close and scroll lock. */
export function Modal({ open, onClose, title, description, children, footer, size = "md" }: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  useFocusTrap(panelRef, open, onClose);
  useScrollLock(open);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center">
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        aria-describedby={description ? "modal-description" : undefined}
        tabIndex={-1}
        className={clsx(
          "relative w-full rounded-card border border-base-700 bg-base-900 shadow-popover animate-scale-in",
          "max-h-[90vh] overflow-y-auto",
          SIZE_CLASS[size]
        )}
      >
        <div className="flex items-start justify-between gap-4 border-b border-base-700 p-5">
          <div className="min-w-0">
            <h2 id="modal-title" className="font-display text-lg font-bold">
              {title}
            </h2>
            {description && (
              <p id="modal-description" className="mt-1 text-sm text-ink-400">
                {description}
              </p>
            )}
          </div>
          <IconButton icon={X} label="Close dialog" size="sm" onClick={onClose} />
        </div>
        {children && <div className="p-5">{children}</div>}
        {footer && <div className="flex justify-end gap-2 border-t border-base-700 p-5">{footer}</div>}
      </div>
    </div>
  );
}

/** Right-hand slide-over, for configuration panels next to a canvas or list. */
export function Drawer({
  open,
  onClose,
  title,
  description,
  children,
  footer,
}: Omit<ModalProps, "size">) {
  const panelRef = useRef<HTMLDivElement>(null);
  useFocusTrap(panelRef, open, onClose);
  useScrollLock(open);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="drawer-title"
        tabIndex={-1}
        className="absolute inset-y-0 right-0 flex w-full max-w-md flex-col border-l border-base-700 bg-base-900 shadow-popover"
      >
        <div className="flex items-start justify-between gap-4 border-b border-base-700 p-5">
          <div className="min-w-0">
            <h2 id="drawer-title" className="font-display text-lg font-bold">
              {title}
            </h2>
            {description && <p className="mt-1 text-sm text-ink-400">{description}</p>}
          </div>
          <IconButton icon={X} label="Close panel" size="sm" onClick={onClose} />
        </div>
        <div className="flex-1 overflow-y-auto p-5">{children}</div>
        {footer && <div className="flex justify-end gap-2 border-t border-base-700 p-5">{footer}</div>}
      </div>
    </div>
  );
}

/**
 * Destructive-action confirmation. Separate from `Modal` so a "are you sure"
 * always looks the same and always defaults focus to the safe option.
 */
export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  destructive = true,
  loading = false,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  loading?: boolean;
}) {
  const handleConfirm = useCallback(() => onConfirm(), [onConfirm]);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      description={description}
      size="sm"
      footer={
        <>
          <Button variant="secondary" size="sm" onClick={onClose} disabled={loading}>
            {cancelLabel}
          </Button>
          <Button
            variant={destructive ? "danger" : "primary"}
            size="sm"
            onClick={handleConfirm}
            loading={loading}
          >
            {confirmLabel}
          </Button>
        </>
      }
    />
  );
}
