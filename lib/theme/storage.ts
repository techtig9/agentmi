/**
 * The localStorage key for the theme preference.
 *
 * It lives in its own module with no "use client" directive because BOTH a
 * client component and a server component need it. Importing a constant from
 * a client module into a server component does not give you the value — it
 * gives a client-reference proxy, and `JSON.stringify` of that is `{}`. That
 * is exactly what shipped: the boot script rendered
 * `localStorage.getItem({})`, so the stored preference was never read and
 * every page load silently fell back to the OS setting.
 */
export const THEME_STORAGE_KEY = "agentmi-theme";

export type ThemePreference = "light" | "dark" | "system";

export function isThemePreference(value: unknown): value is ThemePreference {
  return value === "light" || value === "dark" || value === "system";
}
