import {createClient} from '@/lib/supabase/server'; import {getOrgContext} from '@/lib/data/org-context'; import {PlatformPage} from '@/components/dashboard/PlatformPage';
import {CreateEvaluationForm, RunEvaluationButton} from '@/components/dashboard/EvaluationForms';

type ScoredCase = { input: string; expectedContains: string; actualReply: string; passed: boolean };
type EvaluationRow = {
  id: string; name: string; agent_id: string; status: string; score: number | null; test_count: number | null; created_at: string;
  cases: ScoredCase[] | { input: string; expectedContains: string }[] | unknown;
  agents: { name: string } | { name: string }[] | null;
};

function isScoredCase(c: unknown): c is ScoredCase {
  return !!c && typeof c === "object" && "passed" in c && "actualReply" in c;
}

export default async function EvaluationsPage(){
  const c=await getOrgContext();const s=createClient();
  const [{data:e},{data:agents}]=await Promise.all([
    s.from('agent_evaluations').select('id,name,agent_id,status,score,test_count,created_at,cases,agents(name)').eq('org_id',c.orgId).order('created_at',{ascending:false}),
    s.from('agents').select('id,name').eq('org_id',c.orgId).eq('kind','ai').eq('status','ready').order('name'),
  ]);
  const evaluations: EvaluationRow[] = e ?? [];
  return <PlatformPage eyebrow="Quality" title="Evaluations" description="Regression-test agents against curated cases and compare quality before shipping new versions.">
    <CreateEvaluationForm agents={agents??[]} />
    <div className="grid md:grid-cols-2 gap-4 mt-6">{evaluations.map((x)=>{
      const agentEmbed=x.agents;const agentName=(Array.isArray(agentEmbed)?agentEmbed[0]?.name:agentEmbed?.name)??'Agent';
      const cases = Array.isArray(x.cases) ? x.cases : [];
      const scoredCases = cases.filter(isScoredCase);
      return <div key={x.id} className="neon-card p-5">
        <div className="flex justify-between items-start"><b>{x.name}</b><span className="text-xs text-neon-cyan">{x.status}</span></div>
        <p className="text-xs text-ink-600 mt-2">{agentName} · {x.test_count??0} tests</p>
        <div className="flex items-center justify-between mt-4">
          <p className="text-2xl font-bold">{x.score==null?'—':`${Number(x.score).toFixed(1)}%`}</p>
          <RunEvaluationButton evaluationId={x.id} />
        </div>
        {scoredCases.length>0 && <details className="mt-4 text-xs"><summary className="text-ink-500 cursor-pointer">Case results</summary>
          <div className="mt-2 space-y-2">{scoredCases.map((sc,i)=><div key={i} className={`rounded-lg border p-2 ${sc.passed?'border-neon-green/30':'border-neon-pink/30'}`}>
            <p className="text-ink-400">{sc.input}</p>
            <p className={sc.passed?'text-neon-green':'text-neon-pink'}>{sc.passed?'✓ passed':'✗ failed'} — expected &quot;{sc.expectedContains}&quot;</p>
          </div>)}</div>
        </details>}
      </div>;
    })}{evaluations.length===0&&<div className="neon-card p-8 text-sm text-ink-600 md:col-span-2">No evaluations yet — create one above to regression-test an agent.</div>}</div>
  </PlatformPage>;
}
