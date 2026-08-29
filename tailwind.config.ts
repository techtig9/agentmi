import type { Config } from "tailwindcss";

// Cyber Neon Tech design tokens — see /docs/theme.md for rationale
const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
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
        },
        ink: {
          100: "#F4F6FB", // primary text
          400: "#9AA0B4", // secondary text
          600: "#82879F", // muted/disabled text — WCAG AA-compliant (5.3:1 on base-800, 5.7:1 on base-950; the original #5C6178 measured ~3:1, failing AA at the small text sizes this token is used at)
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
      },
      backgroundImage: {
        "aurora-grid":
          "radial-gradient(circle at 20% 20%, rgba(0,240,255,0.10), transparent 40%), radial-gradient(circle at 80% 0%, rgba(176,38,255,0.12), transparent 45%), radial-gradient(circle at 50% 100%, rgba(57,255,20,0.06), transparent 40%)",
      },
      borderRadius: {
        card: "16px",
      },
    },
  },
  plugins: [],
};

export default config;
