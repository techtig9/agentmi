"use client";

import { useEffect } from "react";

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // Keep the production UI useful without exposing stack traces or provider details.
    console.error("Agentmi application error");
  }, []);

  return (
    <main className="min-h-screen grid place-items-center p-6">
      <section className="neon-card max-w-lg p-8 text-center">
        <p className="text-neon-cyan font-mono text-sm mb-2">AGENTMI</p>
        <h1 className="text-2xl font-bold mb-3">Something went wrong</h1>
        <p className="text-ink-400 mb-6">The application hit an unexpected error. Your saved data has not been intentionally changed.</p>
        <button className="btn-primary" onClick={() => reset()}>Try again</button>
      </section>
    </main>
  );
}
