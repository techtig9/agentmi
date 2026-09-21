# Agentmi — audit and remediation log

Resumable record of issues found and their state. Priorities:
**P0** build/crash/login blocker · **P1** core feature broken · **P2** buttons/UX/layout · **P3** polish.

## Baseline at audit (phase 1)

| Check | Result |
|---|---|
| `npx tsc --noEmit` | 0 errors |
| `npm run lint` | 0 warnings |
| `npm test` | 317 pass |
| `npm run build` (no env set) | passes, 44 pages |
| Public pages with no env | `/` renders 200; protected routes → `/setup` |

48 pages · 10 API routes · 16 SQL migrations.

Product type (from README): **AI/ML agent builder**.
Design direction: **emerald/teal on near-black, node-graph motif with animated
connecting lines**. The current palette is cyan/violet/pink, which is close to
ufo.ai's direction; agentmi gets its own identity in phase 3.

## Issues

| # | Issue | File | Priority | Status |
|---|---|---|---|---|
| 1 | API routes construct a Supabase client with no config guard: unset env yields a 500 stack, not a "not configured" response | `app/api/**/route.ts` (8 of 10) | P1 | fixed (phase 2) |
| 2 | Non-null assertions (`!`) on environment variables — 11 occurrences | `lib/supabase/*.ts`, `middleware.ts`, `app/api/webhooks/paddle/route.ts` | P1 | fixed (phase 2) |
| 3 | No design tokens as CSS variables; no light mode; no theme toggle | `app/globals.css`, `tailwind.config.ts` | P1 | fixed (phase 3) |
| 4 | Palette does not match the product's design direction | `tailwind.config.ts` | P2 | fixed (phase 3) |
| 5 | No `typecheck` script; no `engines` field | `package.json` | P2 | fixed (phase 4) |
| 6 | `.gitignore` does not cover `*.zip` | `.gitignore` | P3 | fixed (phase 4) |
| 7 | No legal pages, changelog, blog, sitemap.xml, robots.txt, JSON-LD | `app/` | P2 | phases 6/9 |
| 8 | No `AUDIT.md` / `FIXES.md` / `ROADMAP.md` | repo root | P2 | fixed (phase 1/5) |

## Verified already correct (no action)

- No Supabase or API client created at import/module scope.
- No hardcoded `localhost` URLs in shipped code.
- No `console.log` in `app/`, `lib/`, `components/`.
- Lockfile committed; no secrets in git history (scanned).
- RLS, RBAC, HMAC-signed webhooks, SSRF-guarded tool runtime, credit ledger all present and tested.

## Next step

Phases 1-5 complete. Continue at phase 6 (growth and conversion).
