-- === Added for shared-project deployment: isolates Agentmi under its own schema ===
create schema if not exists agentmi;
set search_path to agentmi, public, extensions;
-- === End of added preamble — original file content follows unchanged ===

-- Phase 5: multi-agent workflows + white-label widget support.

create table if not exists workflows (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  name text not null,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now()
);

-- An AI agent's membership in a workflow as a specialist. An agent can
-- belong to at most one workflow (simplifies routing/ownership); the
-- first-added member is the fallback when routing finds no term overlap.
create table if not exists workflow_members (
  workflow_id uuid not null references workflows(id) on delete cascade,
  agent_id uuid not null references agents(id) on delete cascade,
  keywords text[] not null default array[]::text[],
  added_at timestamptz not null default now(),
  primary key (workflow_id, agent_id)
);

-- Public, safe-to-expose identifier for embeddable widgets — deliberately
-- NOT the org's API key (that would leak a full-access credential into
-- every visitor's page source). Scoped to exactly one agent's /chat.
alter table agents add column public_widget_id uuid not null default gen_random_uuid();
create unique index if not exists idx_agents_public_widget_id on agents(public_widget_id);

alter table workflows enable row level security;
alter table workflow_members enable row level security;

drop policy if exists "org members can manage their workflows" on workflows;
create policy "org members can manage their workflows" on workflows
  for all using (is_org_member(org_id) or is_platform_admin())
  with check (is_org_member(org_id) or is_platform_admin());

drop policy if exists "org members can manage their workflow members" on workflow_members;
create policy "org members can manage their workflow members" on workflow_members
  for all using (
    is_platform_admin() or exists (
      select 1 from workflows w where w.id = workflow_members.workflow_id and is_org_member(w.org_id)
    )
  )
  with check (
    is_platform_admin() or exists (
      select 1 from workflows w where w.id = workflow_members.workflow_id and is_org_member(w.org_id)
    )
  );

-- Public widget lookups (agent name/theme/branding, by public_widget_id)
-- are served by app/api/widget/[publicWidgetId]/chat/route.ts using the
-- service-role client (lib/supabase/service.ts) — the same pattern as the
-- Paddle webhook and the API-key-authenticated /api/v1 routes. No RLS
-- policy is added here on purpose: a permissive `using (true)` SELECT
-- policy would let anyone with the public anon key read every org's
-- agent config (system prompts, ML model weights) directly, not just the
-- safe fields the widget actually needs.
