"use client";

import { useFormStatus } from "react-dom";
import { Button, type ButtonProps } from "./Button";

/**
 * Submit button wired to the enclosing form's pending state, so every server
 * action in the app gets a spinner and a disabled control for free instead of
 * each form re-implementing `useFormStatus`.
 */
export function SubmitButton({
  children,
  pendingLabel,
  ...props
}: Omit<ButtonProps, "loading" | "type"> & { pendingLabel?: string }) {
  const { pending } = useFormStatus();
  return (
    <Button {...props} type="submit" loading={pending}>
      {pending && pendingLabel ? pendingLabel : children}
    </Button>
  );
}
