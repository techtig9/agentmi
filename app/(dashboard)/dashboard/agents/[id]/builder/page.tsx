import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getOrgContext } from "@/lib/data/org-context";
import { PlatformPage } from "@/components/dashboard/PlatformPage";

export default async function AgentBuilderPage({ params }: { params: { id: string } }) {
  const ctx = await getOrgContext();
  const supabase = createClient();
  const { data: agent } = await supabase.from("agents").select("id,name,kind,status,config,theme").eq("id", params.id).eq("org_id", ctx.orgId).single();
  if (!agent) notFound();
  const config = (agent.config ?? {}) as Record<string, unknown>;
  return <PlatformPage eyebrow="Agent Builder" title={agent.name} description="Configure identity, instructions, model behavior, memory, knowledge, tools and structured output without replacing the existing agent configuration." action={{href:`/dashboard/agents/${agent.id}/test`,label:"Open Playground"}}>
    <div className="grid lg:grid-cols-[1fr_320px] gap-6">
      <div className="neon-card p-5 min-h-[520px]">
        <div className="flex items-center justify-between mb-5"><div><p className="font-bold">Visual agent canvas</p><p className="text-xs text-ink-600">Drag-and-drop orchestration surface</p></div><span className="text-xs font-mono text-neon-green">{agent.status}</span></div>
        <div className="grid md:grid-cols-3 gap-4 items-center py-16">
          {['Input','Agent Reasoning','Output'].map((node,i)=><div key={node} className="neon-card p-5 text-center"><p className="text-[10px] uppercase font-mono text-neon-cyan">Node {i+1}</p><p className="font-bold mt-2">{node}</p><p className="text-xs text-ink-600 mt-1">{i===1?'Model + instructions':'Agentmi runtime'}</p></div>)}
        </div>
        <div className="grid md:grid-cols-3 gap-3"><Link href={`/dashboard/agents/${agent.id}/knowledge`} className="btn-secondary">+ Knowledge</Link><Link href={`/dashboard/agents/${agent.id}/tools`} className="btn-secondary">+ Tools</Link><Link href={`/dashboard/agents/${agent.id}/memory`} className="btn-secondary">+ Memory</Link></div>
      </div>
      <aside className="space-y-4">
        <div className="neon-card p-5"><p className="text-xs font-mono uppercase text-ink-600">Identity</p><p className="font-bold mt-2">{agent.name}</p><p className="text-xs text-ink-600 mt-1">{agent.kind} · {agent.theme}</p></div>
        <div className="neon-card p-5"><p className="text-xs font-mono uppercase text-ink-600">Configuration</p><dl className="mt-3 space-y-2 text-sm"><div className="flex justify-between"><dt className="text-ink-400">Instructions</dt><dd>{config.prompt ? 'Configured' : 'Not set'}</dd></div><div className="flex justify-between"><dt className="text-ink-400">Model</dt><dd>{String(config.model ?? 'Default')}</dd></div><div className="flex justify-between"><dt className="text-ink-400">Tools</dt><dd>{Array.isArray(config.tools) ? config.tools.length : 0}</dd></div><div className="flex justify-between"><dt className="text-ink-400">Memory</dt><dd>Persistent</dd></div></dl></div>
      </aside>
    </div>
  </PlatformPage>;
}
