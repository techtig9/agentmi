"use client";

import { useId, useState, type InputHTMLAttributes } from "react";
import { Eye, EyeOff } from "lucide-react";

interface PasswordFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "id" | "type"> {
  label: string;
  hint?: string;
  id?: string;
}

/**
 * Password input with a show/hide toggle.
 *
 * The toggle is a real button with an accessible name that changes with state,
 * and the input keeps its autocomplete token either way so password managers
 * still recognise it.
 */
export function PasswordField({ label, hint, id, ...props }: PasswordFieldProps) {
  const generated = useId();
  const fieldId = id ?? generated;
  const [visible, setVisible] = useState(false);

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={fieldId} className="font-body text-sm text-ink-400">
        {label}
      </label>
      <div className="relative">
        <input
          {...props}
          id={fieldId}
          type={visible ? "text" : "password"}
          aria-describedby={hint ? `${fieldId}-hint` : undefined}
          className="w-full rounded-lg border border-base-700 bg-base-900 py-2.5 pl-3.5 pr-11 text-ink-100
                     outline-none transition-colors duration-200 placeholder:text-ink-600
                     focus:border-neon-cyan/60 focus:shadow-neon-cyan"
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? "Hide password" : "Show password"}
          aria-pressed={visible}
          className="absolute right-1 top-1/2 -translate-y-1/2 rounded-md p-2 text-ink-600
                     transition-colors hover:text-ink-100"
        >
          {visible ? <EyeOff size={16} aria-hidden="true" /> : <Eye size={16} aria-hidden="true" />}
        </button>
      </div>
      {hint && (
        <p id={`${fieldId}-hint`} className="text-xs text-ink-600">
          {hint}
        </p>
      )}
    </div>
  );
}
