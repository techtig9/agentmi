-- Phase 4: persistent Agentmi memory. Additive only.
create schema if not exists agentmi;
set search_path to agentmi, public, extensions;

create table if not exists agent_memory_sessions (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  agent_id uuid not null references agents(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  title text,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists agent_memory_messages (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references agent_memory_sessions(id) on delete cascade,
  org_id uuid not null references organizations(id) on delete cascade,
  agent_id uuid not null references agents(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  role text not null check (role in ('user','assistant')),
  content text not null,
  created_at timestamptz not null default now()
);

create table if not exists agent_memories (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  agent_id uuid not null references agents(id) on delete cascade,
  user_id uuid references profiles(id) on delete cascade,
  kind text not null default 'fact' check (kind in ('fact','preference','profile','instruction','summary')),
  content text not null,
  source text not null default 'user',
  importance integer not null default 3 check (importance between 1 and 5),
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_memory_sessions_user on agent_memory_sessions(org_id, agent_id, user_id, updated_at desc);
create index if not exists idx_memory_messages_session on agent_memory_messages(session_id, created_at desc);
create index if not exists idx_agent_memories_user on agent_memories(org_id, agent_id, user_id, updated_at desc);
create index if not exists idx_agent_memories_global on agent_memories(org_id, agent_id, updated_at desc) where user_id is null;

alter table agent_memory_sessions enable row level security;
alter table agent_memory_messages enable row level security;
alter table agent_memories enable row level security;

drop policy if exists "members manage memory sessions" on agent_memory_sessions;
create policy "members manage memory sessions" on agent_memory_sessions for all using (is_org_member(org_id) or is_platform_admin()) with check (is_org_member(org_id) or is_platform_admin());
drop policy if exists "members manage memory messages" on agent_memory_messages;
create policy "members manage memory messages" on agent_memory_messages for all using (is_org_member(org_id) or is_platform_admin()) with check (is_org_member(org_id) or is_platform_admin());
drop policy if exists "members manage agent memories" on agent_memories;
create policy "members manage agent memories" on agent_memories for all using (is_org_member(org_id) or is_platform_admin()) with check (is_org_member(org_id) or is_platform_admin());
