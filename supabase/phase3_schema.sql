-- === Added for shared-project deployment: isolates Agentmi under its own schema ===
create schema if not exists agentmi;
set search_path to agentmi, public, extensions;
-- === End of added preamble — original file content follows unchanged ===

-- Phase 3 additions. Run after schema.sql, policies.sql, and functions.sql.

create extension if not exists vector;

-- ---------- Knowledge base chunks (RAG for AI agents) ----------
create table if not exists knowledge_chunks (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  agent_id uuid not null references agents(id) on delete cascade,
  chunk_index integer not null,
  content text not null,
  embedding vector(1024), -- Voyage AI voyage-2 dimension; adjust if model changes
  created_at timestamptz not null default now()
);

create index if not exists idx_knowledge_chunks_agent on knowledge_chunks(agent_id);
-- IVFFlat index for approximate nearest-neighbor search at scale.
-- Requires ANALYZE after bulk inserts; fine to add once real volume exists.
create index if not exists idx_knowledge_chunks_embedding on knowledge_chunks
  using ivfflat (embedding vector_cosine_ops) with (lists = 100);

alter table knowledge_chunks enable row level security;
drop policy if exists "org members can manage their knowledge chunks" on knowledge_chunks;
create policy "org members can manage their knowledge chunks" on knowledge_chunks
  for all using (is_org_member(org_id) or is_platform_admin())
  with check (is_org_member(org_id) or is_platform_admin());

-- ---------- Training jobs (ML agents) ----------
do $$ begin
  create type training_job_status as enum ('queued', 'running', 'succeeded', 'failed');
exception when duplicate_object then null;
end $$;

create table if not exists training_jobs (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  agent_id uuid not null references agents(id) on delete cascade,
  dataset_id uuid not null references datasets(id),
  status training_job_status not null default 'queued',
  task text not null, -- 'classification' | 'regression'
  error_message text,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_training_jobs_agent on training_jobs(agent_id);

alter table training_jobs enable row level security;
drop policy if exists "org members can read their training jobs" on training_jobs;
create policy "org members can read their training jobs" on training_jobs
  for select using (is_org_member(org_id) or is_platform_admin());

-- ---------- Billing webhook idempotency ----------
-- Paddle can redeliver the same event; this prevents double-processing
-- (e.g. granting credits twice for one payment).
create table if not exists processed_webhook_events (
  event_id text primary key,
  event_type text not null,
  processed_at timestamptz not null default now()
);
