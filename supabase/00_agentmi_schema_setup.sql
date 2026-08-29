-- Run this FIRST, before schema.sql — one-time setup for sharing this
-- Supabase project with other products. Creates a dedicated "agentmi"
-- schema and grants the API roles access to it (a brand-new schema has
-- no access for anon/authenticated/service_role by default, unlike the
-- built-in "public" schema).

create schema if not exists agentmi;

grant usage on schema agentmi to anon, authenticated, service_role;

alter default privileges in schema agentmi
  grant all on tables to anon, authenticated, service_role;
alter default privileges in schema agentmi
  grant all on sequences to anon, authenticated, service_role;
alter default privileges in schema agentmi
  grant all on routines to anon, authenticated, service_role;

set search_path to agentmi, public, extensions;
