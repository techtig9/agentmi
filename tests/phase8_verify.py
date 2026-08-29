from pathlib import Path
root=Path(__file__).resolve().parents[1]
def text(p): return (root/p).read_text()

g=text('lib/actions/governance.ts')
for name in ['createSecret','revokeSecret','createIntegration','disconnectIntegration','secret_created','secret_revoked','integration_connected','integration_disconnected']:
    assert name in g, name
assert '.eq("org_id", ctx.orgId)' in g
for p in ['app/(dashboard)/dashboard/secrets/page.tsx','app/(dashboard)/dashboard/secrets/SecretForms.tsx']:
    assert 'secret_value' not in text(p)
a=text('app/(dashboard)/dashboard/analytics/page.tsx')
for x in ['agent_runs','duration_ms','cost_usd','success','failed']:
    assert x in a
print('PHASE 8 TARGETED TESTS: PASS')
