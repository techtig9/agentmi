import Link from "next/link";
import { AlertTriangle, KeyRound, ShieldCheck, Webhook } from "lucide-react";
import { PlatformPage } from "@/components/dashboard/PlatformPage";
import { CodeTabs, CodeBlock } from "@/components/dashboard/CodeBlock";

/**
 * Every sample below targets a route that exists in this codebase and uses its
 * real request shape. The key is always the placeholder `<agentmi-api-key>` —
 * a documentation page must never render a live credential.
 */
const BASE = "https://your-app";

const ENDPOINTS = [
  {
    id: "deployment-run",
    method: "POST",
    path: "/api/v1/deployments/{deploymentId}/run",
    summary: "Run a deployed agent. The usual production entry point.",
    samples: [
      {
        language: "curl",
        code: `curl -X POST ${BASE}/api/v1/deployments/{deploymentId}/run \\
  -H "Authorization: Bearer <agentmi-api-key>" \\
  -H "Content-Type: application/json" \\
  -d '{"message":"Summarise our refund policy"}'`,
      },
      {
        language: "JavaScript",
        code: `const res = await fetch(
  "${BASE}/api/v1/deployments/{deploymentId}/run",
  {
    method: "POST",
    headers: {
      Authorization: \`Bearer \${process.env.AGENTMI_API_KEY}\`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ message: "Summarise our refund policy" }),
  }
);

if (!res.ok) throw new Error(\`Agentmi returned \${res.status}\`);
const { reply } = await res.json();`,
      },
      {
        language: "Python",
        code: `import os, requests

res = requests.post(
    "${BASE}/api/v1/deployments/{deploymentId}/run",
    headers={
        "Authorization": f"Bearer {os.environ['AGENTMI_API_KEY']}",
        "Content-Type": "application/json",
    },
    json={"message": "Summarise our refund policy"},
    timeout=30,
)
res.raise_for_status()
reply = res.json()["reply"]`,
      },
    ],
  },
  {
    id: "agent-chat",
    method: "POST",
    path: "/api/v1/agents/{agentId}/chat",
    summary: "Talk to an AI agent directly, without going through a deployment.",
    samples: [
      {
        language: "curl",
        code: `curl -X POST ${BASE}/api/v1/agents/{agentId}/chat \\
  -H "Authorization: Bearer <agentmi-api-key>" \\
  -H "Content-Type: application/json" \\
  -d '{"message":"What is your return window?"}'`,
      },
      {
        language: "JavaScript",
        code: `const res = await fetch("${BASE}/api/v1/agents/{agentId}/chat", {
  method: "POST",
  headers: {
    Authorization: \`Bearer \${process.env.AGENTMI_API_KEY}\`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({ message: "What is your return window?" }),
});

const { reply, sources_used, model } = await res.json();`,
      },
      {
        language: "Python",
        code: `res = requests.post(
    "${BASE}/api/v1/agents/{agentId}/chat",
    headers={"Authorization": f"Bearer {os.environ['AGENTMI_API_KEY']}"},
    json={"message": "What is your return window?"},
    timeout=30,
)
data = res.json()
print(data["reply"], data["sources_used"], data["model"])`,
      },
    ],
  },
  {
    id: "agent-predict",
    method: "POST",
    path: "/api/v1/agents/{agentId}/predict",
    summary: "Get a prediction from a trained ML agent. Send the model's feature columns.",
    samples: [
      {
        language: "curl",
        code: `curl -X POST ${BASE}/api/v1/agents/{agentId}/predict \\
  -H "Authorization: Bearer <agentmi-api-key>" \\
  -H "Content-Type: application/json" \\
  -d '{"features":{"tenure_months":14,"monthly_spend":82.5}}'`,
      },
      {
        language: "JavaScript",
        code: `const res = await fetch("${BASE}/api/v1/agents/{agentId}/predict", {
  method: "POST",
  headers: {
    Authorization: \`Bearer \${process.env.AGENTMI_API_KEY}\`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    features: { tenure_months: 14, monthly_spend: 82.5 },
  }),
});

const prediction = await res.json();`,
      },
      {
        language: "Python",
        code: `res = requests.post(
    "${BASE}/api/v1/agents/{agentId}/predict",
    headers={"Authorization": f"Bearer {os.environ['AGENTMI_API_KEY']}"},
    json={"features": {"tenure_months": 14, "monthly_spend": 82.5}},
    timeout=30,
)
print(res.json())`,
      },
    ],
  },
] as const;

