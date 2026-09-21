export interface ChangelogEntry {
  version: string;
  date: string;
  title: string;
  changes: string[];
}

/**
 * Public changelog.
 *
 * Each entry describes work that is actually in this repository. Nothing is
 * listed here as shipped that is not reachable in the product — a changelog
 * that advertises unbuilt features is worse than no changelog.
 */
export const CHANGELOG: ChangelogEntry[] = [
  {
    version: "1.4",
    date: "2026-09-21",
    title: "Light mode and a themeable design system",
    changes: [
      "Light, dark and system themes, remembered per browser and applied before the page paints.",
      "Every colour moved to a design token, so contrast is validated in both themes rather than only on dark.",
      "New teal accent and a node-graph motif on the landing page, drawn from the real execution pipeline.",
      "Pricing now has a monthly/yearly toggle, quoted through the same engine that bills you.",
    ],
  },
  {
    version: "1.3",
    date: "2026-09-14",
    title: "Deployments explain themselves",
    changes: [
      "A deployment without database credentials now serves a setup screen naming exactly which variables are missing, instead of an error page.",
      "API routes answer 503 with a machine-readable reason rather than a stack trace.",
      "Database migrations are re-runnable, so a second environment can be built from the same list.",
    ],
  },
  {
    version: "1.2",
    date: "2026-09-07",
    title: "Operations and the developer platform",
    changes: [
      "Observability and analytics over 24-hour, 7-day, 30-day and 90-day ranges, including P95 latency.",
      "Deployment disable, enable and rollback, with rollback promoting an older snapshot as a new version.",
      "API reference with curl, JavaScript and Python examples; key rotation; webhook delivery history.",
      "Fixed a defect that held every success rate at 0% by filtering on a run status the runtime never writes.",
    ],
  },
  {
    version: "1.1",
    date: "2026-08-31",
    title: "Knowledge, tools and workflows",
    changes: [
      "Knowledge sources can be re-indexed and deleted, and deletion removes the chunks immediately.",
      "Tools can be tested from the UI, running exactly as an agent would.",
      "Workflow builder with drag, delete, zoom and validation that blocks saving a broken graph.",
    ],
  },
];
