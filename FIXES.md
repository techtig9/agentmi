# FIXES — phases 1-5

What changed, what did not, and what you need to do by hand.

## 1. Fixed

### Configuration resilience (P0/P1)
- **Every route crashed with no env set.** `createClient()` asserted its
  variables with `!` and the landing page called it before rendering, so an
  unconfigured deployment answered *every* URL — including the public
  marketing page — with "Something went wrong". The landing page now checks
  configuration first and renders; `/dashboard`, `/login`, `/signup` and
  `/onboarding` redirect to a new `/setup` screen that names the variables
  actually missing, read live from `process.env` (names only, never values).
- **8 of 10 API routes returned a 500 stack** instead of saying what was
  wrong. All feature routes now answer `503` with
  `{"code":"not_configured"}`. `/api/health` (liveness) and `/api/ready`
  (which reports configuration itself) build no client and stay exempt.
- **11 non-null assertions on env vars removed**, replaced by
  `required(value, name)` which throws a `ConfigurationError` naming the
  variable. It takes the value, not the name, so call sites keep static
  `process.env.X` access and Next.js can still inline `NEXT_PUBLIC_*`.

### Migrations (P1)
- **The migration list could not be re-run.** 22 `create table`, 12
  `create index`, 8 `create type` and 20 `create policy` statements had no
  guard. All 38 tables, 36 indexes, 8 types and 37 policies are now
  idempotent. `create type` has no `IF NOT EXISTS` clause in PostgreSQL, so
  each enum is wrapped in a `DO` block that swallows `duplicate_object`;
  policies are preceded by `DROP POLICY IF EXISTS`.
- **DEPLOYMENT.md listed 9 of the 16 migrations.** A fresh install following
  it would have been missing seven files' worth of tables.

### Design (P1/P2)
- The palette was literal hexes in `tailwind.config.ts`, so **no second theme
  could exist**. Every colour is now a CSS custom property stored as an
  `R G B` channel triplet inside `rgb(... / <alpha-value>)` — the triplet
  shape is load-bearing, because a plain hex in a variable silently breaks
  every opacity modifier and there are over a hundred.
- Light and dark are one variable swap, so no component needs a `dark:`
  variant and a screen cannot ship supporting only one theme. All 1202
  existing colour usages keep working because the token names are unchanged.
- Theme preference is light/dark/system, persisted per browser, applied by an
  inline script before first paint so there is no flash.
- Product direction applied: teal accent on near-black, with a node-graph
  motif in the hero drawn from the real execution pipeline.

### Repo
- `typecheck` script; `engines.node >= 20`; `.gitignore` covers `*.zip`.
- README rewritten; `docs/DEPLOY_VERCEL.md` added.
- No unused dependencies, committed build output, `console.log` calls or TODO
  stubs were found.

## 2. Not fixed, and why

- **No password-recovery or OAuth UI.** Neither is implemented server-side.
  Shipping the buttons would mean shipping controls that do nothing.
- **Template categories.** The specification lists eight; the database seeds
  three. Hardcoding eight would ship five permanently-empty filters.
- **No fabricated social proof.** No testimonials, customer logos, ratings,
  download counts or "trusted by" claims anywhere.
- **Git history not rewritten.** Not needed: the history was scanned and
  contains no secrets (no `.env` was ever committed, `.env.example` holds only
  placeholders, and no token-shaped strings exist in any tracked file).

## 3. Design decisions

- **Token names kept** (`base`, `neon`, `ink`) rather than renamed. Renaming
  would have touched 1202 usages across ~100 files for no functional gain;
  `neon-cyan` is now the product's teal and the semantic aliases (`accent`,
  `surface`, `content`) are what new code should use.
- **Light accent is teal-700, not teal-600.** Teal-600 measured 3.51:1 on
  white and failed WCAG AA. Every foreground token was validated against the
  surfaces it is used on, in both themes, at 4.5:1.
- **`/setup` reports live state**, not a fixed list, and redirects to `/` when
  the deployment is configured — so it can never become a stale banner
  claiming a healthy install is broken.
- **Landing page and auth layout pinned `force-dynamic`.** Both were only
  implicitly dynamic through `cookies()`; the configuration guard can skip
  that call, and without pinning, Next.js would prerender the *unconfigured*
  branch at build time and keep serving it after credentials were added.

## 4. MANUAL ACTIONS FOR ME

### Environment variables (Vercel → Settings → Environment Variables)

Required before anything can sign in:

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
NEXT_PUBLIC_APP_URL
```

Then, by what each unlocks:

| Unlocks | Variables |
|---|---|
| Running any agent | one of `GROQ_API_KEY`, `CEREBRAS_API_KEY`, `OPENROUTER_API_KEY` |
| Knowledge indexing | `VOYAGE_API_KEY` |
| Billing | `PADDLE_API_KEY`, `NEXT_PUBLIC_PADDLE_CLIENT_TOKEN`, `PADDLE_WEBHOOK_SECRET`, six `PADDLE_PRICE_*` |
| ML training/prediction | `TRAINING_SERVICE_URL` |

**Changing a variable does not rebuild.** Redeploy afterwards.

### Migration order

Run all sixteen in the order in `docs/DEPLOY_VERCEL.md` §2. They are
idempotent, so re-running is safe.

### Supabase settings

1. Settings → API → Exposed schemas: add `agentmi`.
2. Authentication → Providers: enable Email.
3. Authentication → URL Configuration: set Site URL to the deployed URL.

### Paddle

On each Price set Custom Data to `{"plan_id":"starter"}` (or `"pro"` /
`"business"`). Without it a successful payment stores `plan: null`.

### Keys to rotate

None. No secret was ever committed to this repository.

## 5. Five-minute test checklist

1. Open `/` — the marketing page renders; toggle light/dark/system in the nav
   and reload; the choice survives with no flash.
2. Open `/api/health` → 200. Open `/api/ready` → 200 once configured.
3. Sign up, confirm the email, land in onboarding.
4. Create an agent from a template; open the playground and send a message;
   confirm a run appears under Runs with a trace.
5. Attach a knowledge source, re-index it, ask a question that needs it.
6. Open Observability and confirm the success rate is not 0% with runs present.
7. Rotate an API key; confirm the old key stops working.
8. Resize to 375px — no horizontal scrolling on any page.
