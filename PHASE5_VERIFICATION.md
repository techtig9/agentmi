# Agentmi Phase 5 — Visual Workflow + Multi-Agent Orchestration

## Scope
Only Phase 5 was changed: visual workflow graph persistence and graph-aware multi-agent execution. Earlier runtime, tools, knowledge and memory work is preserved.

## Implemented
- `workflow_nodes` and `workflow_edges` tables with organization-scoped RLS.
- Visual workflow builder page at `/dashboard/workflows/[id]`.
- Agent/router/end nodes and directed edges.
- Save/replace workflow graph server action with workspace ownership validation.
- Graph-aware workflow API execution using topological ordering.
- Sequential specialist-agent orchestration where each agent receives the previous agent's output.
- Cycle detection and invalid graph rejection.
- Backward-compatible legacy keyword router for workflows without a visual graph.
- Existing workflow/member data remains intact.

## Verification
- Phase 5 targeted contracts: PASS
- Phase 5 delimiter/sanity checks: PASS
- Existing phase-contract verification for Phase 5: PASS
- Full Next.js/TypeScript build: NOT RUN because `node_modules` is absent in the sandbox and prior dependency installation timed out.
- Live Supabase/Anthropic execution: NOT RUN because production credentials are not available in the sandbox.

## Important deployment step
Apply `supabase/phase5_graph.sql` to the Agentmi Supabase database before using the visual builder or graph execution.
