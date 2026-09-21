import type { Config } from "tailwindcss";

/**
 * Agentmi design tokens.
 *
 * Every colour resolves to a CSS custom property defined in `globals.css`, as
 * an "R G B" channel triplet wrapped in `rgb(... / <alpha-value>)`. Two things
 * follow from that shape, and both are load-bearing:
 *
 *  - Tailwind's opacity modifiers keep working (`bg-accent/10`,
 *    `border-neon-cyan/40`). A plain `var(--x)` holding a hex string would
 *    silently break every one of those, and there are well over a hundred.
 *  - Light and dark are one variable swap, not two sets of classes. No
 *    component needs a `dark:` variant, so a screen cannot ship supporting
 *    only one theme.
 *
 * Names are kept from the previous palette (`base`, `neon`, `ink`) so existing
 * markup keeps its meaning; `neon-cyan` is now the product's teal accent
 * rather than literal cyan. New code should prefer the semantic aliases below.
 *
 * Contrast: every foreground token was validated against the surfaces it is
 * used on, in BOTH themes, at WCAG 2.2 AA (4.5:1). The light accent is
 * teal-700 rather than teal-600 because teal-600 measured 3.51:1 and failed.
 */
const channel = (name: string) => `rgb(var(${name}) / <alpha-value>)`;

const config: Config = {
  darkMode: "class",
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // ---- Layer 1: primitives (names retained for compatibility) --------
        base: {
          950: channel("--canvas"),
          900: channel("--panel"),
          800: channel("--surface"),
          700: channel("--hairline"),
        },
        neon: {
          cyan: channel("--accent"), // primary accent — teal
          violet: channel("--accent-secondary"), // supporting indigo
          green: channel("--state-success"),
          pink: channel("--state-danger"),
          amber: channel("--state-warning"),
        },
        ink: {
          100: channel("--content"),
          400: channel("--content-muted"),
          600: channel("--content-subtle"),
        },

        // ---- Layer 2: semantic aliases -------------------------------------
        canvas: channel("--canvas"),
        panel: channel("--panel"),
        surface: channel("--surface"),
        elevated: channel("--elevated"),
        hairline: channel("--hairline"),
        content: {
          DEFAULT: channel("--content"),
          muted: channel("--content-muted"),
          subtle: channel("--content-subtle"),
          inverted: channel("--canvas"),
        },
        accent: {
          DEFAULT: channel("--accent"),
          secondary: channel("--accent-secondary"),
        },
        state: {
          success: channel("--state-success"),
          warning: channel("--state-warning"),
          danger: channel("--state-danger"),
          info: channel("--state-info"),
        },
      },
      fontFamily: {
        display: ["var(--font-display)", "sans-serif"],
        body: ["var(--font-body)", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
      },
      boxShadow: {
        "neon-cyan": "0 0 0 1px rgb(var(--accent) / 0.35), 0 0 24px rgb(var(--accent) / 0.22)",
        "neon-violet":
          "0 0 0 1px rgb(var(--accent-secondary) / 0.35), 0 0 24px rgb(var(--accent-secondary) / 0.22)",
        popover: "var(--shadow-popover)",
      },
      backgroundImage: {
        "aurora-grid":
          "radial-gradient(circle at 20% 20%, rgb(var(--accent) / 0.10), transparent 40%), radial-gradient(circle at 80% 0%, rgb(var(--accent-secondary) / 0.12), transparent 45%), radial-gradient(circle at 50% 100%, rgb(var(--state-success) / 0.06), transparent 40%)",
        // Node-graph motif: the product's own shape, used behind the hero.
        "node-grid":
          "radial-gradient(circle at 1px 1px, rgb(var(--content) / 0.07) 1px, transparent 0)",
      },
      borderRadius: {
        card: "16px",
      },
      transitionDuration: {
        fast: "150ms",
        base: "200ms",
        slow: "300ms",
      },
      keyframes: {
        "fade-in": { from: { opacity: "0" }, to: { opacity: "1" } },
        "scale-in": {
          from: { opacity: "0", transform: "translateY(4px) scale(0.98)" },
          to: { opacity: "1", transform: "translateY(0) scale(1)" },
        },
        "rise-in": {
          from: { opacity: "0", transform: "translateY(16px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        shimmer: { "100%": { transform: "translateX(100%)" } },
        // Signal travelling along a connector in the node-graph motif.
        "flow-dash": { to: { strokeDashoffset: "-24" } },
        "pulse-node": {
          "0%, 100%": { opacity: "0.45", transform: "scale(1)" },
          "50%": { opacity: "1", transform: "scale(1.12)" },
        },
      },
      animation: {
        "fade-in": "fade-in 200ms ease-out",
        "scale-in": "scale-in 200ms ease-out",
        "rise-in": "rise-in 300ms ease-out both",
        shimmer: "shimmer 1.6s infinite",
        "flow-dash": "flow-dash 1.2s linear infinite",
        "pulse-node": "pulse-node 2.4s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
