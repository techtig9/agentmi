import Link from "next/link";
import { CHANGELOG } from "@/lib/content/changelog";
import { pageMetadata } from "@/lib/seo/site";
import { LandingNav } from "@/components/marketing/LandingNav";

export const metadata = pageMetadata({
  title: "Changelog — Agentmi",
  description: "What shipped in Agentmi, and when.",
  path: "/changelog",
});

export default function ChangelogPage() {
  return (
    <div className="min-h-screen bg-base-950">
      <a href="#main" className="skip-link">
        Skip to main content
      </a>
      <LandingNav />
      <main id="main" className="mx-auto max-w-3xl px-4 py-16">
        <p className="font-mono text-xs uppercase tracking-wider text-neon-cyan">Changelog</p>
        <h1 className="mt-2 font-display text-3xl font-bold">What shipped, and when</h1>
        <p className="mt-3 text-ink-400">
          Every entry describes something you can use in the product today.
        </p>

        <ol className="mt-12 space-y-8">
          {CHANGELOG.map((entry) => (
            <li key={entry.version} className="neon-card p-6">
              <div className="flex flex-wrap items-baseline gap-3">
                <span className="font-mono text-sm text-neon-cyan">v{entry.version}</span>
                <time dateTime={entry.date} className="font-mono text-xs text-ink-600">
                  {new Date(entry.date).toLocaleDateString(undefined, {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </time>
              </div>
              <h2 className="mt-2 font-display text-lg font-bold">{entry.title}</h2>
              <ul className="mt-3 space-y-2">
                {entry.changes.map((change) => (
                  <li key={change} className="flex gap-2.5 text-sm leading-relaxed text-ink-400">
                    <span aria-hidden="true" className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-neon-cyan" />
                    {change}
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ol>

        <p className="mt-12 text-sm text-ink-600">
          <Link href="/" className="text-neon-cyan hover:underline">
            Back to home
          </Link>
        </p>
      </main>
    </div>
  );
}
