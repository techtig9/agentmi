import { forwardRef, type InputHTMLAttributes } from "react";

interface NeonInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
}

export const NeonInput = forwardRef<HTMLInputElement, NeonInputProps>(
  ({ label, id, ...props }, ref) => (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm text-ink-400 font-body">
        {label}
      </label>
      <input
        ref={ref}
        id={id}
        className="rounded-lg bg-base-900 border border-base-700 px-3.5 py-2.5 text-ink-100
                   placeholder:text-ink-600 outline-none transition-colors duration-200
                   focus:border-neon-cyan/60 focus:shadow-neon-cyan"
        {...props}
      />
    </div>
  )
);
NeonInput.displayName = "NeonInput";
