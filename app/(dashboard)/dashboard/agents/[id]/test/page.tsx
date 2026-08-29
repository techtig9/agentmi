import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getOrgContext } from "@/lib/data/org-context";
import { PlatformPage } from "@/components/dashboard/PlatformPage";
import { AgentPlayground } from "@/components/dashboard/AgentPlayground";

export default async function AgentTestPage({ params }: { params: { id: string } }) {
  const ctx = await getOrgContext(); const supabase = createClient();
  const { data: agent } = await supabase.from('agents').select('id,name,kind,status').eq('id',params.id).eq('org_id',ctx.orgId).single();
  if (!agent) notFound();
  return <PlatformPage eyebrow="Playground" title={`Test ${agent.name}`} description="Run a real controlled execution against the existing Agentmi runtime. Each run is recorded with latency, trace and errors." action={{href:`/dashboard/agents/${agent.id}/builder`,label:'Back to Builder'}}>
    <AgentPlayground agentId={agent.id} />
  </PlatformPage>;
}
