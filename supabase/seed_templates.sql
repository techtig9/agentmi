-- === Added for shared-project deployment: isolates Agentmi under its own schema ===
create schema if not exists agentmi;
set search_path to agentmi, public, extensions;
-- === End of added preamble — original file content follows unchanged ===

-- First AI Agent templates (Phase 2). ML templates come in Phase 3
-- alongside the training pipeline that would actually back them.

insert into templates (kind, category, name, description, config) values
(
  'ai', 'customer_support', 'Customer Support Bot',
  'Answers questions from your docs/FAQ and escalates what it can''t handle.',
  '{"system_prompt_template": "You are a helpful support agent for {{company_name}}. Answer using only the provided knowledge base. If unsure, say so and offer to connect the user with a human.", "tools": ["knowledge_base_search"], "escalation_enabled": true}'
),
(
  'ai', 'sales_qualifier', 'Sales / Lead Qualifier',
  'Chats with website visitors, asks qualifying questions, and captures lead info.',
  '{"system_prompt_template": "You are a friendly sales assistant for {{company_name}}. Qualify leads by asking about their needs, budget, and timeline, then capture their contact info.", "tools": ["capture_lead"], "escalation_enabled": false}'
),
(
  'ai', 'internal_knowledge', 'Internal Knowledge Q&A',
  'An internal assistant employees can ask questions, grounded in your company docs.',
  '{"system_prompt_template": "You are an internal assistant for {{company_name}} employees. Answer using only the provided internal knowledge base.", "tools": ["knowledge_base_search"], "escalation_enabled": false}'
);
