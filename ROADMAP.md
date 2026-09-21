# ROADMAP

Ranked by impact ÷ effort. Everything here is deliberately **not** built yet —
nothing in the product links to any of it, so there are no dead buttons.

## Growth (phase 6 remainder)

| # | Item | Why it is not done yet |
|---|---|---|
| 1 | Try-before-signup demo on the landing page | Needs a rate-limited, abuse-guarded public endpoint that spends real AI credits with no account attached. Worth doing, but it is a billing and abuse-surface change, not a marketing one. |
| 2 | Referral programme (invite link, credit reward) | Needs a new table, an abuse limit and a credit-grant path through the ledger. Specified in phase 7's entitlement work; better built on top of that than beside it. |
| 3 | In-app feedback widget and post-first-success survey | Needs a `feedback` table and a moderation story before it collects user text. |
| 4 | Blog scaffold (MDX) with draft posts | MDX pipeline plus a content model; no product surface depends on it. |
| 5 | Use-case landing pages | Each needs genuinely distinct content to be worth indexing; thin duplicates would hurt the domain rather than help it. |
| 6 | "Made with Agentmi" badge on free-plan public outputs | Only meaningful once public sharing of outputs exists; the widget is currently the single public surface. |

## Notes

Activation work that phase 6 asks for **is** already in the product and was not
rebuilt: templates with derived setup requirements, an onboarding flow, empty
states with a primary action, and a dashboard that leads with Create Agent.

## Product advantage (phase 8 remainder)

Phase 8 caps a session at three items. **Cost per run** was taken because it
was not missing but broken — the column, the capture and the UI all existed and
every run reported `$0.0000`. Everything else on the agentmi list was already
shipped and was not rebuilt: agent templates, the test playground with run
traces, knowledge upload with retrieval, integration connectors, deployment
versioning with rollback, and deploy-as-API-or-widget.

| # | Item | Why it is not done yet |
|---|---|---|
| 1 | Agent config version history with rollback | Deployments already snapshot and roll back. Agent-level config history needs its own table and a diff view; the deployment snapshot covers the dangerous case (what production is serving) today. |
| 2 | Per-run cost attribution by tool, not just model | Tool calls can hit paid third-party APIs whose price Agentmi does not know. Needs a per-tool cost declaration before the number would mean anything. |
| 3 | Budget cap with a kill switch | Depends on cost per run being recorded first, which is what this phase added. Now unblocked and is the natural next item. |
| 4 | Streaming responses in the playground | Real UX gain; needs the run recorder to handle partial results so a stream that dies mid-flight is not recorded as a success. |
| 5 | Background queue for long jobs with status polling | ML training already runs out-of-process; extending it to long AI jobs needs a queue table with retries and a dead-letter state. |
| 6 | Response caching keyed on prompt + config | Meaningful savings, but needs an explicit invalidation story when knowledge or instructions change, or agents will answer from a stale cache. |
