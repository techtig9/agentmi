import { forwardRef, useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";
import clsx from "clsx";

const CONTROL_CLASS =
  "w-full rounded-lg bg-base-900 border border-base-700 px-3.5 py-2.5 text-ink-100 " +
  "placeholder:text-ink-600 outline-none transition-colors duration-200 " +
  "focus:border-neon-cyan/60 focus:shadow-neon-cyan disabled:opacity-50 disabled:cursor-not-allowed";

/**
 * Shared label/hint/error scaffolding. Wires `htmlFor`, `aria-describedby` and
 * `aria-invalid` so every control below is announced correctly without each
 * caller remembering to do it.
 */
function FieldShell({
  id,
  label,
  hint,
  error,
  required,
  children,
  className,
}: {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={clsx("flex flex-col gap-1.5", className)}>
      <label htmlFor={id} className="text-sm text-ink-400 font-body">
        {label}
        {required && (
          <span className="ml-1 text-neon-pink" aria-hidden="true">
            *
          </span>
        )}
      </label>
      {children}
      {hint && !error && (
        <p id={`${id}-hint`} className="text-xs text-ink-600">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} className="text-xs text-neon-pink" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

function describedBy(id: string, hint?: string, error?: string) {
  if (error) return `${id}-error`;
  if (hint) return `${id}-hint`;
  return undefined;
}

export interface TextFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "id"> {
  label: string;
  hint?: string;
  error?: string;
  id?: string;
}

export const TextField = forwardRef<HTMLInputElement, TextFieldProps>(function TextField(
  { label, hint, error, id, className, required, ...props },
  ref
) {
  const generated = useId();
  const fieldId = id ?? generated;
  return (
    <FieldShell id={fieldId} label={label} hint={hint} error={error} required={required} className={className}>
      <input
        ref={ref}
        id={fieldId}
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(fieldId, hint, error)}
        className={clsx(CONTROL_CLASS, error && "border-neon-pink/60")}
        {...props}
      />
    </FieldShell>
  );
});

export interface TextAreaFieldProps extends Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "id"> {
  label: string;
  hint?: string;
  error?: string;
  id?: string;
}

export const TextAreaField = forwardRef<HTMLTextAreaElement, TextAreaFieldProps>(function TextAreaField(
  { label, hint, error, id, className, required, ...props },
  ref
) {
  const generated = useId();
  const fieldId = id ?? generated;
  return (
    <FieldShell id={fieldId} label={label} hint={hint} error={error} required={required} className={className}>
      <textarea
        ref={ref}
        id={fieldId}
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(fieldId, hint, error)}
        className={clsx(CONTROL_CLASS, "resize-y", error && "border-neon-pink/60")}
        {...props}
      />
    </FieldShell>
  );
});

export interface SelectFieldProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, "id"> {
  label: string;
  hint?: string;
  error?: string;
  id?: string;
  children: ReactNode;
}

export const SelectField = forwardRef<HTMLSelectElement, SelectFieldProps>(function SelectField(
  { label, hint, error, id, className, required, children, ...props },
  ref
) {
  const generated = useId();
  const fieldId = id ?? generated;
  return (
    <FieldShell id={fieldId} label={label} hint={hint} error={error} required={required} className={className}>
      <select
        ref={ref}
        id={fieldId}
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(fieldId, hint, error)}
        className={clsx(CONTROL_CLASS, "appearance-none", error && "border-neon-pink/60")}
        {...props}
      >
        {children}
      </select>
    </FieldShell>
  );
});

export interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "id" | "type"> {
  label: string;
  hint?: string;
  id?: string;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(function Checkbox(
  { label, hint, id, className, ...props },
  ref
) {
  const generated = useId();
  const fieldId = id ?? generated;
  return (
    <div className={clsx("flex items-start gap-2.5", className)}>
      <input
        ref={ref}
        id={fieldId}
        type="checkbox"
        aria-describedby={hint ? `${fieldId}-hint` : undefined}
        className="mt-0.5 h-4 w-4 shrink-0 rounded border-base-700 bg-base-900 accent-neon-cyan
                   disabled:opacity-50 disabled:cursor-not-allowed"
        {...props}
      />
      <div className="min-w-0">
        <label htmlFor={fieldId} className="text-sm text-ink-100 font-body">
          {label}
        </label>
        {hint && (
          <p id={`${fieldId}-hint`} className="text-xs text-ink-600">
            {hint}
          </p>
        )}
      </div>
    </div>
  );
});
