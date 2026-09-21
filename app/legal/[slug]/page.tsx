import Link from "next/link";
import { notFound } from "next/navigation";
import { AlertTriangle } from "lucide-react";
import { LEGAL_DOCUMENTS, legalDocument } from "@/lib/content/legal";
import { pageMetadata } from "@/lib/seo/site";
import { LandingNav } from "@/components/marketing/LandingNav";

export function generateStaticParams() {
  return LEGAL_DOCUMENTS.map((doc) => ({ slug: doc.slug }));
}

export function generateMetadata({ params }: { params: { slug: string } }) {
  const doc = legalDocument(params.slug);
  if (!doc) return {};
  return pageMetadata({
    title: `${doc.title} — Agentmi`,
    description: doc.summary,
    path: `/legal/${doc.slug}`,
  });
}

export default function LegalPage({ params }: { params: { slug: string } }) {
  const doc = legalDocument(params.slug);
  if (!doc) notFound();

  return (
    <div className="min-h-screen bg-base-950">
      <a href="#main" className="skip-link">
        Skip to main content
      </a>
      <LandingNav />

      <main id="main" className="mx-auto max-w-3xl px-4 py-16">
        {/* Part of the content, not decoration: these have not been reviewed
            by a lawyer and must not be presented as if they had. */}
        <div
          role="note"
          className="mb-8 flex items-start gap-3 rounded-lg border border-neon-amber/30 bg-neon-amber/5 p-4"
        >
          <AlertTriangle size={16} aria-hidden="true" className="mt-0.5 shrink-0 text-neon-amber" />
          <p className="text-sm leading-relaxed text-ink-400">
            <strong className="text-ink-100">Draft, pending legal review.</strong> This document
            describes how the product actually behaves, but it has not been reviewed by a lawyer and
            is not yet a binding agreement.
          </p>
        </div>

        <h1 className="font-display text-3xl font-bold">{doc.title}</h1>
        <p className="mt-2 text-ink-400">{doc.summary}</p>
        <p className="mt-1 font-mono text-xs text-ink-600">
          Last updated{" "}
          <time dateTime={doc.lastUpdated}>
            {new Date(doc.lastUpdated).toLocaleDateString(undefined, {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </time>
        </p>

        <div className="mt-10 space-y-8">
          {doc.sections.map((section) => (
            <section key={section.heading}>
              <h2 className="font-display text-lg font-bold">{section.heading}</h2>
              <ul className="mt-3 space-y-2.5">
                {section.body.map((paragraph) => (
                  <li key={paragraph} className="flex gap-2.5 text-sm leading-relaxed text-ink-400">
                    <span aria-hidden="true" className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-neon-cyan" />
                    {paragraph}
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>

        <nav aria-label="Other legal documents" className="mt-14 border-t border-base-700 pt-6">
          <p className="font-mono text-xs uppercase tracking-wider text-ink-600">Also see</p>
          <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-2">
            {LEGAL_DOCUMENTS.filter((other) => other.slug !== doc.slug).map((other) => (
              <li key={other.slug}>
                <Link href={`/legal/${other.slug}`} className="text-sm text-neon-cyan hover:underline">
                  {other.title}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </main>
    </div>
  );
}
