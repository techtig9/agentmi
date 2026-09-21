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
