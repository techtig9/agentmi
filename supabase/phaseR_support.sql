-- Phase R: support tickets + notifications. Additive only.
set search_path to agentmi, public, extensions;

create table if not exists support_tickets (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  created_by uuid references profiles(id),
  subject text not null,
  message text not null,
  status text not null default 'open' check (status in ('open','resolved')),
  admin_reply text,
  replied_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_support_tickets_org on support_tickets(org_id, created_at desc);
create index if not exists idx_support_tickets_status on support_tickets(status, created_at desc);
alter table support_tickets enable row level security;
drop policy if exists "org members manage own tickets" on support_tickets;
create policy "org members manage own tickets" on support_tickets for all
  using (is_org_member(org_id) or is_platform_admin())
  with check (is_org_member(org_id) or is_platform_admin());

create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  title text not null,
  body text not null,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists idx_notifications_org on notifications(org_id, created_at desc);
alter table notifications enable row level security;
drop policy if exists "org members read own notifications" on notifications;
create policy "org members read own notifications" on notifications for all
  using (is_org_member(org_id) or is_platform_admin())
  with check (is_org_member(org_id) or is_platform_admin());
