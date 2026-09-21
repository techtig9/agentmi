/**
 * Legal pages.
 *
 * These are DRAFTS. Every page renders a prominent notice saying so, and the
 * notice is part of the content rather than something a template could forget.
 * They describe what this codebase actually does — the data it stores, the
 * subprocessors it calls, how AI is used — so a lawyer reviewing them is
 * correcting wording rather than discovering the system.
 */

export interface LegalSection {
  heading: string;
  body: string[];
}

export interface LegalDocument {
  slug: string;
  title: string;
  summary: string;
  lastUpdated: string;
  sections: LegalSection[];
}

const LAST_UPDATED = "2026-09-21";

export const LEGAL_DOCUMENTS: LegalDocument[] = [
  {
    slug: "privacy",
    title: "Privacy Policy",
    summary: "What Agentmi stores, why, and how to get it back or removed.",
    lastUpdated: LAST_UPDATED,
    sections: [
      {
        heading: "What we store",
        body: [
          "Account data: your email address, your display name, and the organizations you belong to.",
          "Workspace content: the agents you configure, the instructions you write, the knowledge sources you attach and their indexed chunks, the tools you register, and the workflows you build.",
          "Execution records: every agent run, with its status, duration, the input and output, a step-by-step trace, token counts and an estimated provider cost.",
          "Billing records: your plan, subscription status and a ledger of credit movements. Card details are handled by Paddle and never reach Agentmi.",
        ],
      },
      {
        heading: "Why we store it",
        body: [
          "To operate the product you asked for: an agent cannot answer from your documents unless we store and index them.",
          "To show you what your agents did, which is what the run records and traces exist for.",
          "To bill accurately, which is what the credit ledger exists for.",
        ],
      },
      {
        heading: "Who else processes your data",
        body: [
          "See the Subprocessors page for the current list and what each one receives.",
          "Content you send to an agent is transmitted to whichever model provider serves that request.",
        ],
      },
      {
        heading: "Isolation",
        body: [
          "Every table enforces row-level security scoped to your organization, and permissions are re-checked on the server for every action. Another workspace cannot read your data.",
          "Secret values are stored as references. Once saved, a secret is never displayed again and never sent to the browser.",
        ],
      },
      {
        heading: "Your rights",
        body: [
          "Export: Settings → Data & privacy produces a machine-readable copy of your workspace.",
          "Deletion: the same page submits a deletion request, which is recorded in the audit log and actioned by an administrator.",
          "Correction: workspace content is editable directly in the product at any time.",
        ],
      },
      {
        heading: "Retention",
        body: [
          "Workspace content is kept until you delete it or close the account.",
          "Run records are kept so that observability and billing history remain accurate.",
        ],
      },
    ],
  },
  {
    slug: "terms",
    title: "Terms of Service",
    summary: "The agreement between you and Agentmi.",
    lastUpdated: LAST_UPDATED,
    sections: [
      {
        heading: "The service",
        body: [
          "Agentmi lets you configure, test and deploy AI and ML agents. You keep ownership of the content you supply and the outputs your agents produce.",
        ],
      },
      {
        heading: "Your responsibilities",
        body: [
          "You are responsible for the content you upload and for the instructions you give an agent, including having the right to use that content.",
          "You are responsible for what your deployed agents do on your behalf, including any tool they are permitted to call.",
          "API keys are yours to protect. A key placed in browser code is readable by anyone who opens the page.",
        ],
      },
      {
        heading: "Acceptable use",
        body: [
          "Do not use Agentmi to build systems that deceive people about being automated where disclosure is required, to generate unlawful content, or to attack or overload third-party services through the tool runtime.",
        ],
      },
      {
        heading: "Credits and billing",
        body: [
          "Billable actions consume credits: building an agent, sending a message, training a model and running a prediction. Your plan grants a monthly allowance.",
          "Paddle processes payment and is the record of what was actually charged.",
        ],
      },
      {
        heading: "Availability and liability",
        body: [
          "The service is provided as-is. Model providers can and do return errors; Agentmi falls through a configured provider chain, but a run can still fail.",
          "Agentmi is not liable for decisions made on the basis of an agent's output. Review output before acting on it.",
        ],
      },
    ],
  },
  {
    slug: "refund",
    title: "Refund Policy",
    summary: "When a charge can be reversed.",
    lastUpdated: LAST_UPDATED,
    sections: [
      {
        heading: "Subscriptions",
        body: [
          "Cancel at any time from Billing. Cancellation stops the next renewal; the current period runs to its end and is not pro-rated.",
        ],
      },
      {
        heading: "When we refund",
        body: [
          "A charge caused by a billing fault on our side is refunded in full.",
          "A renewal you did not intend, raised within 14 days and with no meaningful usage in that period, is refunded on request.",
        ],
      },
      {
        heading: "Credits",
        body: [
          "Credits already consumed are not refundable: the provider cost behind them has been incurred.",
          "Unused credits do not carry over between billing periods.",
        ],
      },
      {
        heading: "How to ask",
        body: ["Contact support from the dashboard with the invoice reference. Refunds are issued through Paddle to the original payment method."],
      },
    ],
  },
  {
    slug: "cookies",
    title: "Cookie Policy",
    summary: "The small number of things Agentmi stores in your browser.",
    lastUpdated: LAST_UPDATED,
    sections: [
      {
        heading: "Strictly necessary",
        body: [
          "Authentication cookies set by Supabase keep you signed in. Without them the product cannot work at all.",
        ],
      },
      {
        heading: "Preferences",
        body: [
          "Your light/dark/system theme choice is stored in this browser's local storage. It never leaves your device and is not read by the server.",
        ],
      },
      {
        heading: "Analytics",
        body: [
          "Agentmi ships with no analytics provider configured. If one is enabled on a deployment, this page will be updated to name it and say what it collects.",
        ],
      },
    ],
  },
  {
    slug: "subprocessors",
    title: "Subprocessors",
    summary: "Third parties that process data on Agentmi's behalf.",
    lastUpdated: LAST_UPDATED,
    sections: [
      {
        heading: "Infrastructure",
        body: [
          "Supabase — database, authentication and file storage. Receives all workspace data at rest.",
          "Vercel — application hosting. Receives request metadata and server logs.",
        ],
      },
      {
        heading: "Model providers",
        body: [
          "Groq, Cerebras and OpenRouter — serve agent responses. Each receives the prompt, the relevant knowledge excerpts and the conversation turns sent with a request. Requests are tried in that order, so which one receives a given request depends on availability.",
          "Anthropic — used only when a deployment explicitly enables it, for long or complex requests.",
          "Voyage AI — generates embeddings. Receives the text of knowledge sources you index.",
        ],
      },
      {
        heading: "Billing",
        body: ["Paddle — merchant of record. Receives billing identity and payment details; Agentmi never sees card data."],
      },
      {
        heading: "Which of these apply",
        body: [
          "A subprocessor only receives data if that integration is configured on the deployment you use. A deployment with no Voyage key, for example, never sends anything to Voyage because knowledge indexing is unavailable.",
        ],
      },
    ],
  },
  {
    slug: "ai-disclosure",
    title: "AI Use Disclosure",
    summary: "How Agentmi uses models, and what that means for your data.",
    lastUpdated: LAST_UPDATED,
    sections: [
      {
        heading: "What the models see",
        body: [
          "When an agent runs, the provider receives your system instructions, the message, the conversation turns you send with it, and any knowledge excerpts retrieved for that question.",
          "Retrieved excerpts are passed inside a clearly delimited block that the model is told is reference material.",
        ],
      },
      {
        heading: "Training",
        body: [
          "Agentmi does not train models on your content and does not use it to improve the product.",
          "Provider training policies are the provider's own; review the terms of whichever provider keys you configure.",
        ],
      },
      {
        heading: "Limitations you should assume",
        body: [
          "Model output can be wrong, including when it is grounded in your documents. Treat it as a draft, not a decision.",
          "An agent with tools can take real actions. Only register tools whose effects you are willing to have triggered automatically.",
        ],
      },
      {
        heading: "Cost transparency",
        body: [
          "Every run records its token usage and an estimated provider cost. Where a model has no configured rate, the cost is shown as unknown rather than as zero.",
        ],
      },
    ],
  },
];

export function legalDocument(slug: string): LegalDocument | undefined {
  return LEGAL_DOCUMENTS.find((doc) => doc.slug === slug);
}
