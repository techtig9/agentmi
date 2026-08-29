-- === Added for shared-project deployment: isolates Agentmi under its own schema ===
create schema if not exists agentmi;
set search_path to agentmi, public, extensions;
-- === End of added preamble — original file content follows unchanged ===

-- Atomic credit operations. Called via supabase.rpc(...) from server-only
-- code (never directly from the client). Mirrors the arithmetic in
-- lib/credits/ledger-math.ts — keep both in sync if this changes.

create or replace function consume_credits(
  p_org_id uuid,
  p_amount integer,
  p_reason text,
  p_related_agent_id uuid default null,
  p_actor_id uuid default null
) returns table (allowed boolean, balance_after integer, shortfall integer)
language plpgsql security definer set search_path = agentmi, public as $$
declare
  v_current_balance integer;
begin
  if p_amount < 0 then
    raise exception 'consume_credits: amount must be non-negative';
  end if;

  -- Row lock prevents two concurrent requests from both reading the same
  -- balance and both succeeding when only one credit's worth exists.
  select balance into v_current_balance
  from credit_balances
  where org_id = p_org_id
  for update;

  if v_current_balance is null then
    raise exception 'consume_credits: no credit_balances row for org %', p_org_id;
  end if;

  if v_current_balance < p_amount then
    return query select false, v_current_balance, (p_amount - v_current_balance);
    return;
  end if;

  update credit_balances
  set balance = v_current_balance - p_amount, updated_at = now()
  where org_id = p_org_id;

  insert into credit_ledger (org_id, amount, entry_type, reason, related_agent_id, created_by)
  values (p_org_id, -p_amount, 'consume', p_reason, p_related_agent_id, p_actor_id);

  return query select true, (v_current_balance - p_amount), 0;
end;
$$;

create or replace function grant_credits(
  p_org_id uuid,
  p_amount integer,
  p_reason text,
  p_actor_id uuid default null
) returns integer
language plpgsql security definer set search_path = agentmi, public as $$
declare
  v_new_balance integer;
begin
  if p_amount < 0 then
    raise exception 'grant_credits: amount must be non-negative';
  end if;

  insert into credit_balances (org_id, balance)
  values (p_org_id, p_amount)
  on conflict (org_id) do update
    set balance = credit_balances.balance + excluded.balance, updated_at = now()
  returning balance into v_new_balance;

  insert into credit_ledger (org_id, amount, entry_type, reason, created_by)
  values (p_org_id, p_amount, 'grant', p_reason, p_actor_id);

  return v_new_balance;
end;
$$;
