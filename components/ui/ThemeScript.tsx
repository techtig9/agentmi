import { THEME_STORAGE_KEY } from "@/lib/theme/storage";

/**
 * Applies the stored theme before the browser paints.
 *
 * This has to be an inline, synchronous script in <head>: the preference lives
 * in localStorage, which no server render can read, so any React-based
 * approach would paint the default theme first and then correct it — a visible
 * flash on every navigation to a cold page. It is wrapped in try/catch because
 * localStorage throws outright in some privacy modes, and a theme preference
 * is never worth breaking the page for.
 */
export function ThemeScript() {
  const script = `(function(){try{var p=localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)});var d=p==="dark"||((p===null||p==="system")&&window.matchMedia("(prefers-color-scheme: dark)").matches);document.documentElement.classList.toggle("dark",d);}catch(e){document.documentElement.classList.add("dark");}})();`;
  return <script dangerouslySetInnerHTML={{ __html: script }} />;
}
