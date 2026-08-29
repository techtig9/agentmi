# Agentmi Phase 8 — Governance, Analytics & Integrations

Implemented only Phase 8 after Phase 7.

- Analytics now calculates success rate, failures, average latency and tracked cost from agent_runs.
- Audit logs support action filtering and retain actor metadata.
- Secrets support creating/revoking organization-scoped secret references; raw secret values are never rendered.
- Integrations support connect/disconnect with an optional active secret reference and audit events.
- Phase 8 SQL adds indexes and uniqueness safeguards without deleting/renaming existing data.

Verification: targeted Phase 8 contract tests pass; full Next.js build requires project dependencies and live credentials.
Apply `supabase/phase8_governance.sql` to the target Supabase project.
