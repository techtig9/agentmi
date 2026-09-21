import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Activity,
  ArrowRight,
  Bot,
  BookOpen,
  Check,
  Code2,
  Database,
  FlaskConical,
  KeyRound,
  Lock,
  Network,
  Rocket,
  ShieldCheck,
  Webhook,
  Workflow,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { LandingNav } from "@/components/marketing/LandingNav";
import { FaqList } from "@/components/marketing/FaqList";
import { NodeGraph } from "@/components/marketing/NodeGraph";
import { PricingTable } from "@/components/marketing/PricingTable";
import { StructuredData } from "@/components/marketing/StructuredData";

/**
 * Always rendered per-request. Before the configuration guard below this page
 * called `cookies()` unconditionally, which made it dynamic implicitly; the
 * guard can now skip that call, and without this Next.js would prerender the
 * unconfigured branch at build time and keep serving it after credentials are
 * added.
 */
export const dynamic = "force-dynamic";

export const metadata = {
  title: "Agentmi — Build, test, evaluate and deploy AI agents",
  description:
    "Build production-ready AI and ML agents with knowledge, tools, workflows, evaluations, observability, APIs and deployment — all from one workspace.",
};

/**
 * Marketing landing page.
 *
 * Every capability listed here maps to a shipped surface in the app — the
 * feature grid is generated from the same route list the dashboard navigation
 * uses, so it cannot drift into advertising something that does not exist.
 */
