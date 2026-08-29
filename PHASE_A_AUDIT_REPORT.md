# Phase A — Audit Report

Produced against the live codebase after Phase B (build correctness) completed clean:
`tsc` 0 errors, `lint` 0 errors, 149/149 JS tests, 21/21 Python tests, production build
green with self-hosted fonts. Every finding below is grounded in the actual code —
file/table names are cited so each item can be re-verified directly.

Status key: **PASS** = real, wired end-to-end. **PARTIAL** = real but incomplete —
missing a consumer, an enforcement point, or a create/mutate path. **GAP** = present in
name (route/table/UI) but not functionally real yet.

| Master spec phase | Status | Evidence |
|---|---|---|
| C — Design system | PASS | Real token system (`base`/`neon`/`ink` color scales, font vars, shadows, border radius in `tailwind.config.ts`) and real reusable component classes (`.neon-card`, `.btn-primary`, `.btn-secondary`, `.credit-badge`) with `prefers-reduced-motion` and `focus-visible` handling already built in. Found and fixed the only real inconsistency: 4 spots (secrets/integrations pages) used raw Tailwind `text-red-300` instead of the `neon-pink` token every other danger/error state in the app uses — now unified. |
| D — Auth/onboarding | PASS (was PASS w/ MFA gap) | **Fixed:** real TOTP MFA via Supabase Auth's built-in `auth.mfa` API — enrollment UI in Settings (QR code + verify), a login-time challenge page (`/login/mfa`), and — the part that actually matters — central enforcement in `middleware.ts`. Without that middleware check, a session created at password-only sign-in could reach any dashboard/admin route directly, skipping the second factor entirely; that bypass is now closed for every route, not just the login redirect. Covered by `tests/mfa.test.ts` (pure code-validation unit tests + static contract tests guarding both enforcement points). |
| E — Agent runtime | PASS | Multi-provider routing (Groq/Cerebras/OpenRouter/Anthropic) in `lib/chat/run-agent-chat.ts`, now fully typed (Phase B), tool-calling loop implemented, `agent-runtime.test.ts` + `ai-provider-routing.test.ts` passing. |
| F — Tools | PASS | `agent_tools` table real, RLS-enabled (`phase7_10_schema.sql`), fetched and executed inside the chat runtime (not just listed). |
| G — Knowledge/RAG | PASS (was PARTIAL) | Traced end-to-end for real, no gaps found: text/URL ingestion (with real SSRF protection — blocks localhost/private-network hosts) → validation → chunking → real Voyage embeddings → pgvector storage, and at chat time: query embedding → a real `match_knowledge_chunks` Postgres RPC (cosine distance, RLS-respecting, `security invoker`) → top-k chunks formatted into the system prompt with prompt-injection-aware framing (`[Source N]` blocks clearly delimited as "reference only, not instructions"). Nothing here needed fixing. |
| H — Memory | PASS | `lib/memory/store.ts` (`getOrCreateSession`, `loadSessionMessages`, `appendSessionMessages`, `getMemories`) is a real consumer of the dashboard chat route, not a dead module. |
| I — Workflows | PASS | Real DAG execution (`topologicalOrder`, rewritten in Phase B.3) plus a legacy keyword-router fallback for pre-graph workflows — both paths tested. |
| J — Evaluations | PASS (was GAP) | **Built the missing engine.** `lib/actions/evaluations.ts` adds real `createEvaluation`/`runEvaluation` actions — cases are parsed from a simple `input => expected substring` format (`lib/evaluations/parse-cases.ts`), each case runs through the actual production chat runtime (not a separate/fake evaluation path), scored by deterministic substring match, and persisted with per-case pass/fail detail. Credits are charged per case since each one is a real model call. Evaluations UI now has a working create form, a run button, and case-level results. Covered by 10 new unit tests (`tests/evaluations.test.ts`) on the pure parsing/scoring logic. |
| K — Observability | PASS | `recordAgentRun` now called from all four chat/predict paths (fixed in Phase B — the public widget route previously skipped it entirely). Runs list + detail pages are real queries, not mocks. |
| L — Deployment/API | PASS | Real deployment CRUD + versioned public run endpoint (`app/api/v1/deployments/[id]/run`), API-key auth (`api-keys.test.ts`), rate limiting (`RATE_LIMITS`, token-bucket tested). |
| M — Billing | PASS (surface-checked) | Real Paddle webhook route + price-map, both under test (`paddle-webhook.test.ts`, `paddle-price-map.test.ts`, `ledger-math.test.ts`). Not re-verified against a live Paddle sandbox in this pass. |
| N — Teams/security | PASS (was PARTIAL) | RBAC enforcement (from before) plus **the Secrets vault now has a real consumer.** `lib/secrets/resolve.ts` resolves a stored `secret_ref` — documented to users as a "secret manager reference" — against this deployment's environment (the honest, minimal secrets-manager pattern, since no external vault is configured). It's wired into two real call sites: custom HTTP tools can now attach a secret to authenticate their outbound calls (`lib/chat/tool-runtime.ts`, `lib/chat/run-agent-chat.ts`), and integration verification (see O) resolves the same way. Config-supplied `Authorization` headers are still stripped — the only legitimate source is the resolved secret. |
| O — Integrations | PASS (was GAP) | **Fixed:** `createIntegration` now performs real per-provider verification (`lib/integrations/verify.ts`) before ever setting `status: "connected"` — Slack via `auth.test`, GitHub via `/user`, webhook/custom via a real reachability check (SSRF-guarded, same `isSafeHttpUrl` used by the tool runtime). A failed verification returns the provider's actual rejection reason and nothing is inserted. Covered by `tests/secrets-integrations.test.ts` (11 tests) using an injectable-fetch pattern so the decision logic — including "fails closed on a network error" — is tested without live calls to Slack/GitHub. |
| P — Marketplace/templates | PASS | Real `publishMarketplaceItem` / `unpublishMarketplaceItem` / `installMarketplaceItem` server actions in `lib/actions/ecosystem.ts`, not static cards. |
| Q — Analytics | PASS | Fixed in Phase B.3 — was previously a real bug (success rate/latency always read as 0). Now one correct query drives real numbers. |
| R — Admin/support | PASS (was PARTIAL) | **Built the missing support/notifications system**, tied together rather than two disconnected features: `support_tickets` (any org member can file, RLS-scoped) and `notifications` (created automatically when a Techtig admin replies). New pages: `/dashboard/support` (file + view requests), `/dashboard/notifications` (view/mark read, with a real unread-count badge in the Topbar), `/admin/support` (cross-org admin queue, admin-only via `ctx.isAdmin`). Covered by 4 contract tests in `tests/support.test.ts` guarding admin-only reply gating and that a reply genuinely creates a notification row. |
| S — Production hardening | PASS (was PARTIAL) | Found and fixed three real, evidence-based issues (not assumptions): (1) sidebar icon glyphs weren't `aria-hidden`, so screen readers announced the raw character before every nav label on every page; (2) computed actual WCAG contrast ratios for the full color token system — `ink-600` (used at small text sizes in ~92 places) measured only 3.0-3.3:1, a real AA failure, fixed at the token level in `tailwind.config.ts` (now 5.3-5.7:1) rather than touching every call site; (3) the sidebar was a fixed 256px-wide element with zero responsive handling — on a 375px phone that left ~119px for content. Built a real mobile drawer (`DashboardShell`) with a hamburger toggle, backdrop, and auto-close on navigation. The Next 16 major-version upgrade (the only remaining `npm audit` items) remains a deliberate, separate decision — not a hardening-phase patch, given the scope of an App Router + React 19 migration. |
| T — Acceptance testing | PASS (was PARTIAL) | Honest scope note: true browser-driven E2E (a real browser against a live deployed app + database) isn't executable in this environment — no live Supabase project is connected here, and Playwright's browser binaries download from a CDN outside this sandbox's network allowlist. Building that scaffolding and claiming it "passes" without ever running it would be exactly the fake-completeness problem this whole effort has been fixing. Instead, **every manual check run across all four phases of this engagement was codified into a permanent, re-runnable acceptance matrix** (`tests/acceptance-matrix.test.ts`): no fake-feature markers, no dead links, no raw colors bypassing the design token system, no explicit `any` regressions, every chat-capable route recording observability, every sidebar link resolving to a real page, the Next CVE patch baseline, and the self-hosted-fonts guarantee. Building this matrix caught one more real, previously-missed gap: the workflow chat route never called `recordAgentRun` — the same bug class fixed for the widget route back in Phase B, but never applied here. Fixed on both its execution paths (graph DAG and legacy specialist routing), each now recording success/failure per agent call. 189/189 tests passing, full clean-room `ci → typecheck → lint → test → build` all green. |

