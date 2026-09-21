"use client";

import { useEffect, useState } from "react";
import { Monitor, Moon, Sun } from "lucide-react";
import clsx from "clsx";

import { THEME_STORAGE_KEY, isThemePreference, type ThemePreference } from "@/lib/theme/storage";

export { THEME_STORAGE_KEY };
export type { ThemePreference };

/**
 * Resolves a stored preference to the class that should be on <html>.
 * Exported so the inline boot script and the toggle cannot disagree.
 */
export function resolveTheme(preference: ThemePreference, prefersDark: boolean): "light" | "dark" {
  if (preference === "system") return prefersDark ? "dark" : "light";
  return preference;
}

export function readStoredPreference(): ThemePreference {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    if (isThemePreference(stored)) return stored;
  } catch {
    // Private mode or blocked storage: fall back to following the OS.
  }
  return "system";
}

function apply(preference: ThemePreference) {
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  document.documentElement.classList.toggle("dark", resolveTheme(preference, prefersDark) === "dark");
}

const OPTIONS: Array<{ id: ThemePreference; label: string; Icon: typeof Sun }> = [
  { id: "light", label: "Light", Icon: Sun },
  { id: "dark", label: "Dark", Icon: Moon },
  { id: "system", label: "System", Icon: Monitor },
];

/** Segmented light/dark/system control. Persists the choice per browser. */
export function ThemeToggle({ className }: { className?: string }) {
  // Starts as null so the server and the first client render agree; the real
  // value only exists in localStorage, which the server cannot see.
  const [preference, setPreference] = useState<ThemePreference | null>(null);

  useEffect(() => {
    setPreference(readStoredPreference());
  }, []);

  // While "system" is selected the page must follow the OS as it changes.
  useEffect(() => {
    if (preference !== "system") return;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => apply("system");
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, [preference]);

  function choose(next: ThemePreference) {
    setPreference(next);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      // Not persisting is acceptable; applying it to this page is not optional.
    }
    apply(next);
  }

  return (
    <div
      role="radiogroup"
      aria-label="Colour theme"
      className={clsx("inline-flex rounded-lg border border-base-700 p-0.5", className)}
    >
      {OPTIONS.map(({ id, label, Icon }) => {
        const active = preference === id;
        return (
          <button
            key={id}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={label}
            title={label}
            onClick={() => choose(id)}
            className={clsx(
              "rounded-md p-1.5 transition-colors duration-fast",
              active ? "bg-base-800 text-neon-cyan" : "text-ink-600 hover:text-ink-100"
            )}
          >
            <Icon className="h-4 w-4" aria-hidden="true" />
          </button>
        );
      })}
    </div>
  );
}
