-- === Added for shared-project deployment: isolates Agentmi under its own schema ===
create schema if not exists agentmi;
set search_path to agentmi, public, extensions;
-- === End of added preamble — original file content follows unchanged ===

-- Phase 6: rate limiting, ML prediction history, team invites.

-- Rate limiting: one row per (key), atomic via row lock — same pattern
-- as consume_credits(). Mirrors lib/rate-limit/token-bucket.ts's math;
-- keep both in sync if this changes.
create table if not exists rate_limit_buckets (
  key text primary key,
  tokens double precision not null,
  last_refill_ms bigint not null
);

create or replace function rate_limit_check(
  p_key text,
  p_capacity double precision,
  p_refill_per_second double precision,
  p_now_ms bigint,
  p_cost double precision default 1
) returns table (allowed boolean, remaining integer, retry_after_ms bigint)
language plpgsql security definer set search_path = agentmi, public as $$
declare
  v_tokens double precision;
  v_last_refill_ms bigint;
  v_elapsed_seconds double precision;
  v_refilled double precision;
begin
  select tokens, last_refill_ms into v_tokens, v_last_refill_ms
  from rate_limit_buckets where key = p_key for update;

  if not found then
    v_tokens := p_capacity;
    v_last_refill_ms := p_now_ms;
    insert into rate_limit_buckets (key, tokens, last_refill_ms) values (p_key, v_tokens, v_last_refill_ms);
  end if;

  v_elapsed_seconds := greatest(0, (p_now_ms - v_last_refill_ms) / 1000.0);
  v_refilled := least(p_capacity, v_tokens + v_elapsed_seconds * p_refill_per_second);

  if v_refilled >= p_cost then
    update rate_limit_buckets set tokens = v_refilled - p_cost, last_refill_ms = p_now_ms where key = p_key;
    return query select true, floor(v_refilled - p_cost)::integer, 0::bigint;
  else
    update rate_limit_buckets set tokens = v_refilled, last_refill_ms = p_now_ms where key = p_key;
    return query select false, floor(v_refilled)::integer,
      ceil(((p_cost - v_refilled) / p_refill_per_second) * 1000)::bigint;
  end if;
end;
$$;

-- ML prediction history — every call to /api/v1/agents/{id}/predict is
-- logged, so an org can see what's been predicted and audit usage.
create table if not exists prediction_history (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  agent_id uuid not null references agents(id) on delete cascade,
  input jsonb not null,
  output jsonb not null,
  created_at timestamptz not null default now()
);

alter table prediction_history enable row level security;
drop policy if exists "org members can read their prediction history" on prediction_history;
create policy "org members can read their prediction history" on prediction_history
  for select using (is_org_member(org_id) or is_platform_admin());

create index if not exists idx_prediction_history_agent on prediction_history(agent_id, created_at desc);

-- Team invites — email-based, single-use, expiring.
create table if not exists team_invites (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  email text not null,
  role org_role not null default 'member',
  token_hash text not null unique,
  invited_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  accepted_at timestamptz
);

alter table team_invites enable row level security;
drop policy if exists "org members can manage their invites" on team_invites;
create policy "org members can manage their invites" on team_invites
  for all using (is_org_member(org_id) or is_platform_admin())
  with check (is_org_member(org_id) or is_platform_admin());

create index if not exists idx_team_invites_org on team_invites(org_id) where accepted_at is null;
