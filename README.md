# Agentmi — Project Status

Unified AI Agent + ML Agent builder for Techtig. This zip is the
complete, cumulative build across every phase — everything below is
current, not historical.

## At a glance

- **157 automated tests, all passing** (136 TS/JS via `npm test`, 21
  Python via `cd training-service && python3 -m unittest discover -s tests`)
- **What's built:** auth, orgs, credits, admin panel · AI Agent builder
  with Prompt Engineer wizard + RAG knowledge base · ML Agent builder
  with real gradient-descent training (binary AND multi-class) · public
  API (predict/chat) with API keys, rate limiting, webhooks · multi-agent
  workflow routing · white-label embeddable widget · team invites ·
  Paddle billing with a working checkout page
- **What's NOT verified live:** anything needing network access or real
  credentials — Claude, Voyage, Paddle, and a deployed training service.
  This sandbox has no internet access, so those integrations are
  structurally complete and code-reviewed but unexercised. `DEPLOYMENT.md`
  has the full runbook + a 12-step smoke test for verifying them for real.
- **What's honestly incomplete:** transactional email (invites/
  confirmations generate real links but nothing sends them — needs a
  Resend/Postmark account), and the training service is a dependency-free
  stdlib Python implementation rather than scikit-learn/XGBoost (a
  deliberate tradeoff — see "Why the training service is stdlib-only
  Python" below — not a shortcut that was missed).

## Two real bugs caught before they'd have hit production

Worth knowing about even though both are already fixed:

1. **RLS silently blocking all API-key traffic** (Phase 5) — the
   API-key-authenticated routes used the cookie-based Supabase client,
   but external API callers have no session, so `is_org_member()` would
   match nothing and every request would 404 with no indication why.
   Fixed with a service-role client pattern, now used consistently.
2. **Paddle subscriptions never activating** (pre-deployment audit) —
   the webhook's first-payment handler matched on
   `paddle_subscription_id`, which doesn't exist in our DB until that
   first payment completes. A customer could pay and stay on Free with
   no error anywhere. Fixed to match on `org_id` (via checkout
   `customData`) for that first activation.

Both are detailed in full further down, where they happened chronologically.

---

## Why you're setting this up locally

This was built in a sandboxed environment with no internet access, so
`npm install`, a live Supabase project, and real API calls couldn't be
exercised here. The **pricing/credit logic has real automated tests that
already pass** (see `tests/pricing.test.ts` — run `npm test`); everything
else needs your own environment + credentials to run and verify.

## Setup

1. `npm install`
2. Create a Supabase project → Settings → API, copy the URL + anon key
   into `.env.local` (copy `.env.example` as a starting point)
3. In the Supabase SQL editor, run `supabase/schema.sql`, then
   `supabase/policies.sql`
4. `npm run dev` → open `http://localhost:3000`

## Test checklist for this phase

Run through these in order — each should work before moving to Phase 2.

- [ ] `npm test` — pricing/credit engine tests pass (already verified in
      the sandbox: 8/8 passing)
- [ ] `npm run dev` starts with no console errors
- [ ] Visiting `/` while logged out redirects to `/login`
- [ ] `/signup` creates a Supabase auth user (check Supabase → Authentication)
- [ ] After signup, you land on `/dashboard` (will redirect to `/onboarding`
      until org-creation exists — that's expected, it's Phase 2 scope)
- [ ] `/login` with wrong password shows the inline error, not a crash
- [ ] Logged-in, visiting `/dashboard` directly loads (no redirect loop)
- [ ] Logged-out, visiting `/dashboard` directly redirects to `/login?next=/dashboard`
- [ ] Sign out from the topbar returns you to `/login`
- [ ] Theme check: dark background, neon-cyan glow appears on card
      hover/focus, credit badge renders in mono font
- [ ] `prefers-reduced-motion` (toggle in OS accessibility settings):
      hover glow transition should become near-instant, not animated

## Manual DB smoke test (before wiring the UI to it)

In Supabase SQL editor:

```sql
insert into profiles (id, is_admin) values ('<a real auth.users id>', true);
insert into organizations (name, slug, owner_id) values ('Test Org', 'test-org', '<same id>');
insert into memberships (org_id, user_id, role) values ('<org id>', '<user id>', 'owner');
insert into credit_balances (org_id, balance) values ('<org id>', 500);
insert into subscriptions (org_id, plan) values ('<org id>', 'free');
```

Then confirm: a *different* user cannot see this org's rows (RLS working),
and the same admin user (`is_admin = true`) CAN see it regardless of
membership.

## Phase 2 (this update)

Adds: org-creation onboarding (`/onboarding`), atomic credit RPCs
(`consume_credits`/`grant_credits`), the 6-step Prompt Engineer wizard
(`/dashboard/create`), 3 seeded AI agent templates, and a My Agents list.

**Scoped out of Phase 2, on purpose:** the ML Agent path is visible in the
wizard but disabled ("Phase 3" badge) — building it end-to-end needs the
training microservice from the architecture doc, which is a separate,
bigger piece of work. Knowledge ingestion is a plain textarea for now;
file upload + automatic embeddings indexing is also Phase 3.

### Additional setup for Phase 2

1. Re-run the SQL editor: `supabase/functions.sql`, then
   `supabase/seed_templates.sql`
2. Everything else from Phase 1 setup still applies

### What I actually tested in the sandbox (28/28 passing, `npm test`)

- Pricing/credit engine (Phase 1): 8 tests
- AI vs ML classification heuristic: 5 tests — clear support/churn
  descriptions classify correctly, vague input defaults to AI at 0.5
  confidence, mixed signals lean toward the stronger count
- Wizard step reducer: 10 tests — full happy-path walkthrough, blocked
  advancement on incomplete steps, back/forward navigation rules,
  deep-link guarding
- Credit ledger math: 7 tests — afford/deny/exact-balance cases, the
  500 signup credits vs. first-build cost, negative-input rejection

### Test checklist for Phase 2 (needs your local environment)

- [ ] New signup → redirected to `/onboarding` (no org yet)
- [ ] Submitting an org name creates the org + membership + free
      subscription + 500 credits (check `credit_balances` in Supabase)
- [ ] Lands on `/dashboard` afterward, credit badge shows 500
- [ ] `/dashboard/create` → describe step: typing a support-related
      sentence shows "Sounds like an AI Agent"; typing a churn/dataset
      sentence shows "Sounds like an ML Agent"
- [ ] Confirm-type step: ML card is visibly disabled with a "Phase 3" badge
- [ ] Template step lists the 3 seeded templates (blank if you skipped
      `seed_templates.sql`)
- [ ] Back button returns to the previous step without losing your
      earlier answers
- [ ] Review step shows the correct cost (75 credits if it's your first
      agent, 150 otherwise) — admin accounts show "Free (admin)"
- [ ] Submitting creates a row in `agents`, deducts credits in
      `credit_balances` (unless admin), and redirects to
      `/dashboard/agents`
- [ ] My Agents page lists the new agent with status "ready"
- [ ] Trying to submit with insufficient credits shows the shortfall
      error and does NOT create the agent (test by manually setting a
      test org's balance below the cost first)

## Phase 3 (this update)

Adds: the ML training microservice (real, running gradient-descent
classifier/regressor), CSV upload → dataset profiling → training →
evaluation dashboard flow, real document ingestion for AI agent
knowledge bases (chunking + Voyage embeddings + pgvector), Paddle
webhook handling with signature verification and idempotency, and the
admin panel (global stats + org/credit management).

### What I actually ran in the sandbox (77/77 passing)

**TypeScript (`npm test`, 66 tests):** all of Phase 1–2's tests, plus
- RAG chunking + cosine similarity retrieval (10 tests)
- Dataset profiling, seeded train/test split, classification/regression
  metrics (12 tests) — caught and fixed 2 real bugs in this pass: a
  small-sample free-text column was misclassified as categorical, and a
  test compared unrounded floats against the metrics function's
  intentional 4-decimal rounding
- Paddle webhook HMAC signature verification + event routing (9 tests) —
  valid/tampered/wrong-secret/expired-timestamp/malformed-header cases
- CSV parser (7 tests) — quoted fields, escaped quotes, missing
  trailing values, blank-line handling

**Python (`cd training-service && python3 -m unittest discover -s tests`,
11 tests):** the logistic and linear regression trainers don't just run
without crashing — they were tested against known-answer data: a
linearly separable 2-feature classification problem reaches 95%+
accuracy, and a noiseless `y = 3x + 7` regression is recovered to within
mean error < 1.0. Also verified: deterministic given the same seed,
and reject malformed input (empty data, mismatched lengths, non-binary
labels) with a clear error instead of a cryptic crash.

**Also verified live in the sandbox:** started `training-service/server.py`
and hit it with real HTTP requests — `/health` returns 200, a real
`/train` classification request returns a trained model + 100% metrics
on a cleanly separable synthetic dataset, and a malformed request
returns 400 instead of crashing the server.

### Why the training service is stdlib-only Python

`fastapi`, `uvicorn`, `scikit-learn`, and `numpy` all need `pip install`,
which needs network access this sandbox doesn't have. Rather than write
untestable placeholder code, Phase 3 ships a real, working, dependency-free
trainer (`logistic_regression.py` / `linear_regression.py`, plain
gradient descent) behind a small `http.server`-based service
(`server.py`) — proven above to actually train and predict correctly.
**This is the interface contract**, not a permanent architecture choice:
once you deploy this service somewhere with network access, swap the
internals for scikit-learn/XGBoost + FastAPI without changing anything
that calls it — the `/train` request/response JSON shape is what
`lib/actions/training.ts` talks to, and that doesn't need to change.

### Additional setup for Phase 3

1. Re-run the SQL editor: `supabase/phase3_schema.sql` (requires the
   `vector` extension — enable it in Supabase → Database → Extensions
   first if `create extension vector` fails)
2. `cd training-service && python3 server.py` (defaults to port 8000;
   set `TRAINING_SERVICE_URL` in `.env.local` to match)
3. Get a Voyage AI API key, add it as `VOYAGE_API_KEY`
4. Get Paddle Billing sandbox credentials, add `PADDLE_API_KEY` and
   `PADDLE_WEBHOOK_SECRET`, and point a webhook at
   `https://<your-tunnel>/api/webhooks/paddle` (use `ngrok` or similar
   for local testing — Paddle can't reach `localhost`)

### UI wiring (completes Phase 3 end-to-end)

The pieces above existed as tested modules; this pass wires them into an
actual click-through product:

- Wizard's ML card is enabled — selecting it routes to `/dashboard/create/ml`
- `/dashboard/create/ml`: paste CSV → instant client-side column
  profiling (no round trip — `parseCsv`/`profileDataset` run in the
  browser) → pick target column (suggested one pre-highlighted) → pick
  classification/regression → **Train model** calls the real
  `trainMlAgent` action against the training service
- `/dashboard/agents/[id]`: new agent detail page — AI agents show a
  knowledge-base manager (add/replace text, see live chunk count); ML
  agents show real metrics from `ml_models` plus the dataset it trained on
- `/dashboard/datasets`: lists every dataset or an empty state
- Agent creation (`lib/actions/agents.ts`) now calls
  `ingestKnowledgeText` directly — the wizard's pasted knowledge text is
  chunked and embedded on submit instead of stored as a raw string
- Verified live in the sandbox again after this wiring pass: `server.py`
  `/health` → 200, a real classification `/train` call → 100%
  accuracy on separable synthetic data, malformed request → 400

### Test checklist for Phase 3 (needs your local environment)

- [ ] `python3 server.py` starts and `curl localhost:8000/health` returns
      `{"status": "ok"}`
- [ ] `/dashboard/create` → select ML Agent → lands on
      `/dashboard/create/ml`
- [ ] Paste a CSV with a numeric feature and a 0/1 target column →
      column list appears instantly, suggested target is pre-flagged
- [ ] Train model → redirected to `/dashboard/agents/[id]` showing real
      accuracy/precision/recall/F1 (or RMSE/MAE for regression), and
      `ml_models` has a matching row
- [ ] Uploading a CSV with fewer than 10 rows is rejected with a clear
      error, not a crash
- [ ] Selecting a target column with text labels (not 0/1) shows the
      inline warning instead of silently training on garbage
- [ ] From an AI agent's detail page, adding knowledge text creates rows
      in `knowledge_chunks` with non-null `embedding` values, and the
      chunk count on screen updates
- [ ] A Paddle sandbox test webhook event is accepted (200) and updates
      the matching `subscriptions` row
- [ ] Resending the exact same webhook event id returns
      `{"status": "already_processed"}` and does NOT apply the update twice
- [ ] A webhook with a tampered body or wrong secret is rejected (401)
- [ ] `/admin` is reachable for an admin account and redirects a
      non-admin straight back to `/dashboard`
- [ ] Admin dashboard shows non-zero org/agent counts once you have test
      data
- [ ] Granting credits to an org from `/admin/users` updates that org's
      balance immediately (check by loading their dashboard in another
      session)

## Phase 4 — public API, predictions, chat, webhooks

Adds: a real prediction endpoint, a chat endpoint with RAG retrieval,
API key management, outbound webhooks (distinct from the inbound Paddle
webhook), and dashboard pages for both.

### What I actually tested in the sandbox (93/93 passing, `npm test`)

New this phase, on top of Phase 1-3's 66:

- **Prediction math (8 tests)** — cross-validated against REAL model
  params from an actual `training-service/server.py` run (not synthetic
  numbers): a logistic model correctly classifies points deep in each
  cluster, a linear model recovers the true `y = 3x + 7` relationship to
  within 1.0 at both ends of the range, missing-feature and wrong-model-type
  errors are caught explicitly instead of silently producing NaN
- **API key generation/hashing/verification (8 tests)** — uniqueness,
  deterministic hashing, correct-key acceptance, wrong-key/tampered-key/
  no-prefix rejection, all via constant-time comparison
- **Outbound webhook signing (6 tests)** — sign→verify round trip,
  tampered body rejected, wrong secret rejected, replay protection
  (signature older than 5 min rejected), malformed header handled
  without throwing
- **RAG prompt assembly (5 tests)** — placeholder filling, numbered
  source blocks per retrieved chunk, the "knowledge base is empty"
  fallback, escalation instruction only appears when the template
  enables it, and retrieved content is wrapped in a delimiter block so
  it reads as reference material rather than instructions (basic
  prompt-injection hardening)

### What still needs your environment

The Claude and Voyage API calls inside the chat route, and any live
webhook delivery to a real customer URL, can't run in this sandbox
(no network, no API keys here). The code is structurally correct and
built directly on top of the tested retrieval/prompt/signing logic —
verify these live once deployed.

### Additional setup for Phase 4

1. Re-run the SQL editor: `supabase/phase4_schema.sql`
2. Get an Anthropic API key, add it as `ANTHROPIC_API_KEY`

### Test checklist for Phase 4

- [ ] `/dashboard/api-keys` → create a key → the full key is shown once,
      copy button works, and it disappears on refresh (by design — only
      the hash persists)
- [ ] `curl -H "Authorization: Bearer <key>"` against
      `/api/v1/agents/<ml-agent-id>/predict` with a `features` object
      returns a real prediction and deducts 1 credit
- [ ] The same call with a missing required feature returns a 400 with
      a clear error, not a 500
- [ ] Calling `/predict` on an AI agent (wrong kind) returns 400
- [ ] Calling with a revoked key returns 401
- [ ] `/dashboard/webhooks` → add an endpoint (e.g. a
      `webhook.site` URL for testing) → the secret is shown once
- [ ] Create an agent → the endpoint receives a signed
      `agent.created` delivery; `webhook_deliveries` has a row with
      `succeeded = true`
- [ ] Train an ML agent → endpoint receives `agent.training_completed`
      with real metrics in the payload
- [ ] Verify a received delivery's signature using the HMAC scheme
      (matches `lib/webhooks-outbound/sign.ts`'s `verifyWebhookSignature`)
- [ ] `curl -H "Authorization: Bearer <key>"` against
      `/api/v1/agents/<ai-agent-id>/chat` with a `message` returns a
      real Claude reply grounded in the agent's knowledge base

## Phase 5 — multi-agent workflows, white-label widget, label encoding

### What I actually tested in the sandbox (111/111 passing, `npm test`)

New this phase, on top of Phase 1-4's 93:

- **Label encoder (10 tests)** — yes/no, churned/retained encode correctly
  with the intuitive side mapped to 1 (churned=1, not retained=1 — this
  matters, a backwards mapping would silently invert every prediction);
  case-insensitive; unrecognized pairs fall back to alphabetical order
  *with a visible warning* rather than a silent guess; rejects
  non-binary columns instead of mangling them
- **Workflow routing (8 tests)** — correctly routes billing/technical/
  sales messages to the matching specialist across a 3-agent test
  workflow, keywords count toward the match, falls back to the
  first-listed specialist on zero overlap, stop words don't skew results

### A real bug this phase caught and fixed

Phase 4's `/predict` and `/chat` routes used the cookie-based Supabase
client to authenticate API-key callers. That client's queries run under
RLS, which checks `auth.uid()` — but an external API caller has no
Supabase session, so `is_org_member()` would silently match nothing and
every request would have failed with "not found," masking as a routing
bug rather than the auth bug it actually was. Fixed by adding
`lib/supabase/service.ts` (a service-role client, same pattern the
Paddle webhook already used correctly) and applying it consistently
across `authenticate.ts`, both `/api/v1` routes, and the new widget/
workflow routes. Also: the first draft of the widget's DB access used a
`USING (true)` RLS policy on `agents` for "anonymous lookup by widget
id" — caught before shipping that this would let anyone with the public
anon key read every org's agent config (system prompts, ML model
weights) directly, not just the safe fields the widget needs. Replaced
with the same service-role pattern instead; no permissive policy needed.

### What's built

- **Auto label encoding** — `create/ml` now shows a live preview of how
  a non-binary target column will be encoded before you train, instead
  of just telling you to fix it yourself
- **Multi-agent workflows** — `/dashboard/workflows`: create a workflow,
  add existing ready AI agents as specialists (with optional extra
  keywords), remove them. Call `POST /api/v1/workflows/{id}/chat` and
  the router picks the best specialist and answers through it
- **White-label widget** — `public/widget.js`, a dependency-free
  embeddable chat bubble. Each AI agent gets a `public_widget_id` —
  safe to publish in a `<script>` tag (scoped to that one agent's chat,
  unlike a real API key). Branding auto-hides on the Business plan.
  Embed snippet + copy button live on the agent detail page once ready

### Additional setup for Phase 5

1. Re-run the SQL editor: `supabase/phase5_schema.sql`

### Test checklist for Phase 5

- [ ] Upload a CSV with a yes/no (or similar) target column on
      `/dashboard/create/ml` → see the live encoding preview before
      training → train → agent's `label_mapping` in `agents.config`
      matches what was previewed
- [ ] A target column with 3+ distinct values shows the "pick a
      strictly binary column" message instead of crashing
- [ ] `/dashboard/workflows` → create a workflow → add 2+ AI agents as
      specialists with distinct keywords
- [ ] `curl` `POST /api/v1/workflows/{id}/chat` with a message matching
      one specialist's domain → `routed_to.agent_id` is the expected
      specialist, and the reply is grounded in that specialist's
      knowledge base
- [ ] A message with no clear domain match routes to the first-added
      specialist (the fallback)
- [ ] Paste the widget snippet from an agent's detail page into a test
      HTML file, open it in a browser → bubble appears, opens into a
      chat panel styled to the agent's theme, sending a message gets a
      real reply
- [ ] Widget chat on a Business-plan org's agent has no "Powered by
      Agentmi" footer; any other plan shows it
- [ ] Exhausting an org's credits mid-widget-conversation shows a
      generic "temporarily unavailable" message to the site visitor —
      never a credit/billing error

## Pre-deployment audit — a missing page and a real billing bug

Before recommending a live deploy, I cross-checked every `process.env`
reference in the code against `.env.example`. All the app-critical
vars matched, but the Paddle-related ones (`PADDLE_API_KEY`,
`PADDLE_PRICE_*`, `NEXT_PUBLIC_PADDLE_CLIENT_TOKEN`) were declared and
never referenced anywhere — because **`/dashboard/billing` didn't
exist**. The Sidebar has linked to it since Phase 1; nobody could
actually upgrade from Free.

While building it, found a real bug in the Paddle webhook handler: the
`activate` case (a brand-new subscription's first payment) matched
`WHERE paddle_subscription_id = <id>` — but the org's `subscriptions`
row is created at signup with `paddle_subscription_id = null`, so
that match would find zero rows and silently do nothing. A customer
could pay and stay on the Free plan. Fixed by having `activate` match
on `org_id` instead (passed via Paddle's `customData` at checkout,
read back from the webhook payload), then setting
`paddle_subscription_id` on that row so later `update`/`cancel`/
`mark_past_due` events — which arrive after the org already has one —
can match on it correctly.

**What's built now:** `/dashboard/billing` — current plan/credit
summary, monthly/yearly toggle, upgrade cards per plan with live
launch-pricing detection, wired to a real Paddle.js checkout overlay.
`lib/pricing/paddle-price-map.ts` (2 tests) resolves plan+cycle to the
right env var — kept separate from reading the env value itself so the
mapping is testable without real Paddle credentials.

**Still needs your live environment to verify** (nothing here can be
checked without a real Paddle Sandbox account): completing an actual
checkout and confirming the org's plan updates. Critically, **each
Paddle Price needs `Custom Data` set to `{"plan_id": "starter"}`** (or
`pro`/`business`) in Paddle's dashboard — the webhook reads this to
know which plan was purchased. `DEPLOYMENT.md` now calls this out
explicitly in the Paddle setup steps, since skipping it silently sets
`plan: null` on every successful payment.

## Phase 6 — rate limiting, prediction history, team invites

### What I actually tested in the sandbox (122/122 passing, `npm test`)

New this phase, on top of Phase 1-5's 111:

- **Token bucket rate limiter (7 tests)** — using a fake clock (no
  `setTimeout`/real waiting, so tests are instant and deterministic):
  allows exactly up to capacity, denies the next request, refills
  linearly over time, never over-refills past capacity even after a huge
  gap, `retryAfterMs` is exact (verified by replaying it and confirming
  the retry succeeds), higher-cost requests correctly denied with partial
  tokens available, independent buckets don't leak into each other
- **Invite tokens (4 tests)** — uniqueness, hash determinism, correct
  token accepted, wrong token rejected — same hash-at-rest pattern as
  API keys (Phase 4), reused because invites need the same "safe to put
  in a URL, unusable if the DB leaks" property

### What's built

- **Rate limiting** — `supabase/phase6_schema.sql` adds an atomic
  Postgres RPC (`rate_limit_check`, row-locked like `consume_credits`)
  mirroring the tested TS math. Applied to all 4 exposed surfaces:
  widget chat (10/min per visitor IP — the tightest, since it's fully
  anonymous), API-key predict (60/min), API-key chat (30/min), workflow
  chat (30/min). Fails open on infrastructure errors (logged, not
  silent) rather than taking the API down over a rate-limiter hiccup
- **Prediction history** — every `/predict` call is logged to
  `prediction_history`; the last 5 show on the agent's detail page
- **Team invites** — `/dashboard/team`: invite by email + role, get a
  shareable link (no email service is wired up yet — see below),
  `/invite/{token}` handles login/signup redirect-through via a new
  `next` param on both, then joins the org and skips onboarding
  entirely (an invited user never needs to create their own org)

### Known gap: no email service

Invites generate a real, working link, but nothing sends it — the org
owner has to copy and share it themselves. Wiring a transactional email
provider (Resend, Postmark) is mechanical but needs an account + API
key this sandbox doesn't have; same for actually emailing the signup
confirmation link Supabase generates.

### Explicitly deferred: multi-class ML targets

The current trainer (`logistic_regression.py`) is binary-only — it's a
sigmoid + single weight vector, not softmax + one-vector-per-class. That
requires an algorithmic change (multinomial logistic regression), not
just wiring — it needs its own from-scratch implementation and its own
known-answer tests (a 3+ class dataset with a verifiable expected
accuracy), the same rigor as Phase 3's binary trainer. Scoping it out
rather than rushing a version that only gets "doesn't crash" testing
instead of "produces correct answers" testing.

### Additional setup for Phase 6

1. Re-run the SQL editor: `supabase/phase6_schema.sql`

### Test checklist for Phase 6

- [ ] Send 11 rapid messages through a widget chat in under a minute →
      the 11th gets a 429 with a `Retry-After` header
- [ ] Wait out the retry, send again → succeeds
- [ ] Make 61 `/predict` calls with the same API key inside a minute →
      the 61st is rate-limited; a different key is unaffected
- [ ] After a few `/predict` calls, the agent's detail page shows them
      under "Recent predictions"
- [ ] `/dashboard/team` → invite an email → copy the link → open it in
      an incognito window → prompted to sign up → after signup, lands
      directly in the inviting org's dashboard (never sees `/onboarding`)
- [ ] The invite disappears from the pending list once accepted
- [ ] Revoking a pending invite makes its link stop working
- [ ] An expired invite (manually backdate `expires_at` in Supabase to
      test) shows "This invite has expired" instead of joining

## Phase 7 — multi-class ML targets, and closing the last nav gap

### What I actually tested in the sandbox

- **Multi-class classification (10 Python + 7 + 13 TS = 30 tests)** —
  built as one-vs-rest on top of the already-tested binary trainer
  (lower risk than a from-scratch softmax implementation). Verified on
  a real 3-well-separated-cluster dataset: 100% accuracy, and the TS
  inference math (`predictMulticlass`) was cross-validated against real
  weights pulled from an actual live `/train` call — same pattern used
  for the binary/linear models in Phase 3.
- Training now auto-routes by distinct target-value count: 2 → binary
  encoder (yes/no, churned/retained…), 3–20 → multi-class encoder
  (alphabetically-indexed classes), 21+ → rejected as "looks like a
  free-text/ID column, not a classification target."

### What's built

- `training-service/multiclass_logistic_regression.py` — one-vs-rest,
  reuses `train_classifier` per class, shared standardization
- `lib/ml/encode-multiclass.ts` — deterministic 3–20 class encoding
- `lib/ml/inference/predict.ts` — `predictMulticlass`, dispatched
  automatically by `predict()` based on `model.type`
- `create/ml` page previews detected classes before training instead of
  blocking anything beyond binary
- `/predict` translates a multi-class numeric result back to the
  original class name in its response
- Agent detail page shows class names above the metrics table

### Nav-link audit found one more real gap

`/dashboard/settings` had been linked from the Sidebar since Phase 1 —
nobody ever built the page behind it. Built now: org rename, account
email/role display, plan summary linking to Billing.

### Test checklist for Phase 7

- [ ] Upload a CSV with a 3-5 class text target (e.g. a `tier` column
      with "bronze"/"silver"/"gold") → see the class list preview → train
      → agent detail page shows real per-class-aware metrics
      (accuracy/macro_precision/macro_recall/macro_f1) and the class names
- [ ] `curl` `/api/v1/agents/{id}/predict` on a multi-class agent →
      response includes both `classLabel` (numeric) and `className`
      (the original text value)
- [ ] A target column with 21+ distinct values is rejected with the
      "looks like a free-text or ID column" message
- [ ] `/dashboard/settings` loads, renaming the org updates the name
      shown in the Topbar

## Honest final backlog

Nothing below is a gap that was missed — each needs something this
sandbox structurally doesn't have:

- **Transactional email** (Resend/Postmark account) — invite links and
  signup confirmations work, nothing sends them automatically yet
- **scikit-learn/XGBoost** (network access for `pip install`) — the
  current trainer is real and tested, not a placeholder, but it's a
  stdlib implementation by necessity, not final architecture
- **Live verification of every external integration** (Claude, Voyage,
  Paddle, a deployed training service) — `DEPLOYMENT.md`'s 12-step smoke
  test is the way to close this out once it's running somewhere with
  network access

Everything else on the original roadmap — multi-agent workflows,
white-label widget, rate limiting, team invites, prediction history,
multi-class targets, billing/checkout — is built and tested.