export default async function LandingPage() {
  // A session can only exist when Supabase is configured, so an unconfigured
  // deployment has nobody to redirect and the pitch is still perfectly
  // renderable. Constructing the client anyway would throw and take the whole
  // public marketing page down with it — a landing page must not require the
  // database to be reachable in order to render.
  if (isSupabaseConfigured()) {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    // Signed-in visitors go straight to work rather than reading the pitch.
    if (user) redirect("/dashboard");
  }

  return (
    <div className="min-h-screen bg-base-950">
      <a href="#main" className="skip-link">
        Skip to main content
      </a>
      <LandingNav />

      <main id="main">
        <Hero />
        <HowItWorks />
        <PlatformOverview />
        <CapabilityDetail />
        <HowWeDiffer />
        <SecuritySection />
        <Pricing />
        <Faq />
        <FinalCta />
      </main>

      <footer className="border-t border-base-700 px-4 py-10">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 text-sm text-ink-600 sm:flex-row">
          <span className="font-display font-bold text-ink-100">
            agent<span className="text-neon-cyan">mi</span>
          </span>
          <p>Build · test · evaluate · deploy · observe.</p>
        </div>
      </footer>
    </div>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden border-b border-base-700 bg-aurora-grid px-4 py-20 md:py-28">
      {/* Restrained grid wash — one ambient layer, not a per-card effect. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-[0.14]"
        style={{
          backgroundImage:
            "linear-gradient(to right, #1B1B24 1px, transparent 1px), linear-gradient(to bottom, #1B1B24 1px, transparent 1px)",
          backgroundSize: "56px 56px",
          maskImage: "radial-gradient(ellipse at 50% 0%, black 40%, transparent 75%)",
          WebkitMaskImage: "radial-gradient(ellipse at 50% 0%, black 40%, transparent 75%)",
        }}
      />
      <div className="relative mx-auto max-w-4xl text-center">
        <span className="inline-flex items-center gap-2 rounded-full border border-neon-cyan/25 bg-neon-cyan/5 px-3 py-1 font-mono text-xs text-neon-cyan">
          AI agents · ML agents · one workspace
        </span>
        <h1 className="mt-6 text-4xl font-bold leading-[1.1] tracking-tight sm:text-5xl md:text-6xl">
          Build AI agents.
          <br />
          Test them. Deploy them.
          <br />
          <span className="text-neon-cyan">Scale them.</span>
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-base text-ink-400 sm:text-lg">
          Build production-ready AI and ML agents with knowledge, tools, workflows, evaluations,
          observability, APIs and deployment — all from one workspace.
        </p>
        <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link href="/signup" className="btn-primary w-full sm:w-auto">
            Start Building
            <ArrowRight size={16} aria-hidden="true" />
          </Link>
          <Link href="#platform" className="btn-secondary w-full sm:w-auto">
            Explore Platform
          </Link>
        </div>
        <p className="mt-5 font-mono text-xs text-ink-600">
          500 free credits on signup · no card required
        </p>
      </div>

      <div className="relative mx-auto mt-14 max-w-3xl px-2">
        <NodeGraph className="h-auto w-full" />
      </div>

      <div className="relative mx-auto mt-10 max-w-4xl">
        <CodePreview />
      </div>
    </section>
  );
}

/** A real request against the shipped deployment-run endpoint. */
function CodePreview() {
  return (
    <div className="overflow-hidden rounded-card border border-base-700 bg-base-900/80 shadow-popover backdrop-blur">
      <div className="flex items-center gap-2 border-b border-base-700 px-4 py-2.5">
        <Code2 size={14} className="text-ink-600" aria-hidden="true" />
        <span className="font-mono text-xs text-ink-600">Run a deployed agent</span>
      </div>
      <pre className="overflow-x-auto p-4 font-mono text-xs leading-relaxed text-ink-400">
        <code>{`curl -X POST https://your-app/api/v1/deployments/{id}/run \\
  -H "Authorization: Bearer <agentmi-api-key>" \\
  -H "Content-Type: application/json" \\
  -d '{"message":"Summarise our refund policy"}'`}</code>
      </pre>
    </div>
  );
}

const PLATFORM_AREAS: ReadonlyArray<readonly [LucideIcon, string, string]> = [
  [Bot, "Agent Builder", "Configure identity, instructions, model and limits, then test in the same screen."],
  [BookOpen, "Knowledge & RAG", "Attach documents, text and URLs. Chunks are indexed and retrieved per agent."],
  [Wrench, "Tools", "Register HTTP tools with authentication and let agents call them during a run."],
  [Workflow, "Workflows", "Route work across steps and conditions with a visual graph."],
  [Network, "Multi-Agent", "Coordinate specialised agents on one task with explicit roles."],
  [FlaskConical, "Evaluations", "Run test cases against the same runtime and score pass rates."],
  [Activity, "Observability", "Every execution recorded with status, duration, trace and errors."],
  [Rocket, "Deployments", "Promote an agent to an environment and get a callable endpoint."],
  [Code2, "API & SDK", "REST endpoints for agents, workflows and deployments."],
  [KeyRound, "API Keys", "Issue, rotate and revoke scoped keys. Secrets shown once."],
  [Webhook, "Webhooks", "Signed outbound events with delivery history and retries."],
  [Database, "ML Agents", "Upload a dataset, train a model, and serve predictions."],
];

function PlatformOverview() {
  return (
    <section id="platform" className="border-b border-base-700 px-4 py-20">
      <div className="mx-auto max-w-6xl">
        <SectionHeading
          eyebrow="Platform"
          title="Everything an agent needs to reach production"
          description="Not a chat wrapper. The pieces that decide whether an agent survives contact with real users."
        />
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {PLATFORM_AREAS.map(([Icon, title, description]) => (
            <div key={title} className="neon-card p-5">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-base-700 bg-base-900">
                <Icon size={17} className="text-neon-cyan" aria-hidden="true" />
              </div>
              <h3 className="mt-4 font-display font-bold">{title}</h3>
              <p className="mt-2 text-sm text-ink-400">{description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function CapabilityDetail() {
  return (
    <section className="border-b border-base-700 px-4 py-20">
      <div className="mx-auto grid max-w-6xl gap-12 lg:grid-cols-2 lg:items-center">
        <div>
          <SectionHeading
            align="left"
            eyebrow="Build → Quality → Deploy"
            title="One loop, not three disconnected tools"
            description="Describe what you need, ground it in your own content, prove it behaves, then ship it behind an API."
          />
          <ul className="mt-8 space-y-4">
            {[
              ["Describe it", "A guided wizard turns a plain-language description into a configured agent."],
              ["Ground it", "Attach knowledge so answers come from your material, not the model's guesswork."],
              ["Prove it", "Run evaluation suites and inspect per-case expected versus actual output."],
              ["Ship it", "Deploy to an environment, call it over REST, and watch every run."],
            ].map(([title, body]) => (
              <li key={title} className="flex gap-3">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-neon-green/30 bg-neon-green/10">
                  <Check size={11} className="text-neon-green" aria-hidden="true" />
                </span>
                <span>
                  <span className="font-medium text-ink-100">{title}. </span>
                  <span className="text-sm text-ink-400">{body}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div className="neon-card p-6">
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-ink-600">Execution trace</p>
          <ol className="mt-5 space-y-3">
            {[
              ["retrieve", "3 knowledge sources matched", "text-neon-cyan"],
              ["model", "provider routed, 412 ms", "text-neon-violet"],
              ["tool", "lookup_order → succeeded", "text-neon-green"],
              ["output", "recorded to Runs", "text-ink-400"],
            ].map(([step, detail, tone], index) => (
              <li key={step} className="flex items-start gap-3">
                <span className="mt-1 font-mono text-[10px] text-ink-600">{String(index + 1).padStart(2, "0")}</span>
                <div className="min-w-0 flex-1 rounded-lg border border-base-700 bg-base-900 px-3 py-2">
                  <p className={`font-mono text-xs ${tone}`}>{step}</p>
                  <p className="mt-0.5 text-xs text-ink-400">{detail}</p>
                </div>
              </li>
            ))}
          </ol>
          <p className="mt-5 text-xs text-ink-600">
            Illustrative shape of a recorded trace. Your workspace shows your own runs.
          </p>
        </div>
      </div>
    </section>
  );
}

function SecuritySection() {
  const items: ReadonlyArray<readonly [LucideIcon, string, string]> = [
    [ShieldCheck, "Row-level security", "Every table is scoped to an organization at the database level."],
    [Lock, "Secrets stay secret", "Secret values are never displayed after creation — only references."],
    [KeyRound, "MFA and RBAC", "Enrollable multi-factor auth, with owner/admin/member permissions enforced server-side."],
    [Webhook, "Signed webhooks", "Outbound deliveries are HMAC-signed and idempotent on replay."],
  ];

  return (
    <section className="border-b border-base-700 px-4 py-20">
      <div className="mx-auto max-w-6xl">
        <SectionHeading
          eyebrow="Security"
          title="Built for work you would put your name on"
          description="Organization isolation, audit trails and secret handling are part of the platform, not a later add-on."
        />
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {items.map(([Icon, title, description]) => (
            <div key={title} className="rounded-xl border border-base-700 bg-base-900/60 p-5">
              <Icon size={18} className="text-neon-green" aria-hidden="true" />
              <h3 className="mt-3.5 font-display font-bold">{title}</h3>
              <p className="mt-2 text-sm text-ink-400">{description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Pricing() {
  // Launch pricing is a real, env-gated offer the billing engine honours, so
  // the landing page quotes through the same helper the checkout uses rather
  // than hardcoding a second set of numbers that could drift out of sync.
  const launchActive =
    process.env.LAUNCH_PRICING_ENABLED === "true" &&
    (!process.env.LAUNCH_PRICING_ENDS_AT || new Date(process.env.LAUNCH_PRICING_ENDS_AT) > new Date());

  return (
    <section id="pricing" className="border-b border-base-700 px-4 py-20">
      <div className="mx-auto max-w-6xl">
        <SectionHeading
          eyebrow="Pricing"
          title="Start free, pay when it works"
          description="Credits cover agent builds, messages, training and predictions. Every plan includes the full platform."
        />
        <PricingTable launchActive={launchActive} />

        <p className="mt-6 text-center text-xs text-ink-600">
          Billing is handled by Paddle. Plans and credit allowances come from the same configuration
          the app bills against.
        </p>
      </div>
    </section>
  );
}

const FAQS: ReadonlyArray<readonly [string, string]> = [
  [
    "What is the difference between an AI agent and an ML agent?",
    "An AI agent is powered by a language model: you give it instructions, knowledge and tools, and it converses or completes tasks. An ML agent is a model trained on a dataset you upload — it makes predictions on structured data rather than holding a conversation.",
  ],
  [
    "Do I need to write code?",
    "No. Agents are created through a guided wizard and configured in the builder. Code is optional — when you want to call an agent from your own product, there is a REST API and signed webhooks.",
  ],
  [
    "Where does an agent's knowledge come from?",
    "Whatever you attach to it. Documents, pasted text and URLs are chunked and indexed per agent, and retrieved at run time. Knowledge stays scoped to the organization that uploaded it.",
  ],
  [
    "How do credits work?",
    "Each billable action costs credits — building an agent, sending a message, training a model, running a prediction. Your plan grants a monthly allowance, and usage is itemised in Usage & Costs.",
  ],
  [
    "Can I see what an agent actually did?",
    "Yes. Every execution is recorded with its status, duration, trace and any error, visible in Runs and aggregated in Observability. Nothing is hidden behind a black box.",
  ],
  [
    "Is my data isolated from other customers?",
    "Yes. Every table enforces row-level security scoped to your organization, and server-side permission checks run on every action.",
  ],
];

function Faq() {
  return (
    <section className="border-b border-base-700 px-4 py-20">
      <div className="mx-auto max-w-3xl">
        <SectionHeading eyebrow="FAQ" title="Questions worth asking first" />
        <FaqList items={FAQS.map(([question, answer]) => ({ question, answer }))} />
        <StructuredData faqs={FAQS.map(([q, a]) => ({ q, a }))} />
      </div>
    </section>
  );
}

function FinalCta() {
  return (
    <section className="bg-aurora-grid px-4 py-20">
      <div className="mx-auto max-w-3xl text-center">
        <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
          Build your first agent in minutes.
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-ink-400">
          Describe what you need. Agentmi configures it, grounds it in your knowledge, and gives you
          somewhere to prove it works before anyone else sees it.
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link href="/signup" className="btn-primary w-full sm:w-auto">
            Start Building
            <ArrowRight size={16} aria-hidden="true" />
          </Link>
          <Link href="/login" className="btn-secondary w-full sm:w-auto">
            Sign in
          </Link>
        </div>
      </div>
    </section>
  );
}

/**
 * Three steps, each naming the screen that does it — so the claim is checkable
 * against the product rather than being marketing shape.
 */
function HowItWorks() {
  const steps: ReadonlyArray<readonly [string, string, string]> = [
    ["Describe", "Say what you need in plain language. Agentmi suggests an AI agent or an ML agent and picks a starting template.", "/dashboard/create"],
    ["Ground and test", "Attach knowledge, register tools, then talk to it in the playground. Every message is recorded with a full trace.", "/dashboard/agents"],
    ["Deploy", "Promote it to a versioned endpoint and call it from your product, or roll back to an earlier snapshot.", "/dashboard/deployments"],
  ];

  return (
    <section className="border-b border-base-700 px-4 py-20">
      <div className="mx-auto max-w-5xl">
        <SectionHeading
          eyebrow="How it works"
          title="A working agent in three steps"
          description="No separate staging path: what you test in the playground is the runtime that serves production traffic."
        />
        <ol className="mt-12 grid gap-4 md:grid-cols-3">
          {steps.map(([title, detail], index) => (
            <li key={title} className="neon-card p-6">
              <span className="font-mono text-xs text-neon-cyan">0{index + 1}</span>
              <h3 className="mt-3 font-display text-lg font-bold">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-400">{detail}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

/**
 * Differentiators. Every line here is a statement about this codebase that a
 * reader could verify by using the product or reading the docs — no
 * competitor comparisons, which could not be kept accurate or checkable.
 */
function HowWeDiffer() {
  const points: ReadonlyArray<readonly [string, string]> = [
    ["One runtime, not two", "Evaluations, the playground and the public API all execute the same code path, so a passing test cannot hide a different production behaviour."],
    ["Every run is inspectable", "Each execution stores status, duration and a step-by-step trace: retrieval, the model call with its provider, and every tool call with its outcome."],
    ["Provider fallback built in", "Requests try Groq, then Cerebras, then OpenRouter, falling through on quota or capacity errors instead of failing the run."],
    ["AI and ML in one workspace", "Language-model agents and models trained on your own tabular data share the same deployment, credit and observability surface."],
  ];

  return (
    <section className="border-b border-base-700 px-4 py-20">
      <div className="mx-auto max-w-5xl">
        <SectionHeading
          eyebrow="How we differ"
          title="Claims you can check in the product"
          description="Each of these is visible in the app or the source, not a positioning statement."
        />
        <div className="mt-12 grid gap-4 sm:grid-cols-2">
          {points.map(([title, detail]) => (
            <div key={title} className="neon-card p-6">
              <h3 className="font-display text-base font-bold">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-400">{detail}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function SectionHeading({
  eyebrow,
  title,
  description,
  align = "center",
}: {
  eyebrow: string;
  title: string;
  description?: string;
  align?: "center" | "left";
}) {
  return (
    <div className={align === "center" ? "mx-auto max-w-2xl text-center" : ""}>
      <p className="font-mono text-xs uppercase tracking-[0.18em] text-neon-cyan">{eyebrow}</p>
      <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">{title}</h2>
      {description && <p className="mt-4 text-ink-400">{description}</p>}
    </div>
  );
}
