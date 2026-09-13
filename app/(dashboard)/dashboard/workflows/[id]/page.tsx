import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getOrgContext } from "@/lib/data/org-context";
import { WorkflowBuilder } from "@/components/dashboard/WorkflowBuilder";
import { toClientEdges, type GraphNode, type WorkflowNodeType } from "@/lib/workflows/graph";

const NODE_TYPES = new Set<WorkflowNodeType>(["start", "agent", "router", "end"]);

function isValidPosition(p: unknown): p is { x: number; y: number } {
  return (
    !!p &&
    typeof p === "object" &&
    typeof (p as Record<string, unknown>).x === "number" &&
    typeof (p as Record<string, unknown>).y === "number"
  );
}

function toGraphNode(row: {
  node_key: string;
  node_type: string;
  label: string;
  agent_id: string | null;
  position: unknown;
}): GraphNode | null {
  if (!NODE_TYPES.has(row.node_type as WorkflowNodeType)) return null;
  return {
    node_key: row.node_key,
    node_type: row.node_type as WorkflowNodeType,
    label: row.label,
    agent_id: row.agent_id,
    position: isValidPosition(row.position) ? row.position : { x: 0, y: 0 },
  };
}

export default async function WorkflowDetail({ params }: { params: { id: string } }) {
  const ctx = await getOrgContext();
  const db = createClient();

  const { data: wf } = await db
    .from("workflows")
    .select("id, name")
    .eq("id", params.id)
    .eq("org_id", ctx.orgId)
    .single();
  if (!wf) notFound();

  const [{ data: agents }, { data: nodeRows }, { data: edgeRows }] = await Promise.all([
    db.from("agents").select("id,name").eq("org_id", ctx.orgId).eq("kind", "ai").eq("status", "ready"),
    db
      .from("workflow_nodes")
      .select("id,node_key,node_type,label,agent_id,position")
      .eq("workflow_id", wf.id)
      .order("created_at"),
    db
      .from("workflow_edges")
      .select("source_node_id,target_node_id,condition")
      .eq("workflow_id", wf.id),
  ]);

  const rows = nodeRows ?? [];
  const nodes = rows.map(toGraphNode).filter((n): n is GraphNode => n !== null);
  // Stored edges reference row ids, which are replaced on every save. Convert
  // them to node_key endpoints so the builder round-trips correctly.
  const edges = toClientEdges(edgeRows ?? [], rows);

  return (
    <div className="mx-auto max-w-6xl">
      <Link
        href="/dashboard/workflows"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-ink-400 transition-colors hover:text-ink-100"
      >
        <ArrowLeft size={14} aria-hidden="true" />
        All workflows
      </Link>
      <div className="mb-5">
        <p className="font-mono text-xs uppercase tracking-[0.18em] text-neon-cyan">
          Workflow Builder
        </p>
        <h1 className="text-2xl font-bold">{wf.name}</h1>
        <p className="mt-2 text-sm text-ink-400">
          Build a visual agent pipeline. Saved graphs execute through the workflow API.
        </p>
      </div>
      <WorkflowBuilder
        workflowId={wf.id}
        agents={agents ?? []}
        initialNodes={nodes}
        initialEdges={edges}
      />
    </div>
  );
}
