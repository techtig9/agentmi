# Agentmi — Deployment Guide

Everything in `README.md` was written and tested phase-by-phase in a
sandbox with no internet access. This document is the other half: one
ordered runbook for standing the whole thing up somewhere real, so the
integrations that couldn't be exercised in the sandbox (Claude, Voyage,
Paddle, live webhook delivery) can finally be verified end-to-end.

Nothing here needs code changes — it's account setup, environment
variables, and two deploy targets.

---

## 1. Accounts you'll need

| Service | What it's for | Where |
|---|---|---|
| Supabase | Database, auth, storage | supabase.com |
| Anthropic | Claude API (AI agent replies) | console.anthropic.com |
| Voyage AI | Embeddings (RAG knowledge base) | voyageai.com |
| Paddle | Subscription billing | paddle.com (use Sandbox mode first) |
| Vercel (recommended) or any Node host | Hosts the Next.js app | vercel.com |
| Any host with Python 3 | Hosts the training service | Railway, Render, Fly.io, a $5 VPS — anything |

---

## 2. Supabase setup

**This build is schema-isolated on purpose**, so it can share a Supabase
project with other Techtig products instead of needing its own (Supabase's
free plan caps you at 2 active projects **per account**, across every
organization you own or administer — not per organization). Every table,
type, policy, and function lives in a dedicated `agentmi` Postgres schema
instead of the default `public` one, so it can't collide with another
product's `profiles` / `organizations` / `subscriptions` / etc. tables in
the same project. `lib/supabase/client.ts`, `server.ts`, and `service.ts`
are already pointed at that schema (`db: { schema: "agentmi" }`) — you
don't need to touch app code, only the steps below.

1. Create a new project, **or** open an existing Techtig project you want
   to share this with — either works, nothing here requires a dedicated one.
2. Settings → API → copy the **Project URL**, **anon public key**, and
   **service_role key** (keep the service role key secret — it bypasses
   RLS by design, see `lib/supabase/service.ts`).
