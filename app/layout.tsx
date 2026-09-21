import type { Metadata } from "next";
import localFont from "next/font/local";
import { ThemeScript } from "@/components/ui/ThemeScript";
import "./globals.css";

// Self-hosted instead of next/font/google: the previous version fetched CSS
// and font files from fonts.googleapis.com at build time, which fails in any
// build environment without that specific external network access (this
// sandbox included) and adds a hard runtime dependency on Google's CDN for
// every future build. These are the same real font files (sourced from
// @fontsource, which redistributes the official Google Fonts binaries),
// just bundled with the app instead of fetched at build time.
const display = localFont({
  src: [
    { path: "./fonts/space-grotesk-500.woff2", weight: "500", style: "normal" },
    { path: "./fonts/space-grotesk-700.woff2", weight: "700", style: "normal" },
  ],
  variable: "--font-display",
  display: "swap",
});
const body = localFont({
  src: "./fonts/inter-variable.woff2",
  weight: "100 900",
  variable: "--font-body",
  display: "swap",
});
const mono = localFont({
  src: "./fonts/jetbrains-mono-variable.woff2",
  weight: "100 800",
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Agentmi — Build AI Agents & ML Agents from a description",
  description:
    "Describe what you need. Agentmi's Prompt Engineer builds a working AI agent or trained ML model — no code required.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${display.variable} ${body.variable} ${mono.variable}`}
      // The boot script below adds `dark` before paint; React must not be
      // told the served markup is wrong when it does.
      suppressHydrationWarning
    >
      <head>
        <ThemeScript />
      </head>
      <body>{children}</body>
    </html>
  );
}
