export type WorkflowNodeType = "start" | "agent" | "router" | "end";

export interface GraphNode {
  /** Stable identity used by both the client and the save action. */
  node_key: string;
  node_type: WorkflowNodeType;
  label: string;
  agent_id: string | null;
  position: { x: number; y: number };
}

export interface GraphEdge {
  /** Endpoints are always node_keys, never database ids. See `toClientEdges`. */
  source: string;
  target: string;
  condition: Record<string, unknown>;
}

export interface GraphIssue {
  level: "error" | "warning";
  message: string;
  nodeKey?: string;
}

/**
 * Converts stored edges (which reference database node ids) into edges keyed by
 * `node_key`.
 *
 * This exists because of a real round-trip bug: saving replaces every node row,
 * so the ids the client loaded are gone by the time the new edges are inserted.
 * The client previously echoed those dead ids straight back, which meant that
 * editing and re-saving any workflow that already had edges failed on a foreign
 * key. Keeping the client entirely in node_key space makes the save idempotent.
 *
 * An edge whose endpoint no longer resolves is dropped rather than kept with a
 * dangling reference.
 */
export function toClientEdges(
  edgeRows: Array<{ source_node_id: string; target_node_id: string; condition: unknown }>,
  nodeRows: Array<{ id: string; node_key: string }>
): GraphEdge[] {
  const keyById = new Map(nodeRows.map((n) => [n.id, n.node_key]));
  const edges: GraphEdge[] = [];

  for (const row of edgeRows) {
    const source = keyById.get(row.source_node_id);
    const target = keyById.get(row.target_node_id);
    if (!source || !target) continue;
    edges.push({
      source,
      target,
      condition:
        row.condition && typeof row.condition === "object" && !Array.isArray(row.condition)
          ? (row.condition as Record<string, unknown>)
          : {},
    });
  }

  return edges;
}

/**
 * Checks a graph is executable before it is saved.
 *
 * Errors block the save; warnings are shown but do not. The runtime walks from
 * a start node along edges, so a graph with no start, or with agent nodes that
 * nothing reaches, would save cleanly and then do nothing at run time — which
 * is far more confusing than being told up front.
 */
export function validateGraph(nodes: GraphNode[], edges: GraphEdge[]): GraphIssue[] {
  const issues: GraphIssue[] = [];

  if (nodes.length === 0) {
    return [{ level: "error", message: "Add at least one node before saving." }];
  }

  const starts = nodes.filter((n) => n.node_type === "start");
  if (starts.length === 0) {
    issues.push({ level: "error", message: "The workflow needs a Start node — execution begins there." });
  } else if (starts.length > 1) {
    issues.push({ level: "error", message: "Only one Start node is allowed." });
  }

  if (!nodes.some((n) => n.node_type === "end")) {
    issues.push({ level: "warning", message: "No End node: the run will stop at the last reachable step." });
  }

  for (const node of nodes) {
    if (node.node_type === "agent" && !node.agent_id) {
      issues.push({
        level: "error",
        message: `"${node.label}" is an Agent step with no agent selected.`,
        nodeKey: node.node_key,
      });
    }
    if (!node.label.trim()) {
      issues.push({ level: "error", message: "Every node needs a label.", nodeKey: node.node_key });
    }
  }

  // Anything the runtime cannot walk to will never execute.
  if (starts.length === 1) {
    const reachable = reachableFrom(starts[0].node_key, edges);
    for (const node of nodes) {
      if (node.node_key !== starts[0].node_key && !reachable.has(node.node_key)) {
        issues.push({
          level: "warning",
          message: `"${node.label}" is not connected to the Start node and will never run.`,
          nodeKey: node.node_key,
        });
      }
    }
  }

  if (hasCycle(nodes, edges)) {
    issues.push({ level: "error", message: "The workflow contains a loop, which would never finish." });
  }

  return issues;
}

/** Every node key reachable from `startKey` by following edges forward. */
export function reachableFrom(startKey: string, edges: GraphEdge[]): Set<string> {
  const outgoing = new Map<string, string[]>();
  for (const edge of edges) {
    outgoing.set(edge.source, [...(outgoing.get(edge.source) ?? []), edge.target]);
  }

  const seen = new Set<string>();
  const queue = [startKey];
  while (queue.length) {
    const current = queue.shift() as string;
    for (const next of outgoing.get(current) ?? []) {
      if (seen.has(next)) continue;
      seen.add(next);
      queue.push(next);
    }
  }
  return seen;
}

/** Depth-first cycle detection over the directed graph. */
export function hasCycle(nodes: GraphNode[], edges: GraphEdge[]): boolean {
  const outgoing = new Map<string, string[]>();
  for (const edge of edges) {
    outgoing.set(edge.source, [...(outgoing.get(edge.source) ?? []), edge.target]);
  }

  const visiting = new Set<string>();
  const done = new Set<string>();

  function walk(key: string): boolean {
    if (visiting.has(key)) return true;
    if (done.has(key)) return false;
    visiting.add(key);
    for (const next of outgoing.get(key) ?? []) {
      if (walk(next)) return true;
    }
    visiting.delete(key);
    done.add(key);
    return false;
  }

  return nodes.some((node) => walk(node.node_key));
}

/** True when the graph has no blocking problems. Warnings are allowed through. */
export function canSaveGraph(issues: GraphIssue[]): boolean {
  return !issues.some((issue) => issue.level === "error");
}

/** Removes a node and any edge that touched it, so no dangling endpoints remain. */
export function removeNode(
  nodeKey: string,
  nodes: GraphNode[],
  edges: GraphEdge[]
): { nodes: GraphNode[]; edges: GraphEdge[] } {
  return {
    nodes: nodes.filter((n) => n.node_key !== nodeKey),
    edges: edges.filter((e) => e.source !== nodeKey && e.target !== nodeKey),
  };
}

/** Adds an edge, refusing duplicates and self-links. */
export function connectNodes(source: string, target: string, edges: GraphEdge[]): GraphEdge[] {
  if (source === target) return edges;
  if (edges.some((e) => e.source === source && e.target === target)) return edges;
  return [...edges, { source, target, condition: {} }];
}
