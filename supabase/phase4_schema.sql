-- === Added for shared-project deployment: isolates Agentmi under its own schema ===
create schema if not exists agentmi;
set search_path to agentmi, public, extensions;
-- === End of added preamble — original file content follows unchanged ===

-- Phase 4: public API access (api_keys) and outbound webhooks
-- (webhook_endpoints / webhook_deliveries). Distinct from the inbound
-- Paddle webhook (Phase 3) — these are Agentmi notifying ITS customers.

create table api_keys (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  name text not null default 'API Key',
  key_hash text not null unique,
  display_prefix text not null,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  last_used_at timestamptz,
  revoked_at timestamptz
);

create table webhook_endpoints (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  url text not null,
  secret text not null, -- generated server-side, shown once, used to sign deliveries
  subscribed_events text[] not null default array['agent.created', 'agent.training_completed', 'agent.training_failed', 'knowledge.updated'],
  is_active boolean not null default true,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now()
);

create table webhook_deliveries (
  id uuid primary key default gen_random_uuid(),
  endpoint_id uuid not null references webhook_endpoints(id) on delete cascade,
  event text not null,
  payload jsonb not null,
  response_status integer,
  attempted_at timestamptz not null default now(),
  succeeded boolean not null default false
);

alter table api_keys enable row level security;
alter table webhook_endpoints enable row level security;
alter table webhook_deliveries enable row level security;

create policy "org members can manage their api keys" on api_keys
  for all using (is_org_member(org_id) or is_platform_admin())
  with check (is_org_member(org_id) or is_platform_admin());

create policy "org members can manage their webhook endpoints" on webhook_endpoints
  for all using (is_org_member(org_id) or is_platform_admin())
  with check (is_org_member(org_id) or is_platform_admin());

create policy "org members can read their webhook delivery log" on webhook_deliveries
  for select using (
    is_platform_admin() or exists (
      select 1 from webhook_endpoints e where e.id = webhook_deliveries.endpoint_id and is_org_member(e.org_id)
    )
  );

create index idx_api_keys_hash on api_keys(key_hash) where revoked_at is null;
create index idx_webhook_endpoints_org on webhook_endpoints(org_id) where is_active = true;
