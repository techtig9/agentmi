export interface DocSection {
  id: string;
  title: string;
  summary: string;
  /** Where in the app this is done. */
  href: string;
  points: string[];
}

/**
 * The product handbook.
 *
 * Every section describes behaviour that exists in this codebase and links to
 * the screen where it is done — the documentation and the product cannot drift
 * apart into describing different systems.
 */
export const DOC_SECTIONS: DocSection[] = [
  {
    id: "getting-started",
    title: "Getting Started",
    summary: "From an empty workspace to a working agent.",
    href: "/dashboard/create",
    points: [
      "Describe what you want in plain language; Agentmi suggests whether that is an AI agent or an ML agent.",
      "An AI agent is powered by a language model. An ML agent is trained on a dataset you upload and makes predictions on structured data.",
      "Building charges credits once. Your plan's allowance and remaining balance are shown in Usage & Costs.",
      "A new AI agent is usable immediately — open the playground and talk to it.",
    ],
  },
  {
    id: "agents",
    title: "Agents",
    summary: "Identity, instructions, model and limits.",
    href: "/dashboard/agents",
    points: [
      "The builder edits the agent's name, description, system instructions, model override and maximum response tokens.",
      "Leaving the instructions empty uses the template's prompt. The company-name placeholder is substituted at run time.",
      "A model override pins a specific model id; leave it empty and provider routing picks a configured provider.",
      "Archiving hides an agent without deleting its runs, knowledge or deployments, and can be undone.",
    ],
  },
  {
    id: "knowledge",
    title: "Knowledge",
    summary: "Grounding answers in your own material.",
    href: "/dashboard/knowledge",
    points: [
      "Attach pasted text or a public HTTPS page. Content is split into overlapping chunks so a fact is never cut in half.",
      "Each chunk is embedded and the closest ones are retrieved for every question, inside a clearly delimited block the model is told is reference material.",
      "Re-indexing a URL source re-fetches the page. Re-indexing a text source re-embeds the stored chunks.",
      "Deleting a source removes its chunks immediately, so the agent stops using that content at once.",
    ],
  },
  {
    id: "tools",
    title: "Tools",
    summary: "Letting an agent do things, not just answer.",
    href: "/dashboard/tools",
    points: [
      "A tool is an HTTP endpoint the agent may call mid-conversation, with a description the model reads to decide when to use it.",
      "Requests go through an SSRF-guarded client: private, loopback and link-local addresses are refused.",
      "Credentials come from the secrets vault and are sent as a bearer token. A credential is never stored in the tool's config.",
      "Test connection runs the tool exactly as an agent would, so a green result means the agent's call will work too.",
    ],
  },
  {
    id: "workflows",
    title: "Workflows",
    summary: "Routing work across several agents.",
    href: "/dashboard/workflows",
    points: [
      "A workflow is a graph: a Start node, Agent and Router steps, and an End node, connected into a path.",
      "Validation runs before saving. A missing Start node, an agent step with no agent, or a loop blocks the save.",
      "An unreachable node is a warning rather than an error — it saves, but it will never run.",
      "Multi-Agent shows the same graph as roles and routing, so you can see which agent fills each step.",
    ],
  },
  {
    id: "evaluations",
    title: "Evaluations",
    summary: "Proving an agent behaves before shipping it.",
    href: "/dashboard/evaluations",
    points: [
      "An evaluation is a set of cases: an input and the text the reply should contain.",
      "Running one executes against the same runtime production uses — there is no separate evaluation path that could behave differently.",
      "Each case records expected versus actual output so a failure shows what the agent actually said.",
      "Evaluation runs consume credits like any other execution.",
    ],
  },
  {
    id: "runs",
    title: "Runs & Observability",
    summary: "What your agents actually did.",
    href: "/dashboard/runs",
    points: [
      "Every execution is recorded with its status, duration, trace and any error, whether it came from the playground or the API.",
      "The trace lists each step: knowledge retrieval, the model call with its provider, and every tool call with its outcome.",
      "Observability aggregates the same records into success rate, error rate, average and P95 latency over a chosen range.",
      "A run still in flight counts toward the total but is excluded from the success rate, so it never reads as a failure.",
    ],
  },
  {
    id: "deployments",
    title: "Deployments",
    summary: "Putting an agent behind a stable endpoint.",
    href: "/dashboard/deployments",
    points: [
      "Deploying a ready AI agent creates a versioned endpoint and snapshots its configuration.",
      "Only deployments with status Live serve traffic. Disabling stops requests without deleting anything.",
      "Rolling back promotes an older snapshot as a new version rather than rewriting history, so run records keep pointing at the deployment that served them.",
      "Re-enabling checks the underlying agent is still ready first.",
    ],
  },
  {
    id: "api",
    title: "API",
    summary: "Calling Agentmi from your own product.",
    href: "/dashboard/api",
    points: [
      "Authenticate with an Authorization bearer header. Keys are workspace-scoped and cannot reach another organization.",
      "POST /api/v1/deployments/{id}/run is the usual production entry point.",
      "POST /api/v1/agents/{id}/chat talks to an agent directly; /predict returns an ML agent's prediction.",
      "Requests are rate limited. A 429 carries a Retry-After header telling you how long to wait.",
      "Keep keys server-side. A key in browser code is readable by anyone who opens the page.",
    ],
  },
  {
    id: "webhooks",
    title: "Webhooks",
    summary: "Being told when something happens.",
    href: "/dashboard/webhooks",
    points: [
      "Register a URL and subscribe it to events such as agent.created or knowledge.updated.",
      "Every delivery is HMAC-signed. Verify the signature before trusting a payload — an unsigned POST to your endpoint proves nothing.",
      "Delivery attempts are recorded with the status your endpoint returned, so a silently failing integration is visible.",
    ],
  },
  {
    id: "security",
    title: "Security",
    summary: "How your workspace is isolated and protected.",
    href: "/dashboard/security",
    points: [
      "Every table enforces row-level security scoped to your organization, and permissions are re-checked server-side on every action.",
      "Enable two-factor authentication under Settings. Without it, a password alone protects every agent, key and secret.",
      "Only a hash of each API key is stored, so a secret is shown once and never again. Rotation issues the replacement before revoking the old key.",
      "Secrets are stored as references to server-side variables. The value never reaches the browser and cannot be read back.",
      "Configuration, deployment and security-sensitive changes are recorded in the audit log with the account that made them.",
    ],
  },
  {
    id: "billing",
    title: "Billing & Credits",
    summary: "What costs what.",
    href: "/dashboard/billing",
    points: [
      "Credits are consumed per billable action: building an agent, sending a message, training a model, running a prediction.",
      "Your plan grants a monthly allowance. Usage & Costs itemises where credits went and estimates remaining runway from observed burn.",
      "An organization's first agent build is discounted so you get a working result before the full cost applies.",
      "Paddle handles payment and remains the source of truth for what was actually billed.",
    ],
  },
];

/** Matches a query against a section's title, summary and every bullet. */
export function searchDocs(sections: DocSection[], query: string): DocSection[] {
  const q = query.trim().toLowerCase();
  if (!q) return sections;
  return sections.filter((section) =>
    `${section.title} ${section.summary} ${section.points.join(" ")}`.toLowerCase().includes(q)
  );
}
