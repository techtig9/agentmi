-- Phase 3 production knowledge-source layer. Additive only; existing chunks remain valid.
set search_path to agentmi, public, extensions;

create table if not exists knowledge_sources (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  agent_id uuid not null references agents(id) on delete cascade,
  kind text not null check (kind in ('text','url','file')),
  title text not null,
  locator text,
  status text not null default 'processing' check (status in ('processing','ready','failed')),
  char_count integer not null default 0,
  chunk_count integer not null default 0,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_knowledge_sources_agent on knowledge_sources(agent_id, created_at desc);
create index if not exists idx_knowledge_sources_org on knowledge_sources(org_id, created_at desc);
alter table knowledge_sources enable row level security;
drop policy if exists "org members can manage knowledge sources" on knowledge_sources;
create policy "org members can manage knowledge sources" on knowledge_sources for all using (is_org_member(org_id) or is_platform_admin()) with check (is_org_member(org_id) or is_platform_admin());

alter table knowledge_chunks add column if not exists source_id uuid references knowledge_sources(id) on delete cascade;
create index if not exists idx_knowledge_chunks_source on knowledge_chunks(source_id);

-- Fast pgvector retrieval. Keeps similarity work inside Postgres instead of loading every embedding into Node.
create or replace function match_knowledge_chunks(
  p_org_id uuid,
  p_agent_id uuid,
  p_query_embedding vector(1024),
  p_match_count integer default 5,
  p_min_similarity real default 0.20
)
returns table(id uuid, content text, source_id uuid, similarity real)
language sql stable security invoker
set search_path = agentmi, public, extensions
as $$
  select kc.id, kc.content, kc.source_id,
         (1 - (kc.embedding <=> p_query_embedding))::real as similarity
  from knowledge_chunks kc
  where kc.org_id = p_org_id
    and kc.agent_id = p_agent_id
    and kc.embedding is not null
    and (1 - (kc.embedding <=> p_query_embedding)) >= p_min_similarity
  order by kc.embedding <=> p_query_embedding
  limit greatest(1, least(p_match_count, 20));
$$;
