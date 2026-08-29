import {createClient} from '@/lib/supabase/server'; import {getOrgContext} from '@/lib/data/org-context'; import Link from 'next/link'; import {PlatformPage} from '@/components/dashboard/PlatformPage';

type RunRow = {
  id: string; agent_id: string; status: string; duration_ms: number | null; cost_usd: number | null; created_at: string;
  agents: { name: string } | { name: string }[] | null;
};

export default async function RunsPage(){
  const c=await getOrgContext();const s=createClient();
  const {data:runs}=await s.from('agent_runs').select('id,agent_id,status,duration_ms,cost_usd,created_at,agents(name)').eq('org_id',c.orgId).order('created_at',{ascending:false}).limit(50);
  const rows: RunRow[] = runs ?? [];
  return <PlatformPage eyebrow="Quality" title="Runs" description="Every production and test execution gets a traceable run record with status, latency and cost." ><div className="neon-card overflow-hidden"><div className="p-5 border-b border-base-700 font-bold">Recent executions</div><div className="divide-y divide-base-700">{rows.map((r)=>{const agentEmbed=r.agents;const agentName=(Array.isArray(agentEmbed)?agentEmbed[0]?.name:agentEmbed?.name)??'Agent';return <Link href={`/dashboard/runs/${r.id}`} key={r.id} className="p-4 grid grid-cols-[1fr_auto_auto_auto] gap-4 text-sm"><div><p>{agentName}</p><p className="text-xs text-ink-600">{new Date(r.created_at).toLocaleString()}</p></div><span className={r.status==='succeeded'?'text-neon-green':'text-neon-pink'}>{r.status}</span><span>{r.duration_ms??0}ms</span><span>${Number(r.cost_usd??0).toFixed(4)}</span></Link>;})}{rows.length===0&&<div className="p-8 text-center text-sm text-ink-600">No run records yet. Deploy an agent and execute it to populate tracing.</div>}</div></div></PlatformPage>;
}
