import {createClient} from "@/lib/supabase/server";
import {getOrgContext} from "@/lib/data/org-context";
import {WorkflowBuilder} from "@/components/dashboard/WorkflowBuilder";
import type {Node,Edge} from "@/components/dashboard/WorkflowBuilder";

const NODE_TYPES=new Set(["start","agent","router","end"]);
function isValidPosition(p:unknown):p is {x:number;y:number}{
  return !!p&&typeof p==="object"&&typeof (p as Record<string,unknown>).x==="number"&&typeof (p as Record<string,unknown>).y==="number";
}
function toWorkflowNode(row:{id:string;node_key:string;node_type:string;label:string;agent_id:string|null;position:unknown}):Node|null{
  if(!NODE_TYPES.has(row.node_type))return null;
  const position=isValidPosition(row.position)?row.position:{x:0,y:0};
  return {id:row.id,node_key:row.node_key,node_type:row.node_type as Node["node_type"],label:row.label,agent_id:row.agent_id,position};
}
function toWorkflowEdge(row:{source_node_id:string;target_node_id:string;condition:unknown}):Edge{
  const condition=(row.condition&&typeof row.condition==="object"&&!Array.isArray(row.condition))?row.condition as Record<string,unknown>:{};
  return {source_node_id:row.source_node_id,target_node_id:row.target_node_id,condition};
}

export default async function WorkflowDetail({params}:{params:{id:string}}){
  const ctx=await getOrgContext();const db=createClient();
  const {data:wf}=await db.from("workflows").select("id,name").eq("id",params.id).eq("org_id",ctx.orgId).single();
  if(!wf)return <div className="text-sm text-ink-500">Workflow not found.</div>;
  const [{data:agents},{data:nodeRows},{data:edgeRows}]=await Promise.all([
    db.from("agents").select("id,name").eq("org_id",ctx.orgId).eq("kind","ai").eq("status","ready"),
    db.from("workflow_nodes").select("id,node_key,node_type,label,agent_id,position").eq("workflow_id",wf.id).order("created_at"),
    db.from("workflow_edges").select("source_node_id,target_node_id,condition").eq("workflow_id",wf.id)
  ]);
  const nodes=(nodeRows??[]).map(toWorkflowNode).filter((n):n is Node=>n!==null);
  const edges=(edgeRows??[]).map(toWorkflowEdge);
  return <div className="max-w-6xl"><div className="mb-5"><p className="text-xs uppercase text-neon-cyan">Workflow Builder</p><h1 className="text-2xl font-bold">{wf.name}</h1><p className="text-sm text-ink-500">Build a visual agent pipeline. Saved graphs execute through the workflow API.</p></div><WorkflowBuilder workflowId={wf.id} agents={agents??[]} initialNodes={nodes} initialEdges={edges}/></div>;
}
