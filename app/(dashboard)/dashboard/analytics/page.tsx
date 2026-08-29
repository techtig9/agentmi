import {createClient} from '@/lib/supabase/server'; import {getOrgContext} from '@/lib/data/org-context'; import {PlatformPage,FeatureCard} from '@/components/dashboard/PlatformPage';

type AgentRunRow = { id: string; status: string; duration_ms: number | null; cost_usd: number | null; created_at: string };

export default async function AnalyticsPage(){
  const c=await getOrgContext();
  const s=createClient();
  // Single query for run rows + accurate total count. Previously this ran a
  // second, separate agent_runs query that only selected cost_usd — the rows
  // used for success/failure/latency math never had `status` or `duration_ms`,
  // so "Success rate" and average latency always rendered as 0 regardless of
  // real data. `count` reflects the true total even beyond the 5000-row cap
  // used for the detailed per-row math below.
  const [{count:agents},{count:runsCount,data:runRows},{count:deployments}]=await Promise.all([
    s.from('agents').select('id',{count:'exact',head:true}).eq('org_id',c.orgId),
    s.from('agent_runs').select('id,status,duration_ms,cost_usd,created_at',{count:'exact'}).eq('org_id',c.orgId).order('created_at',{ascending:false}).limit(5000),
    s.from('agent_deployments').select('id',{count:'exact',head:true}).eq('org_id',c.orgId),
  ]);
  const rows: AgentRunRow[] = runRows ?? [];
  const total = runsCount ?? rows.length;
  const success = rows.filter((r) => r.status === 'completed' || r.status === 'success').length;
  const failed = rows.filter((r) => r.status === 'failed' || r.status === 'error').length;
  const sampled = rows.length;
  const avg = sampled ? rows.reduce((n, r) => n + Number(r.duration_ms ?? 0), 0) / sampled : 0;
  const cost = rows.reduce((n, r) => n + Number(r.cost_usd ?? 0), 0);

  return <PlatformPage eyebrow="Manage" title="Analytics" description="Workspace performance, reliability and cost metrics calculated from recorded executions."><div className="grid md:grid-cols-4 gap-4"><FeatureCard title="Agents" description="Existing agent definitions." meta={String(agents??0)}/><FeatureCard title="Runs" description="Recorded executions." meta={String(total)}/><FeatureCard title="Success rate" description={`${success} successful / ${failed} failed (of ${sampled} sampled).`} meta={`${sampled?((success/sampled)*100).toFixed(1):'0.0'}%`}/><FeatureCard title="Tracked cost" description={`Average latency ${Math.round(avg)} ms.`} meta={`$${cost.toFixed(2)}`}/></div><div className="grid md:grid-cols-2 gap-4 mt-6"><FeatureCard title="Deployments" description="Active staging and production targets." meta={String(deployments??0)}/><FeatureCard title="Reliability" description="Failed executions are counted from the same run ledger used by observability." meta={`${failed} failures`}/></div></PlatformPage>;
}
