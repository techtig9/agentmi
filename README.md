# Agentmi

Build, test, evaluate and deploy AI and ML agents from one workspace.

An AI agent is backed by a language model, grounded in knowledge you attach and
able to call HTTP tools mid-conversation. An ML agent is trained on a dataset
you upload and makes predictions on structured data. Both are testable in a
playground, measurable through evaluations and observability, and deployable
behind a versioned API endpoint.

## Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 14 (App Router), React 18, TypeScript |
| Styling | Tailwind CSS with CSS-variable design tokens, light and dark |
| Database, auth, storage | Supabase (PostgreSQL with row-level security) |
| Billing | Paddle |
| AI providers | Groq → Cerebras → OpenRouter, tried in cost order with fallback |
| Embeddings | Voyage AI |
| ML training | a separate Python service (`training-service/`) |
| Tests | `node:test` via `tsx`; `unittest` for the training service |

## Setup

```bash
npm ci
cp .env.example .env.local     # fill in the [required] variables
npm run dev                    # http://localhost:3000
```

Run the database migrations in the order listed in
[docs/DEPLOY_VERCEL.md](docs/DEPLOY_VERCEL.md#2-database). They are idempotent,
so re-running them is safe.

The app **builds and runs with no environment variables at all**. The marketing
pages render normally; everything needing a database redirects to `/setup`,
which names the variables that are missing, and API routes answer `503` with
`{"code":"not_configured"}`. That makes a broken deployment diagnosable instead
of a stack trace.

## Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm start` | Serve the production build |
| `npm run lint` | ESLint via `next lint` |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | Full test suite |

Requires Node 20 or newer (`engines.node`).

## Deploying

[docs/DEPLOY_VERCEL.md](docs/DEPLOY_VERCEL.md) has the exact Vercel settings,
the migration order, every environment variable and the Paddle webhook setup.
[DEPLOYMENT.md](DEPLOYMENT.md) covers the same ground in more depth, including
the training service.

## Project structure

```
app/
  (auth)/            sign-in and sign-up
  (dashboard)/       the product: agents, knowledge, tools, workflows,
                     evaluations, runs, deployments, billing, settings
  api/
    v1/              public REST API, authenticated by API key
    dashboard/       session-authenticated internal endpoints
    webhooks/        inbound Paddle webhooks, HMAC-verified
    health, ready    liveness and readiness
  setup/             shown when the deployment has no database credentials
components/
  ui/                design system: Button, Card, Modal, Table, Toast, …
  dashboard/         product surfaces
  marketing/         landing page sections
lib/
  actions/           server actions (mutations)
  chat/              agent runtime: providers, retrieval, tool calls
  supabase/          request, browser and service-role clients
  pricing/           plans, quoting, credit costs
  data/              query helpers and metric aggregation
supabase/            SQL migrations, run in documented order
training-service/    Python ML training and prediction service
tests/               unit and contract tests
docs/                deployment and operational guides
```

## Security

Row-level security is enabled on every table and permissions are re-checked
server-side on every action — the UI is never the only gate. API keys are
stored as hashes and shown once. Webhook deliveries are HMAC-signed. Outbound
tool requests go through an SSRF guard that refuses private, loopback and
link-local addresses. The service-role key is server-only and never reaches
the browser.
