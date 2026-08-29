set search_path to agentmi, public, extensions;
create table if not exists workflow_nodes (
  id uuid primary key default gen_random_uuid(),
  workflow_id uuid not null references workflows(id) on delete cascade,
  node_key text not null,
  node_type text not null check (node_type in ('start','agent','router','end')),
  label text not null,
  agent_id uuid references agents(id) on delete set null,
  config jsonb not null default '{}'::jsonb,
  position jsonb not null default '{"x":0,"y":0}'::jsonb,
  created_at timestamptz not null default now(),
  unique(workflow_id,node_key)
);
create table if not exists workflow_edges (
  id uuid primary key default gen_random_uuid(),
  workflow_id uuid not null references workflows(id) on delete cascade,
  source_node_id uuid not null references workflow_nodes(id) on delete cascade,
  target_node_id uuid not null references workflow_nodes(id) on delete cascade,
  condition jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique(workflow_id,source_node_id,target_node_id)
);
alter table workflow_nodes enable row level security;
alter table workflow_edges enable row level security;
create policy "org members can manage workflow nodes" on workflow_nodes for all using (
  is_platform_admin() or exists (select 1 from workflows w where w.id=workflow_nodes.workflow_id and is_org_member(w.org_id))
) with check (
  is_platform_admin() or exists (select 1 from workflows w where w.id=workflow_nodes.workflow_id and is_org_member(w.org_id))
);
create policy "org members can manage workflow edges" on workflow_edges for all using (
  is_platform_admin() or exists (select 1 from workflows w where w.id=workflow_edges.workflow_id and is_org_member(w.org_id))
) with check (
  is_platform_admin() or exists (select 1 from workflows w where w.id=workflow_edges.workflow_id and is_org_member(w.org_id))
);
create index if not exists idx_workflow_nodes_workflow on workflow_nodes(workflow_id);
create index if not exists idx_workflow_edges_workflow on workflow_edges(workflow_id);
