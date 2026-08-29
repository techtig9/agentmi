-- Agentmi platform expansion, additive only. Run AFTER schema.sql and phases 3-6.
create schema if not exists agentmi;
set search_path to agentmi, public, extensions;

create table if not exists agent_tools (
  id uuid primary key default gen_random_uuid(), org_id uuid not null references organizations(id) on delete cascade,
  name text not null, description text, kind text not null default 'http', config jsonb not null default '{}',
  is_active boolean not null default true, created_by uuid references profiles(id), created_at timestamptz not null default now()
);
create table if not exists agent_runs (
  id uuid primary key default gen_random_uuid(), org_id uuid not null references organizations(id) on delete cascade,
  agent_id uuid not null references agents(id) on delete cascade, deployment_id uuid, status text not null default 'running',
  input jsonb not null default '{}', output jsonb, trace jsonb not null default '[]', duration_ms integer,
  token_usage jsonb not null default '{}', cost_usd numeric(12,6) not null default 0, error text, created_at timestamptz not null default now()
);
create table if not exists agent_evaluations (
  id uuid primary key default gen_random_uuid(), org_id uuid not null references organizations(id) on delete cascade,
  agent_id uuid not null references agents(id) on delete cascade, name text not null, status text not null default 'draft',
  score numeric(7,3), test_count integer not null default 0, cases jsonb not null default '[]', created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists agent_deployments (
  id uuid primary key default gen_random_uuid(), org_id uuid not null references organizations(id) on delete cascade,
  agent_id uuid not null references agents(id) on delete cascade, name text not null, environment text not null default 'staging',
  status text not null default 'draft', endpoint_url text, version integer, config jsonb not null default '{}', created_by uuid references profiles(id), created_at timestamptz not null default now()
);
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'agent_runs_deployment_fk') then
    alter table agent_runs add constraint agent_runs_deployment_fk foreign key (deployment_id) references agent_deployments(id) on delete set null;
  end if;
end $$;
create table if not exists agent_secrets (
  id uuid primary key default gen_random_uuid(), org_id uuid not null references organizations(id) on delete cascade,
  name text not null, provider text not null, secret_ref text not null, revoked_at timestamptz, created_by uuid references profiles(id), created_at timestamptz not null default now()
);
create table if not exists integrations (
  id uuid primary key default gen_random_uuid(), org_id uuid not null references organizations(id) on delete cascade,
  name text not null, provider text not null, status text not null default 'disconnected', config jsonb not null default '{}', secret_id uuid references agent_secrets(id) on delete set null,
  created_by uuid references profiles(id), created_at timestamptz not null default now()
);
create index if not exists idx_agent_tools_org on agent_tools(org_id);
create index if not exists idx_agent_runs_org on agent_runs(org_id, created_at desc);
create index if not exists idx_agent_runs_agent on agent_runs(agent_id, created_at desc);
create index if not exists idx_agent_evaluations_org on agent_evaluations(org_id, created_at desc);
create index if not exists idx_agent_deployments_org on agent_deployments(org_id, created_at desc);
create index if not exists idx_agent_secrets_org on agent_secrets(org_id);
create index if not exists idx_integrations_org on integrations(org_id);

alter table agent_tools enable row level security;
alter table agent_runs enable row level security;
alter table agent_evaluations enable row level security;
alter table agent_deployments enable row level security;
alter table agent_secrets enable row level security;
alter table integrations enable row level security;
drop policy if exists "org members manage agent tools" on agent_tools;
create policy "org members manage agent tools" on agent_tools for all using (is_org_member(org_id) or is_platform_admin()) with check (is_org_member(org_id) or is_platform_admin());
drop policy if exists "org members read agent runs" on agent_runs;
create policy "org members read agent runs" on agent_runs for select using (is_org_member(org_id) or is_platform_admin());
drop policy if exists "org members create agent runs" on agent_runs;
create policy "org members create agent runs" on agent_runs for insert with check (is_org_member(org_id) or is_platform_admin());
drop policy if exists "org members manage evaluations" on agent_evaluations;
create policy "org members manage evaluations" on agent_evaluations for all using (is_org_member(org_id) or is_platform_admin()) with check (is_org_member(org_id) or is_platform_admin());
drop policy if exists "org members manage deployments" on agent_deployments;
create policy "org members manage deployments" on agent_deployments for all using (is_org_member(org_id) or is_platform_admin()) with check (is_org_member(org_id) or is_platform_admin());
drop policy if exists "org members manage secrets" on agent_secrets;
create policy "org members manage secrets" on agent_secrets for all using (is_org_member(org_id) or is_platform_admin()) with check (is_org_member(org_id) or is_platform_admin());
drop policy if exists "org members manage integrations" on integrations;
create policy "org members manage integrations" on integrations for all using (is_org_member(org_id) or is_platform_admin()) with check (is_org_member(org_id) or is_platform_admin());
