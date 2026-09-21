-- Phase 10: record a real provider cost estimate per run.
--
-- `agent_runs.cost_usd` was `not null default 0` and every caller wrote a
-- literal 0, so the run detail page reported "$0.0000" for every run ever
-- executed. Token usage was already captured; only the conversion was missing.
--
-- An unpriced model must record NULL rather than 0: "we have no rate for this
-- model" and "this run was free" are different facts, and a cost report that
-- collapses them is wrong rather than merely imprecise.
--
-- Relaxing NOT NULL and dropping the default loses no data. Guarded so the
-- file can be re-run with the rest of the migration list.

set search_path to agentmi, public;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'agentmi'
      and table_name = 'agent_runs'
      and column_name = 'cost_usd'
      and is_nullable = 'NO'
  ) then
    alter table agent_runs alter column cost_usd drop not null;
    alter table agent_runs alter column cost_usd drop default;
  end if;
end
$$;

-- Cost reporting filters by org and orders by recency; without this the
-- observability queries scan the whole table per workspace.
create index if not exists agent_runs_org_created_idx on agent_runs (org_id, created_at desc);
