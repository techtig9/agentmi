-- Agentmi Phase 9: additive ecosystem / marketplace layer.
create table if not exists marketplace_items (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  resource_type text not null check (resource_type in ('agent','tool','workflow')),
  resource_id uuid not null,
  title text not null check (char_length(title) between 2 and 120),
  description text,
  category text not null default 'general',
  visibility text not null default 'private' check (visibility in ('private','public')),
  status text not null default 'draft' check (status in ('draft','published','unpublished')),
  version integer not null default 1 check (version > 0),
  installs integer not null default 0 check (installs >= 0),
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (org_id, resource_type, resource_id)
);
create index if not exists marketplace_items_public_idx on marketplace_items(status, visibility, category, updated_at desc);
create index if not exists marketplace_items_org_idx on marketplace_items(org_id, updated_at desc);

create table if not exists marketplace_installs (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references marketplace_items(id) on delete cascade,
  org_id uuid not null references organizations(id) on delete cascade,
  installed_by uuid references auth.users(id),
  installed_at timestamptz not null default now(),
  unique(item_id, org_id)
);
create index if not exists marketplace_installs_org_idx on marketplace_installs(org_id, installed_at desc);

alter table marketplace_items enable row level security;
alter table marketplace_installs enable row level security;

drop policy if exists marketplace_items_read on marketplace_items;
create policy marketplace_items_read on marketplace_items for select using (
  visibility = 'public' and status = 'published' or org_id = public.current_org_id()
);
drop policy if exists marketplace_items_write on marketplace_items;
create policy marketplace_items_write on marketplace_items for all using (org_id = public.current_org_id()) with check (org_id = public.current_org_id());
drop policy if exists marketplace_installs_read on marketplace_installs;
create policy marketplace_installs_read on marketplace_installs for select using (org_id = public.current_org_id());
drop policy if exists marketplace_installs_write on marketplace_installs;
create policy marketplace_installs_write on marketplace_installs for insert with check (org_id = public.current_org_id() and installed_by = auth.uid());
create or replace function public.increment_marketplace_installs(p_item_id uuid) returns void language sql security definer set search_path = public as $$
  update marketplace_items set installs = installs + 1, updated_at = now() where id = p_item_id;
$$;
