"use server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getOrgContext } from "@/lib/data/org-context";
import { z } from "zod";

const nodeSchema = z.object({
  id: z.string().uuid().optional(), node_key: z.string().min(1).max(80),
  node_type: z.enum(["start","agent","router","end"]), label: z.string().min(1).max(120),
  agent_id: z.string().uuid().nullable().optional(), config: z.record(z.unknown()).default({}),
  position: z.object({x:z.number().finite(),y:z.number().finite()}).default({x:0,y:0})
});
const edgeSchema = z.object({ source_node_id:z.string(), target_node_id:z.string(), condition:z.record(z.unknown()).default({}) });
const graphSchema = z.object({ workflowId:z.string().uuid(), nodes:z.array(nodeSchema).max(100), edges:z.array(edgeSchema).max(200) });
export type SaveGraphState={error:string|null;ok?:boolean};
export async function saveWorkflowGraph(_prev:SaveGraphState, formData:FormData):Promise<SaveGraphState>{
  let raw:unknown; try{raw=JSON.parse(String(formData.get("graph")??""));}catch{return {error:"Invalid workflow graph."};}
  const parsed=graphSchema.safeParse(raw); if(!parsed.success)return {error:parsed.error.issues[0]?.message??"Invalid graph."};
  const ctx=await getOrgContext(); const db=createClient();
  const {data:wf}=await db.from("workflows").select("id").eq("id",parsed.data.workflowId).eq("org_id",ctx.orgId).single();
  if(!wf)return {error:"Workflow not found."};
  const agentIds=parsed.data.nodes.map(n=>n.agent_id).filter((x):x is string=>!!x);
  if(agentIds.length){const {data:agents}=await db.from("agents").select("id,kind").eq("org_id",ctx.orgId).in("id",agentIds); if((agents??[]).length!==new Set(agentIds).size || (agents??[]).some(a=>a.kind!=="ai"))return {error:"Every agent node must reference an AI agent in this workspace."};}
  const {error:delE}=await db.from("workflow_edges").delete().eq("workflow_id",wf.id); if(delE)return {error:"Couldn't replace workflow edges."};
  const {error:delN}=await db.from("workflow_nodes").delete().eq("workflow_id",wf.id); if(delN)return {error:"Couldn't replace workflow nodes."};
  const {data:nodes,error:nErr}=await db.from("workflow_nodes").insert(parsed.data.nodes.map(n=>({workflow_id:wf.id,node_key:n.node_key,node_type:n.node_type,label:n.label,agent_id:n.agent_id??null,config:n.config,position:n.position}))).select("id,node_key");
  if(nErr||!nodes)return {error:"Couldn't save workflow nodes."};
  const idByKey=new Map(nodes.map(n=>[n.node_key,n.id]));
  // The client stores source/target by node key; accept UUIDs too for future clients.
  const edgeRows=parsed.data.edges.map(e=>({workflow_id:wf.id,source_node_id:idByKey.get(e.source_node_id)??e.source_node_id,target_node_id:idByKey.get(e.target_node_id)??e.target_node_id,condition:e.condition}));
  if(edgeRows.length){const {error:eErr}=await db.from("workflow_edges").insert(edgeRows); if(eErr)return {error:"Couldn't save workflow edges."};}
  revalidatePath("/dashboard/workflows"); revalidatePath("/dashboard/multi-agent");
  return {error:null,ok:true};
}
