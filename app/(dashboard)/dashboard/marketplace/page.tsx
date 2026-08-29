import { createClient } from '@/lib/supabase/server';
import { getOrgContext } from '@/lib/data/org-context';
import { PlatformPage } from '@/components/dashboard/PlatformPage';
import { installMarketplaceItem, publishMarketplaceItem, unpublishMarketplaceItem } from '@/lib/actions/ecosystem';

export default async function MarketplacePage(){
  const ctx=await getOrgContext(); const db=createClient();
  const {data:items}=await db.from('marketplace_items').select('id,org_id,resource_type,resource_id,title,description,category,status,visibility,installs,version,created_at').or(`and(status.eq.published,visibility.eq.public),org_id.eq.${ctx.orgId}`).order('updated_at',{ascending:false}).limit(100);
  const {data:agents}=await db.from('agents').select('id,name').eq('org_id',ctx.orgId).order('name');
  return <PlatformPage eyebrow="Ecosystem" title="Marketplace" description="Discover published Agentmi resources or publish reusable agents from your workspace. Private resources remain isolated.">
    <div className="grid lg:grid-cols-[1fr_360px] gap-5">
      <div className="space-y-4">{(items??[]).map(item=><div key={item.id} className="neon-card p-5"><div className="flex items-start justify-between gap-4"><div><div className="flex gap-2 items-center"><b>{item.title}</b><span className="text-[10px] uppercase text-neon-cyan">{item.resource_type}</span><span className="text-[10px] uppercase text-ink-600">v{item.version}</span></div><p className="text-sm text-ink-400 mt-2">{item.description||'Reusable Agentmi resource.'}</p><p className="text-xs text-ink-600 mt-2">{item.category} · {item.installs} installs · {item.status}</p></div>{item.org_id===ctx.orgId && item.status==='published' ? <form action={unpublishMarketplaceItem}><input type="hidden" name="id" value={item.id}/><button className="text-xs underline">Unpublish</button></form> : <form action={installMarketplaceItem}><input type="hidden" name="id" value={item.id}/><button className="neon-button text-xs">Install</button></form>}</div></div>)}{!(items??[]).length&&<div className="neon-card p-6 text-sm text-ink-400">No marketplace resources yet. Publish your first agent.</div>}</div>
      <form action={publishMarketplaceItem} className="neon-card p-5 space-y-3"><b>Publish an Agent</b><input type="hidden" name="resource_type" value="agent"/><select name="resource_id" required className="neon-input w-full">{(agents??[]).map(a=><option key={a.id} value={a.id}>{a.name}</option>)}</select><input name="title" required placeholder="Marketplace title" className="neon-input w-full"/><input name="category" required placeholder="Category" className="neon-input w-full"/><textarea name="description" placeholder="What does it do?" className="neon-input w-full min-h-24"/><button className="neon-button w-full">Publish publicly</button><p className="text-[11px] text-ink-600">Secrets, private knowledge, API keys and memory are never copied into a marketplace listing.</p></form>
    </div>
  </PlatformPage>
}
