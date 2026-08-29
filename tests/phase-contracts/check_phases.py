from pathlib import Path
import re, sys
ROOT=Path(__file__).resolve().parents[2]
errors=[]
def need(rel, text=None):
 p=ROOT/rel
 if not p.exists(): errors.append(f'missing {rel}'); return
 if text and text not in p.read_text(): errors.append(f'{rel} missing {text!r}')
def routes(names):
 for n in names: need(n)
# Phase 1
need('app/(dashboard)/dashboard/page.tsx','Agentmi workspace')
need('components/dashboard/Sidebar.tsx','Build')
# Phase 2
need('app/(dashboard)/dashboard/agents/[id]/builder/page.tsx','Agent Builder')
need('app/(dashboard)/dashboard/agents/[id]/test/page.tsx','Playground')
# Phase 3
need('app/(dashboard)/dashboard/knowledge/page.tsx','Knowledge')
need('app/(dashboard)/dashboard/agents/[id]/knowledge/page.tsx','Knowledge')
# Phase 4
need('app/(dashboard)/dashboard/tools/page.tsx','Tools')
need('app/(dashboard)/dashboard/agents/[id]/tools/page.tsx','Tools')
# Phase 5
need('app/(dashboard)/dashboard/multi-agent/page.tsx','Multi-Agent')
need('app/(dashboard)/dashboard/workflows/page.tsx','Workflows')
# Phase 6
for x in ['runs','evaluations','observability']:
 need(f'app/(dashboard)/dashboard/{x}/page.tsx')
# Phase 7
for x in ['deployments','api','webhooks']:
 need(f'app/(dashboard)/dashboard/{x}/page.tsx')
# Phase 8
for x in ['analytics','usage','security','audit-logs','secrets']:
 need(f'app/(dashboard)/dashboard/{x}/page.tsx')
# Phase 9
for x in ['integrations','templates','marketplace','docs']:
 need(f'app/(dashboard)/dashboard/{x}/page.tsx')
# Phase 10 platform schema
need('supabase/phase7_10_schema.sql','agent_runs')
need('supabase/phase7_10_schema.sql','agent_evaluations')
need('supabase/phase7_10_schema.sql','agent_deployments')
need('supabase/phase7_10_schema.sql','agent_tools')
need('supabase/phase7_10_schema.sql','agent_secrets')
need('supabase/phase7_10_schema.sql','integrations')
if errors:
 print('FAIL')
 print('\n'.join(errors)); sys.exit(1)
print('PASS: Agentmi phases 1-10 structural contract')