## Status: all 18 areas addressed

Every phase area from the original audit (C through T) is now PASS. Summary of what
changed since the original audit, in the order it was done:

- **RBAC enforcement** — 11 privileged actions across 6 files gained real role checks
- **Design system (C)** — 4 raw-color inconsistencies fixed at the token level
- **MFA (D)** — real TOTP two-factor auth, enforced centrally in middleware
- **Knowledge/RAG (G)** — traced end-to-end, found genuinely complete, no changes needed
- **Evaluations (J)** — built the missing create/run/score engine from scratch
- **Secrets consumer (N)** — the vault now authenticates real tool and integration calls
- **Integrations honesty (O)** — real per-provider verification before "connected"
- **Admin/support (R)** — built a real ticket + notification system
- **Production hardening (S)** — accessibility (aria-hidden icons, WCAG contrast fix)
  and a real mobile navigation drawer, both found via evidence, not assumption
- **Acceptance testing (T)** — codified every manual check from this engagement into
  a permanent regression matrix, which caught one more real gap (workflow chat
  missing observability) in the process

**What's deliberately still open, and why:** the Next 16 major-version upgrade
(remaining `npm audit` items) was assessed twice (Phase B and Phase S) and deliberately
deferred both times — it's a React 19 + App Router migration warranting its own
dedicated effort, not a patch. True browser-driven E2E testing needs a live Supabase
project and a network-unrestricted environment, neither available here — the
acceptance matrix is the honest substitute given those constraints.

**Final verification, clean-room:** `rm -rf node_modules .next && npm ci` → `tsc
--noEmit` → `npm run lint` → `npm test` (189/189) → `npm run build`, all green in one
uninterrupted pass, plus the Python training-service suite (21/21).
