import { createClient } from '@/lib/supabase/server';
import { getOrgContext } from '@/lib/data/org-context';
import { PlatformPage } from '@/components/dashboard/PlatformPage';
import { DeploymentForm } from './DeploymentForm';

type DeploymentRow = {
  id: string; agent_id: string; name: string; environment: string; status: string;
  endpoint_url: string | null; version: number | null; created_at: string;
  agents: { name: string } | { name: string }[] | null;
};

export default async function DeploymentsPage(){
  const c=await getOrgContext(); const s=createClient();
  const [{data:d},{data:agents}]=await Promise.all([
    s.from('agent_deployments').select('id,agent_id,name,environment,status,endpoint_url,version,created_at,agents(name)').eq('org_id',c.orgId).order('created_at',{ascending:false}),
    s.from('agents').select('id,name,status').eq('org_id',c.orgId).eq('kind','ai').order('name')
  ]);
  const deployments: DeploymentRow[] = d ?? [];
  return <PlatformPage eyebrow="Deploy" title="Deployments" description="Promote tested agents to staging or production and invoke a versioned runtime endpoint." action={{href:'/dashboard/api-keys',label:'Manage API Keys'}}>
    <DeploymentForm agents={agents??[]} />
    <div className="neon-card overflow-hidden mt-6"><div className="divide-y divide-base-700">{deployments.map((x)=>{const agentEmbed=x.agents;const agentName=(Array.isArray(agentEmbed)?agentEmbed[0]?.name:agentEmbed?.name)??'Agent';return <div key={x.id} className="p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-3"><div><p className="font-bold">{x.name}</p><p className="text-xs text-ink-600 mt-1">{agentName} · {x.environment} · v{x.version??1}</p></div><div className="flex flex-wrap items-center gap-4"><span className="text-xs text-neon-green">{x.status}</span>{x.endpoint_url&&<code className="text-xs text-ink-600">POST {x.endpoint_url}</code>}</div></div>;})}{deployments.length===0&&<div className="p-8 text-center text-sm text-ink-600">No deployments yet. Create one above after an AI agent is ready.</div>}</div></div>
  </PlatformPage>
}
