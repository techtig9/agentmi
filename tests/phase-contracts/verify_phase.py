from pathlib import Path
import sys
ROOT=Path(__file__).resolve().parents[2]
phase=int(sys.argv[1])
checks={
1:[('app/(dashboard)/dashboard/page.tsx','Agentmi workspace'),('components/dashboard/Sidebar.tsx','BUILD')],
2:[('app/(dashboard)/dashboard/agents/[id]/builder/page.tsx','Agent Builder'),('app/(dashboard)/dashboard/agents/[id]/test/page.tsx','Playground')],
3:[('app/(dashboard)/dashboard/knowledge/page.tsx','Knowledge'),('app/(dashboard)/dashboard/agents/[id]/knowledge/page.tsx','Knowledge')],
4:[('app/(dashboard)/dashboard/tools/page.tsx','Tools'),('app/(dashboard)/dashboard/agents/[id]/tools/page.tsx','Tools')],
5:[('app/(dashboard)/dashboard/multi-agent/page.tsx','Multi-Agent'),('app/(dashboard)/dashboard/workflows/page.tsx','Workflows')],
6:[('app/(dashboard)/dashboard/runs/page.tsx','Runs'),('app/(dashboard)/dashboard/evaluations/page.tsx','Evaluations'),('app/(dashboard)/dashboard/observability/page.tsx','Observability')],
7:[('app/(dashboard)/dashboard/deployments/page.tsx','Deployments'),('app/(dashboard)/dashboard/api/page.tsx','API & SDK'),('app/(dashboard)/dashboard/webhooks/page.tsx','Webhooks')],
8:[('app/(dashboard)/dashboard/analytics/page.tsx','Analytics'),('app/(dashboard)/dashboard/usage/page.tsx','Usage & Costs'),('app/(dashboard)/dashboard/security/page.tsx','Security'),('app/(dashboard)/dashboard/audit-logs/page.tsx','Audit Logs'),('app/(dashboard)/dashboard/secrets/page.tsx','Secrets')],
9:[('app/(dashboard)/dashboard/integrations/page.tsx','Integrations'),('app/(dashboard)/dashboard/templates/page.tsx','Templates'),('app/(dashboard)/dashboard/marketplace/page.tsx','Marketplace'),('app/(dashboard)/dashboard/docs/page.tsx','Documentation')],
10:[('supabase/phase7_10_schema.sql','agent_runs'),('supabase/phase7_10_schema.sql','agent_evaluations'),('supabase/phase7_10_schema.sql','agent_deployments'),('supabase/phase7_10_schema.sql','agent_tools'),('supabase/phase7_10_schema.sql','agent_secrets'),('supabase/phase7_10_schema.sql','integrations')]
}
errors=[]
for rel, needle in checks[phase]:
 p=ROOT/rel
 if not p.exists(): errors.append('missing '+rel); continue
 if needle not in p.read_text(): errors.append(f'{rel}: missing {needle}')
# cumulative safety checks
if phase>=2:
 for rel in ['lib/actions/agents.ts','lib/actions/workflows.ts','app/(dashboard)/dashboard/agents/[id]/page.tsx']:
  if not (ROOT/rel).exists(): errors.append('core regression: '+rel)
if phase>=5 and 'workflows' not in (ROOT/'supabase/phase5_schema.sql').read_text(): errors.append('workflow schema regression')
if phase>=10 and 'create table if not exists' not in (ROOT/'supabase/phase7_10_schema.sql').read_text(): errors.append('additive migration guard missing')
if errors:
 print(f'PHASE {phase}: FAIL'); print('\n'.join(errors)); raise SystemExit(1)
print(f'PHASE {phase}: PASS')