const STATUS_CODES: ReadonlyArray<readonly [string, string]> = [
  ["200", "The run completed. The body carries the result."],
  ["400", "The request body was missing or malformed."],
  ["401", "The API key is missing, malformed or revoked."],
  ["402", "Not enough credits to run this request."],
  ["404", "No such agent or deployment in this workspace."],
  ["409", "The agent or deployment is not in a runnable state."],
  ["429", "Rate limit exceeded. Retry after the seconds in Retry-After."],
  ["502", "The agent ran but the execution failed. Check Runs for the trace."],
];

export default function ApiPage() {
  return (
    <PlatformPage
      eyebrow="Deploy"
      title="API & SDK"
      description="Call your agents from your own product over HTTP. Every request is authenticated, rate limited and recorded as a run."
      action={{ href: "/dashboard/api-keys", label: "Manage API keys" }}
    >
      <section className="neon-card p-5">
        <h2 className="flex items-center gap-2 text-lg font-bold">
          <ShieldCheck size={17} className="text-neon-cyan" aria-hidden="true" />
          Authentication
        </h2>
        <p className="mt-2 max-w-3xl text-sm text-ink-400">
          Send your key as a bearer token on every request. Keys are workspace-scoped: a key can
          only reach agents and deployments in the organization that issued it.
        </p>
        <div className="mt-4">
          <CodeBlock language="header" code={`Authorization: Bearer <agentmi-api-key>`} />
        </div>
        <p className="mt-4 flex items-start gap-2 rounded-lg border border-neon-amber/25 bg-neon-amber/5 p-3 text-xs text-neon-amber">
          <AlertTriangle size={14} className="mt-0.5 shrink-0" aria-hidden="true" />
          Keep keys on your server. A key in browser code is readable by anyone who opens the page.
        </p>
      </section>

      <section className="mt-6 space-y-6">
        <h2 className="text-lg font-bold">Endpoints</h2>
        {ENDPOINTS.map((endpoint) => (
          <div key={endpoint.id} className="neon-card p-5">
            <div className="mb-1 flex flex-wrap items-center gap-2">
              <span className="rounded border border-neon-cyan/30 bg-neon-cyan/10 px-2 py-0.5 font-mono text-[10px] font-bold text-neon-cyan">
                {endpoint.method}
              </span>
              <code className="font-mono text-sm text-ink-100">{endpoint.path}</code>
            </div>
            <p className="mb-4 text-sm text-ink-400">{endpoint.summary}</p>
            <CodeTabs samples={[...endpoint.samples]} />
          </div>
        ))}
      </section>

      <section className="mt-6 neon-card p-5">
        <h2 className="text-lg font-bold">Response codes</h2>
        <dl className="mt-4 divide-y divide-base-700">
          {STATUS_CODES.map(([code, meaning]) => (
            <div key={code} className="flex gap-4 py-2.5">
              <dt className="w-12 shrink-0 font-mono text-sm text-neon-cyan">{code}</dt>
              <dd className="text-sm text-ink-400">{meaning}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="mt-6 grid gap-4 sm:grid-cols-2">
        <Link href="/dashboard/api-keys" className="neon-card p-5">
          <KeyRound size={17} className="text-neon-cyan" aria-hidden="true" />
          <h3 className="mt-3 font-display font-bold">API keys</h3>
          <p className="mt-1.5 text-sm text-ink-400">
            Issue, rotate and revoke keys. A new secret is shown once and never again.
          </p>
        </Link>
        <Link href="/dashboard/webhooks" className="neon-card p-5">
          <Webhook size={17} className="text-neon-cyan" aria-hidden="true" />
          <h3 className="mt-3 font-display font-bold">Webhooks</h3>
          <p className="mt-1.5 text-sm text-ink-400">
            Receive signed events when agents change state, with delivery history.
          </p>
        </Link>
      </section>
    </PlatformPage>
  );
}
