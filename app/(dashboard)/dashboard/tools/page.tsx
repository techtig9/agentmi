import {createClient} from '@/lib/supabase/server'; import {getOrgContext} from '@/lib/data/org-context'; import {PlatformPage,FeatureCard} from '@/components/dashboard/PlatformPage'; import {CreateToolForm} from '@/components/dashboard/CreateToolForm';

type ToolRow = { id: string; name: string; description: string | null; kind: string; is_active: boolean; config: { secret_id?: string | null } | null };

export default async function ToolsPage(){
  const c=await getOrgContext();const s=createClient();
  const [{data:tools},{data:secrets}]=await Promise.all([
    s.from('agent_tools').select('id,name,description,kind,is_active,config').eq('org_id',c.orgId).order('created_at',{ascending:false}),
    s.from('agent_secrets').select('id,name,provider').eq('org_id',c.orgId).is('revoked_at',null).order('name'),
  ]);
  const toolRows: ToolRow[] = tools ?? [];
  return <PlatformPage eyebrow="Build" title="Tools" description="Give agents safe capabilities: web requests, APIs, databases, code, email and custom functions." action={{href:'/dashboard/agents',label:'Attach to Agent'}}>
    <div className="grid md:grid-cols-3 gap-4"><FeatureCard title="Built-in tools" description="HTTP, search, calculator, file and data utilities." meta="CORE"/><FeatureCard title="Custom APIs" description="Define endpoints, authentication, parameters and response schemas." meta="HTTP"/><FeatureCard title="Permissions" description="Control which agents can invoke each tool and require approval for sensitive actions." meta="SAFE"/></div>
    <div className="grid lg:grid-cols-[360px_1fr] gap-6 mt-6"><CreateToolForm secrets={secrets??[]} /><div className="neon-card p-5"><p className="font-bold mb-4">Workspace tools</p>{toolRows.length?<div className="grid md:grid-cols-2 gap-3">{toolRows.map(t=><div key={t.id} className="rounded-lg border border-base-700 p-4"><div className="flex justify-between"><b>{t.name}</b><span className="text-xs text-neon-green">{t.is_active?'Active':'Paused'}</span></div><p className="text-xs text-ink-600 mt-1">{t.kind} · {t.description||'No description'}</p>{t.config?.secret_id&&<p className="text-xs text-neon-cyan mt-1">🔒 Authenticated</p>}</div>)}</div>:<p className="text-sm text-ink-600">No custom tools yet. Add tools from an agent builder after applying the platform schema migration.</p>}</div></div>
  </PlatformPage>;
}
