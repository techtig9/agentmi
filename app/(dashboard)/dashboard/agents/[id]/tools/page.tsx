import {notFound} from 'next/navigation';
import {createClient} from '@/lib/supabase/server';
import {getOrgContext} from '@/lib/data/org-context';
import {PlatformPage} from '@/components/dashboard/PlatformPage';
import {setAgentTools} from '@/lib/actions/platform-tools';

export default async function AgentToolsPage({params}:{params:{id:string}}){
  const c=await getOrgContext(); const s=createClient();
  const {data:a}=await s.from('agents').select('id,name,config').eq('id',params.id).eq('org_id',c.orgId).single(); if(!a)notFound();
  const config=(a.config&&typeof a.config==='object'&&!Array.isArray(a.config)?a.config:{}) as Record<string,unknown>;
  const selected=new Set(Array.isArray(config.tools)?config.tools.filter((x):x is string=>typeof x==='string'):[]);
  const {data:tools}=await s.from('agent_tools').select('id,name,description,kind,is_active').eq('org_id',c.orgId).order('name');
  return <PlatformPage eyebrow="Tools" title={a.name} description="Authorize safe actions this agent can invoke. Only selected active tools are exposed to the model." action={{href:`/dashboard/agents/${a.id}/builder`,label:'Back to Builder'}}>
    <form action={setAgentTools} className="neon-card p-5">
      <input type="hidden" name="agent_id" value={a.id}/>
      <div className="flex items-center justify-between mb-4"><div><p className="font-bold">Authorized tools</p><p className="text-xs text-ink-600 mt-1">Changes take effect on the next agent run.</p></div><button className="btn-primary" type="submit">Save tools</button></div>
      <input id="tool_ids" type="hidden" name="tool_ids" value={[...selected].join(',')}/>
      <div className="grid md:grid-cols-2 gap-3">{(tools??[]).map(t=><label key={t.id} className="rounded-lg border border-base-700 p-4 flex gap-3 cursor-pointer"><input type="checkbox" defaultChecked={selected.has(t.id)} value={t.id} className="tool-choice mt-1"/><span><b>{t.name}</b><p className="text-xs text-ink-600 mt-1">{t.kind} · {t.description||'Tool'}</p></span></label>)}{(!tools||tools.length===0)&&<p className="text-sm text-ink-600">No tools configured yet.</p>}</div>
      <script dangerouslySetInnerHTML={{__html:`document.querySelectorAll('.tool-choice').forEach(function(c){c.addEventListener('change',function(){document.getElementById('tool_ids').value=Array.from(document.querySelectorAll('.tool-choice:checked')).map(function(x){return x.value}).join(',')})})`}} />
    </form>
  </PlatformPage>;
}
