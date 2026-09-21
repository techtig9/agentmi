# Deploying Agentmi to Vercel

Exact steps for a fresh deployment. Roughly 20 minutes, most of it in the
Supabase dashboard.

## 0. What you need first

- A GitHub repository containing this code.
- A Supabase project (free tier is enough to start).
- At least one AI provider key before any agent can run: Groq, Cerebras or
  OpenRouter.

## 1. Vercel project settings

| Setting | Value |
|---|---|
| Framework preset | Next.js |
| Root directory | `./` (repository root) |
| Build command | `npm run build` (the default) |
| Install command | `npm ci` (the default) |
| Output directory | leave empty — Next.js is detected |
| Node.js version | 20.x or newer (`engines.node` pins `>=20`) |

No `vercel.json` is needed. This is a single-app repository at the root, and
every setting above is Vercel's own default for Next.js.

## 2. Database

Run the migrations **in this order** in the Supabase SQL editor. Each depends
on tables or functions from the ones before it, and all sixteen are idempotent,
so re-running the list is safe:

```
supabase/00_agentmi_schema_setup.sql
supabase/schema.sql
supabase/policies.sql
supabase/functions.sql
supabase/seed_templates.sql
supabase/phase3_schema.sql
supabase/phase3_knowledge_sources.sql
supabase/phase4_schema.sql
supabase/phase4_memory.sql
supabase/phase5_schema.sql
supabase/phase5_graph.sql
supabase/phase6_schema.sql
supabase/phase7_10_schema.sql
supabase/phase8_governance.sql
supabase/phase9_ecosystem.sql
supabase/phaseR_support.sql
supabase/phase10_run_costs.sql
```

Then, still in Supabase:

1. **Settings → API → Exposed schemas**: add `agentmi` alongside `public` and
   `graphql_public`. Without this every query fails with "schema must be one
   of: public".
2. **Authentication → Providers**: confirm Email is enabled.
3. **Authentication → URL Configuration**: set Site URL to your deployed URL
   once you have one (step 4), so the confirmation email link works.

## 3. Required environment variables

Set these in **Settings → Environment Variables**, scoped to Production (and
Preview if you want previews to work). Until they are present the deployment
stays up and serves `/setup`, which lists what is missing, rather than failing.

| Variable | Where it comes from |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | same page |
| `SUPABASE_SERVICE_ROLE_KEY` | same page — server-only, bypasses RLS |
| `NEXT_PUBLIC_APP_URL` | your deployment URL, no trailing slash |

`NEXT_PUBLIC_APP_URL` must be set **before the build runs**, not only at
runtime. The marketing and legal pages are prerendered, so their canonical
and Open Graph URLs are baked in at build time; setting the variable
afterwards leaves those tags absent until the next deployment. If it is
missing, Vercel's own `VERCEL_PROJECT_PRODUCTION_URL` is used, which is the
stable production domain — never `VERCEL_URL`, which changes on every push.

With those four set, the landing page, signup, login, onboarding and the whole
dashboard work.

## 4. Optional variables, by what they unlock

| Unlocks | Variables |
|---|---|
| Running any agent | one of `GROQ_API_KEY`, `CEREBRAS_API_KEY`, `OPENROUTER_API_KEY` |
| Knowledge indexing and retrieval | `VOYAGE_API_KEY` |
| Billing and checkout | `PADDLE_API_KEY`, `NEXT_PUBLIC_PADDLE_CLIENT_TOKEN`, `PADDLE_WEBHOOK_SECRET`, the six `PADDLE_PRICE_*` ids |
| ML agent training and prediction | `TRAINING_SERVICE_URL` |

`.env.example` documents all 33 variables, each marked `[required]` or
`[optional]` with its purpose.

**A change to an environment variable does not rebuild the deployment.**
Redeploy after editing them, or the running build keeps the old values.

## 5. Paddle webhook (only if you enabled billing)

1. Paddle → Developer Tools → Notifications → New destination.
2. URL: `https://<your-domain>/api/webhooks/paddle`.
3. Subscribe to `transaction.completed`, `subscription.created`,
   `subscription.updated`, `subscription.canceled`.
4. Copy the generated secret into `PADDLE_WEBHOOK_SECRET` and redeploy.
5. On each Paddle Price set Custom Data to `{"plan_id": "starter"}` (or
   `"pro"` / `"business"`). The webhook reads this to know which plan was
   bought; without it a successful payment stores `plan: null`.

## 6. Verify

- `GET /api/health` → `200` (liveness; no dependencies checked).
- `GET /api/ready` → `200` when configuration and the database are both good,
  `503` with a per-check breakdown otherwise.
- `/setup` → redirects to `/` once the Supabase variables are present.

## Deployment protection

New Vercel projects may have Vercel Authentication enabled, which puts every
`*.vercel.app` URL behind a login wall. Settings → Deployment Protection turns
it off if you want the link to be publicly shareable.
