-- === Added for shared-project deployment: isolates Agentmi under its own schema ===
create schema if not exists agentmi;
set search_path to agentmi, public, extensions;
-- === End of added preamble — original file content follows unchanged ===

-- Row Level Security: every org-scoped table is isolated to its members.
-- Admins (profiles.is_admin = true) bypass restrictions via a helper function.

create or replace function is_org_member(target_org uuid)
returns boolean language sql security definer set search_path = agentmi, public as $$
  select exists (
    select 1 from memberships
    where org_id = target_org and user_id = auth.uid()
  );
$$;

create or replace function is_platform_admin()
returns boolean language sql security definer set search_path = agentmi, public as $$
  select coalesce((select is_admin from profiles where id = auth.uid()), false);
$$;

alter table organizations enable row level security;
alter table memberships enable row level security;
alter table subscriptions enable row level security;
alter table credit_ledger enable row level security;
alter table credit_balances enable row level security;
alter table agents enable row level security;
alter table datasets enable row level security;
alter table ml_models enable row level security;
alter table audit_logs enable row level security;

drop policy if exists "org members can read their org" on organizations;
create policy "org members can read their org" on organizations
  for select using (is_org_member(id) or is_platform_admin());

drop policy if exists "org members can read their membership rows" on memberships;
create policy "org members can read their membership rows" on memberships
  for select using (is_org_member(org_id) or is_platform_admin());

drop policy if exists "org members can read their subscription" on subscriptions;
create policy "org members can read their subscription" on subscriptions
  for select using (is_org_member(org_id) or is_platform_admin());

drop policy if exists "org members can read their credit ledger" on credit_ledger;
create policy "org members can read their credit ledger" on credit_ledger
  for select using (is_org_member(org_id) or is_platform_admin());

drop policy if exists "org members can read their credit balance" on credit_balances;
create policy "org members can read their credit balance" on credit_balances
  for select using (is_org_member(org_id) or is_platform_admin());

drop policy if exists "org members can manage their agents" on agents;
create policy "org members can manage their agents" on agents
  for all using (is_org_member(org_id) or is_platform_admin())
  with check (is_org_member(org_id) or is_platform_admin());

drop policy if exists "org members can manage their datasets" on datasets;
create policy "org members can manage their datasets" on datasets
  for all using (is_org_member(org_id) or is_platform_admin())
  with check (is_org_member(org_id) or is_platform_admin());

drop policy if exists "org members can read model versions for their agents" on ml_models;
create policy "org members can read model versions for their agents" on ml_models
  for select using (
    is_platform_admin() or exists (
      select 1 from agents a where a.id = ml_models.agent_id and is_org_member(a.org_id)
    )
  );

drop policy if exists "org members can read their audit log" on audit_logs;
create policy "org members can read their audit log" on audit_logs
  for select using (is_org_member(org_id) or is_platform_admin());

-- Note: writes to subscriptions, credit_ledger, and credit_balances happen
-- exclusively through server-side routes using the service role key
-- (billing webhooks, credit-consumption endpoints) — never directly from
-- the client — so no client-side insert/update policies are defined here.
