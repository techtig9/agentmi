-- Phase 8 governance hardening. Additive only.
set search_path to agentmi, public, extensions;
create index if not exists idx_audit_logs_action on audit_logs(org_id, action, created_at desc);
create index if not exists idx_agent_secrets_active on agent_secrets(org_id, revoked_at);
create index if not exists idx_integrations_status on integrations(org_id, status, created_at desc);
-- Prevent duplicate active secret names and integration names within a workspace.
create unique index if not exists uq_active_secret_name on agent_secrets(org_id, lower(name)) where revoked_at is null;
create unique index if not exists uq_integration_name on integrations(org_id, lower(name));
