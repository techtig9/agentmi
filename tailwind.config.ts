import type { Config } from "tailwindcss";

/**
 * Agentmi design tokens — "Premium Dark AI Operating System".
 *
 * Two layers, deliberately:
 *
 *  1. PRIMITIVE scales (`base`, `neon`, `ink`) — the raw palette. These are the
 *     original tokens and every existing class that referenced them keeps its
 *     exact meaning, so adding layer 2 cannot regress any screen.
 *  2. SEMANTIC aliases (`surface`, `accent`, `success`, `danger`, …) — what a
 *     color *means* rather than what it looks like. New code should reach for
 *     these so a future palette change is a one-file edit instead of a
 *     repo-wide find-and-replace.
 *
 * Contrast note: every foreground token below was checked against the surface
 * it is used on and meets WCAG 2.2 AA for its size class. `ink-600` in
 * particular is #82879F rather than a darker grey because the original value
 * measured ~3:1 and failed AA at the small sizes it is used at.
 */
const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // ---- Layer 1: primitives -------------------------------------------
        base: {
          950: "#07070C", // page background
          900: "#0A0A0F", // panel background
          800: "#121218", // card background
          700: "#1B1B24", // card border (resting)
        },
        neon: {
          cyan: "#00F0FF",
          violet: "#B026FF",
          green: "#39FF14",
          pink: "#FF2E9A",
          amber: "#FFB020", // warning — the palette had no warning hue
        },
        ink: {
          100: "#F4F6FB", // primary text
          400: "#9AA0B4", // secondary text
          600: "#82879F", // muted/disabled text — AA at small sizes
        },

        // ---- Layer 2: semantic aliases -------------------------------------
        canvas: "#07070C", // page background
        panel: "#0A0A0F", // nav/rail background
        surface: "#121218", // resting card/control surface
        elevated: "#1B1B24", // raised surface (menus, popovers, hover rows)
        hairline: "#1B1B24", // default border
        content: {
          DEFAULT: "#F4F6FB", // primary text
          muted: "#9AA0B4", // secondary text
          subtle: "#82879F", // tertiary/disabled text
          inverted: "#07070C", // text on a neon fill
        },
        accent: {
          DEFAULT: "#00F0FF", // primary accent
          secondary: "#B026FF", // secondary accent
        },
        state: {
          success: "#39FF14",
          warning: "#FFB020",
          danger: "#FF2E9A",
          info: "#00F0FF",
        },
      },
      fontFamily: {
        display: ["var(--font-display)", "sans-serif"],
        body: ["var(--font-body)", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
      },
      boxShadow: {
        "neon-cyan": "0 0 0 1px rgba(0,240,255,0.35), 0 0 24px rgba(0,240,255,0.25)",
        "neon-violet": "0 0 0 1px rgba(176,38,255,0.35), 0 0 24px rgba(176,38,255,0.25)",
        // Restrained elevation for menus/popovers — depth without a glow halo.
        popover: "0 16px 40px -12px rgba(0,0,0,0.7), 0 0 0 1px rgba(27,27,36,1)",
      },
      backgroundImage: {
        "aurora-grid":
          "radial-gradient(circle at 20% 20%, rgba(0,240,255,0.10), transparent 40%), radial-gradient(circle at 80% 0%, rgba(176,38,255,0.12), transparent 45%), radial-gradient(circle at 50% 100%, rgba(57,255,20,0.06), transparent 40%)",
      },
      borderRadius: {
        card: "16px",
      },
      transitionDuration: {
        // The 150-300ms band the design system standardises on.
        fast: "150ms",
        base: "200ms",
        slow: "300ms",
      },
      keyframes: {
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        "scale-in": {
          from: { opacity: "0", transform: "translateY(4px) scale(0.98)" },
          to: { opacity: "1", transform: "translateY(0) scale(1)" },
        },
        shimmer: {
          "100%": { transform: "translateX(100%)" },
        },
      },
      animation: {
        "fade-in": "fade-in 200ms ease-out",
        "scale-in": "scale-in 200ms ease-out",
        shimmer: "shimmer 1.6s infinite",
      },
    },
  },
  plugins: [],
};

export default config;
