-- === Added for shared-project deployment: isolates Agentmi under its own schema ===
create schema if not exists agentmi;
set search_path to agentmi, public, extensions;
-- === End of added preamble — original file content follows unchanged ===

-- Agentmi core schema (Phase 1)
-- Run against a fresh Supabase project. auth.users is managed by Supabase Auth.

create extension if not exists "pgcrypto";

-- ---------- Profiles ----------
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  avatar_url text,
  is_admin boolean not null default false, -- Techtig staff only; full free access
  created_at timestamptz not null default now()
);

-- ---------- Organizations / Workspaces ----------
create table organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  owner_id uuid not null references profiles(id),
  created_at timestamptz not null default now()
);

create type org_role as enum ('owner', 'admin', 'member');

create table memberships (
  org_id uuid not null references organizations(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  role org_role not null default 'member',
  created_at timestamptz not null default now(),
  primary key (org_id, user_id)
);

-- ---------- Billing ----------
create type plan_id as enum ('free', 'starter', 'pro', 'business');
create type billing_cycle as enum ('monthly', 'yearly');
create type subscription_status as enum ('active', 'past_due', 'canceled', 'trialing');

create table subscriptions (
  org_id uuid primary key references organizations(id) on delete cascade,
  plan plan_id not null default 'free',
  cycle billing_cycle not null default 'monthly',
  status subscription_status not null default 'active',
  is_launch_pricing boolean not null default false,
  paddle_subscription_id text,
  current_period_end timestamptz,
  updated_at timestamptz not null default now()
);

-- ---------- Credits ----------
-- Ledger is the source of truth; balance is a maintained rollup for fast reads.
create type credit_entry_type as enum ('grant', 'consume', 'topup', 'refund');

create table credit_ledger (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  amount integer not null, -- positive for grant/topup/refund, negative for consume
  entry_type credit_entry_type not null,
  reason text not null, -- e.g. 'create_ai_agent', 'monthly_grant', 'admin_override'
  related_agent_id uuid,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now()
);

create table credit_balances (
  org_id uuid primary key references organizations(id) on delete cascade,
  balance integer not null default 0,
  updated_at timestamptz not null default now()
);

-- ---------- Templates ----------
create type agent_kind as enum ('ai', 'ml');

create table templates (
  id uuid primary key default gen_random_uuid(),
  kind agent_kind not null,
  category text not null, -- e.g. 'customer_support', 'churn_prediction'
  name text not null,
  description text,
  config jsonb not null default '{}',
  created_at timestamptz not null default now()
);

-- ---------- Agents (AI + ML share one table; type-specific data in config/metrics) ----------
create type agent_status as enum ('draft', 'training', 'ready', 'failed', 'archived');

create table agents (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  kind agent_kind not null,
  name text not null,
  status agent_status not null default 'draft',
  template_id uuid references templates(id),
  theme text not null default 'cyber_neon',
  config jsonb not null default '{}', -- AI: prompt/tools/knowledge refs. ML: features/target/algorithm.
  created_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------- Datasets (ML agents) ----------
create table datasets (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  agent_id uuid references agents(id) on delete cascade,
  file_url text not null,
  row_count integer,
  column_profile jsonb, -- auto-profiling output: types, nulls, class balance
  target_column text,
  created_at timestamptz not null default now()
);

-- ---------- Model versions (ML agents) ----------
create table ml_models (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null references agents(id) on delete cascade,
  version integer not null,
  algorithm text not null,
  metrics jsonb, -- accuracy/precision/recall/F1 or RMSE/MAE, feature importance
  artifact_url text,
  status agent_status not null default 'training',
  created_at timestamptz not null default now(),
  unique (agent_id, version)
);

-- ---------- Audit log ----------
create table audit_logs (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references organizations(id) on delete cascade,
  actor_id uuid references profiles(id),
  action text not null,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create index idx_memberships_user on memberships(user_id);
create index idx_agents_org on agents(org_id);
create index idx_credit_ledger_org on credit_ledger(org_id, created_at desc);
create index idx_audit_logs_org on audit_logs(org_id, created_at desc);