3. Database → Extensions → enable **vector** if it isn't already
   (needed by `phase3_schema.sql`'s `knowledge_chunks` table). If another
   product in this project already turned it on, skip this — extensions
   are project-wide, not per-schema.
4. SQL Editor — run these **in this exact order** (each depends on
   tables/functions from the one before it). The first file creates the
   `agentmi` schema and grants API access to it; every file after that
   starts with a short preamble that switches into it, so nothing lands
   in `public`:

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

   All sixteen are idempotent (`CREATE TABLE IF NOT EXISTS`, `CREATE OR
   REPLACE`, `DROP POLICY IF EXISTS`), so re-running the list is safe.
   `tests/phase4-repo.test.ts` asserts this list stays complete and in a
   valid dependency order.

5. Settings → API → **Exposed schemas** → add `agentmi` to the list
   (alongside `public`, `graphql_public` — don't remove those). Without
   this, every API call gets a "schema must be one of: public" error.
6. Authentication → Providers → confirm Email is enabled (Google OAuth
   is optional — the login/signup pages only wire up email/password).
7. Authentication → URL Configuration → set the Site URL to your
   deployed app's URL once you have it (step 5 below) — needed for the
   signup confirmation email's redirect link to work. **If you're
   sharing this project and Site URL is already set to another
   product's domain, don't overwrite it** — add your app's URL under
   **Redirect URLs** instead (e.g. `https://your-app.vercel.app/**`).
   Auth settings are project-wide, unlike the schema-isolated data above.

---

## 3. Training service

This is a plain `python3 server.py` process — stdlib only, no `pip
install` needed. Deploy it as a long-running process (not a serverless
function — it needs to stay up and hold no state between requests, but
serverless cold-starts would work against you here for no benefit).

- **Railway/Render/Fly.io**: point them at `training-service/`, start
  command `python3 server.py $PORT` (adjust the port argument to
  whatever the platform injects — check `server.py`'s `sys.argv`
  handling).
- **A plain VPS**: `nohup python3 server.py 8000 &`, or wrap it in a
  systemd service for restarts.
- Either way, note the public URL — that's your `TRAINING_SERVICE_URL`.

This is a real, tested trainer (see README's Phase 3 section for the
cross-validated math) but it's single-threaded stdlib `http.server` —
fine for moderate load, not built for high concurrency. The migration
path to FastAPI + scikit-learn/XGBoost behind the same `/train` contract
is a drop-in replacement once you want that; nothing calling it needs to
change.

---

## 4. Next.js app

1. Push this codebase to a Git repo (GitHub/GitLab) — Vercel deploys
   from Git.
2. Import the repo in Vercel (or your host of choice).

### 4.1 The minimum to get a page to render

The build succeeds without any environment variables, but **every page
throws at request time without Supabase credentials** — `createClient()`
requires them, and the landing page calls it before rendering anything.
A deployment missing these returns an error on every route, including
`/`. Set these four first:

   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `NEXT_PUBLIC_APP_URL` — the deployment URL, used to build the
     endpoint URLs shown on the Deployments page

Until they are set, the deployment stays up and tells you so rather
than failing: the marketing landing page renders normally (it needs no
database), and `/login`, `/signup`, `/onboarding` and `/dashboard`
redirect to `/setup`, which lists exactly which of these variables are
still absent. `/api/ready` reports the same state as JSON with a 503.

With those set, the landing page, signup, login, onboarding and the
whole dashboard render. Agent execution, knowledge indexing and billing
each need their own keys below.

### 4.2 Everything else

3. Set the remaining variables from `.env.example`:

   - **AI providers** — the runtime tries these in cost order and falls
     through on a quota or capacity error, so at least one is needed
     before an agent can run:
     `GROQ_API_KEY` → `CEREBRAS_API_KEY` → `OPENROUTER_API_KEY`.
     `ANTHROPIC_API_KEY` is optional and only used when
     `ANTHROPIC_ENABLED=true`, for complex or large tasks.
   - `VOYAGE_API_KEY` — from voyageai.com. Knowledge indexing is
     disabled without it; the rest of the app is unaffected.
   - `TRAINING_SERVICE_URL` — from step 3 above
   - `PADDLE_API_KEY`, `NEXT_PUBLIC_PADDLE_CLIENT_TOKEN` — Paddle
     Sandbox dashboard, Developer Tools → Authentication
   - `PADDLE_PRICE_*` (6 values) — create one Product+Price in Paddle
     per plan × cycle (Starter/Pro/Business × monthly/yearly), copy
     each generated Price ID. **On each Price, set Custom Data to
     `{"plan_id": "starter"}`** (or `"pro"` / `"business"` to match) —
     `app/api/webhooks/paddle/route.ts` reads this to know which plan a
     payment is for. Skipping this means every successful payment
     updates the subscription with `plan: null`.
   - `PADDLE_WEBHOOK_SECRET` — generated in the next step
   - `LAUNCH_PRICING_ENABLED`, `LAUNCH_PRICING_ENDS_AT` — set per
     Section 9 of the PRD

4. Deploy.
5. Go back to Supabase (step 2.7) and set the Site URL now that you
   have a real deployment URL.

---

## 5. Paddle webhook

1. Paddle Sandbox dashboard → Developer Tools → Notifications → add a
   destination: `https://<your-app-url>/api/webhooks/paddle`.
2. Subscribe it to at least: `subscription.created`,
   `subscription.updated`, `subscription.canceled`,
   `subscription.past_due` (see `routePaddleEvent` in
   `lib/billing/paddle-webhook.ts` for the exact event names it
   handles).
3. Copy the destination's signing secret into `PADDLE_WEBHOOK_SECRET`
   and redeploy.
4. Paddle's dashboard has a "send test event" button — use it, then
   check your Supabase `subscriptions` table updated and
   `processed_webhook_events` logged the event.

---

## 6. End-to-end smoke test (run once everything above is live)

This walks every phase in order — it's the fastest way to catch a
misconfigured env var before a real customer does.

1. Sign up → confirm you land on `/onboarding` → create an org → land
   on `/dashboard` with 500 credits showing
2. `/dashboard/create` → build an AI agent from the Customer Support
   template → paste some FAQ text on the knowledge step → confirm it
   redirects to `/dashboard/agents` and the new agent shows **ready**
3. Open the agent's detail page → confirm the knowledge chunk count is
   non-zero (this is the first real Voyage API call — if it's stuck at
   0, check `VOYAGE_API_KEY`)
4. `/dashboard/api-keys` → create a key, copy it
5. `curl -H "Authorization: Bearer <key>" -X POST
   https://<app>/api/v1/agents/<agent-id>/chat -d
   '{"message":"what are your hours"}'` → a real Claude reply grounded
   in what you pasted (first real Anthropic API call)
6. `/dashboard/create/ml` → paste a small CSV, pick a target column,
   train → confirm it hits your `TRAINING_SERVICE_URL` and comes back
   with real metrics (this call doesn't need any of the AI-side keys —
   good isolated check if steps 3/5 failed)
7. `/dashboard/webhooks` → point one at
   [webhook.site](https://webhook.site) for a disposable test URL →
   create another agent → confirm a signed `agent.created` delivery
   shows up there
8. Copy the widget embed snippet from an AI agent's detail page into a
   blank local HTML file, open it in a browser → chat bubble → send a
   message → real reply
9. `/dashboard/billing` → click Upgrade on any plan → Paddle's overlay
   checkout opens → complete it with a Paddle Sandbox test card →
   confirm `subscriptions` updates and the dashboard's credit badge
   reflects the new plan's allotment
10. `/dashboard/workflows` → create a workflow with 2 of your agents as
    specialists → `curl` `/api/v1/workflows/{id}/chat` with a message
    matching one specialist → confirm `routed_to` picked correctly
11. `/dashboard/team` → invite yourself at a second email (or a friend)
    → copy the link → open in an incognito window → sign up → confirm
    it lands directly in your org's dashboard, skipping `/onboarding`
12. Fire 11 requests at a widget chat inside a minute → confirm the
    11th gets rate-limited rather than hitting Claude 11 times

If all 12 pass, every integration this project depends on is
confirmed working live — not just unit-tested against known values.
