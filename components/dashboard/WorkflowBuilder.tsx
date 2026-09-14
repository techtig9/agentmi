"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { useFormState } from "react-dom";
import {
  AlertTriangle,
  Bot,
  Flag,
  GitBranch,
  Link2,
  Play,
  Plus,
  Trash2,
  X,
  ZoomIn,
  ZoomOut,
  type LucideIcon,
} from "lucide-react";
import { saveWorkflowGraph, type SaveGraphState } from "@/lib/actions/workflow-graph";
import {
  canSaveGraph,
  connectNodes,
  removeNode,
  validateGraph,
  type GraphEdge,
  type GraphNode,
  type WorkflowNodeType,
} from "@/lib/workflows/graph";
import { Button, IconButton } from "@/components/ui/Button";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { FormAlert } from "@/components/ui/FormAlert";
import { TextField, SelectField } from "@/components/ui/Field";

const initial: SaveGraphState = { error: null };

const NODE_META: Record<WorkflowNodeType, { icon: LucideIcon; tone: string; label: string }> = {
  start: { icon: Play, tone: "text-neon-green", label: "Start" },
  agent: { icon: Bot, tone: "text-neon-cyan", label: "Agent" },
  router: { icon: GitBranch, tone: "text-neon-violet", label: "Router" },
  end: { icon: Flag, tone: "text-ink-400", label: "End" },
};

const NODE_WIDTH = 176;
const NODE_HEIGHT = 76;
const ZOOM_STEP = 0.15;
const MIN_ZOOM = 0.5;
const MAX_ZOOM = 1.5;

export function WorkflowBuilder({
  workflowId,
  agents,
  initialNodes,
  initialEdges,
}: {
  workflowId: string;
  agents: { id: string; name: string }[];
  initialNodes: GraphNode[];
  initialEdges: GraphEdge[];
}) {
  const [nodes, setNodes] = useState<GraphNode[]>(initialNodes);
  const [edges, setEdges] = useState<GraphEdge[]>(initialEdges);
  const [selected, setSelected] = useState<string | null>(null);
  const [connectFrom, setConnectFrom] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [state, action] = useFormState(saveWorkflowGraph, initial);
  const canvasRef = useRef<HTMLDivElement>(null);
  const dragState = useRef<{ key: string; offsetX: number; offsetY: number } | null>(null);

  const selectedNode = nodes.find((n) => n.node_key === selected) ?? null;
  const issues = useMemo(() => validateGraph(nodes, edges), [nodes, edges]);
  const saveable = canSaveGraph(issues);

  // The save action works entirely in node_key space; the server maps keys to
  // freshly inserted row ids. See lib/workflows/graph.ts for why.
  const graph = useMemo(
    () => ({
      workflowId,
      nodes: nodes.map((n) => ({ ...n, config: {} })),
      edges: edges.map((e) => ({
        source_node_id: e.source,
        target_node_id: e.target,
        condition: e.condition,
      })),
    }),
    [workflowId, nodes, edges]
  );

  function addNode(type: WorkflowNodeType) {
    const key = crypto.randomUUID();
    const column = nodes.length % 3;
    const row = Math.floor(nodes.length / 3);
    const node: GraphNode = {
      node_key: key,
      node_type: type,
      label: NODE_META[type].label === "Agent" ? "Agent step" : NODE_META[type].label,
      agent_id: type === "agent" ? agents[0]?.id ?? null : null,
      position: { x: 40 + column * (NODE_WIDTH + 60), y: 40 + row * (NODE_HEIGHT + 60) },
    };
    setNodes((current) => [...current, node]);
    setSelected(key);
  }

  function updateSelected(patch: Partial<GraphNode>) {
    if (!selected) return;
    setNodes((current) =>
      current.map((n) => (n.node_key === selected ? { ...n, ...patch } : n))
    );
  }

  function deleteNode(key: string) {
    const next = removeNode(key, nodes, edges);
    setNodes(next.nodes);
    setEdges(next.edges);
    if (selected === key) setSelected(null);
    if (connectFrom === key) setConnectFrom(null);
  }

  /** Click a node while connecting to draw an edge into it. */
  function onNodeClick(key: string) {
    if (connectFrom && connectFrom !== key) {
      setEdges((current) => connectNodes(connectFrom, key, current));
      setConnectFrom(null);
      return;
    }
    setSelected(key);
  }

  const onPointerMove = useCallback((event: React.PointerEvent) => {
    const drag = dragState.current;
    const canvas = canvasRef.current;
    if (!drag || !canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scale = zoom;
    const x = (event.clientX - rect.left + canvas.scrollLeft) / scale - drag.offsetX;
    const y = (event.clientY - rect.top + canvas.scrollTop) / scale - drag.offsetY;
    setNodes((current) =>
      current.map((n) =>
        n.node_key === drag.key
          ? { ...n, position: { x: Math.max(0, Math.round(x)), y: Math.max(0, Math.round(y)) } }
          : n
      )
    );
  }, [zoom]);

  function onPointerUp() {
    dragState.current = null;
  }

  /** Arrow keys nudge the selected node, so layout is not mouse-only. */
  function onNodeKeyDown(event: React.KeyboardEvent, node: GraphNode) {
    const step = event.shiftKey ? 20 : 5;
    const moves: Record<string, [number, number]> = {
      ArrowUp: [0, -step],
      ArrowDown: [0, step],
      ArrowLeft: [-step, 0],
      ArrowRight: [step, 0],
    };
    const move = moves[event.key];
    if (move) {
      event.preventDefault();
      setNodes((current) =>
        current.map((n) =>
          n.node_key === node.node_key
            ? {
                ...n,
                position: {
                  x: Math.max(0, n.position.x + move[0]),
                  y: Math.max(0, n.position.y + move[1]),
                },
              }
            : n
        )
      );
      return;
    }
    if (event.key === "Delete" || event.key === "Backspace") {
      event.preventDefault();
      deleteNode(node.node_key);
    }
  }

  const errors = issues.filter((i) => i.level === "error");
  const warnings = issues.filter((i) => i.level === "warning");

  return (
    <div className="space-y-4">
      <form action={action}>
        <input type="hidden" name="graph" value={JSON.stringify(graph)} />
        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" variant="secondary" icon={Play} onClick={() => addNode("start")}>
            Start
          </Button>
          <Button size="sm" variant="secondary" icon={Bot} onClick={() => addNode("agent")}>
            Agent
          </Button>
          <Button size="sm" variant="secondary" icon={GitBranch} onClick={() => addNode("router")}>
            Router
          </Button>
          <Button size="sm" variant="secondary" icon={Flag} onClick={() => addNode("end")}>
            End
          </Button>

          <span className="mx-1 hidden h-6 w-px bg-base-700 sm:block" aria-hidden="true" />

          <div className="flex items-center gap-1">
            <IconButton
              icon={ZoomOut}
              label="Zoom out"
              size="sm"
              onClick={() => setZoom((z) => Math.max(MIN_ZOOM, +(z - ZOOM_STEP).toFixed(2)))}
              disabled={zoom <= MIN_ZOOM}
            />
            <span className="w-12 text-center font-mono text-xs text-ink-600">
              {Math.round(zoom * 100)}%
            </span>
            <IconButton
              icon={ZoomIn}
              label="Zoom in"
              size="sm"
              onClick={() => setZoom((z) => Math.min(MAX_ZOOM, +(z + ZOOM_STEP).toFixed(2)))}
              disabled={zoom >= MAX_ZOOM}
            />
          </div>

          <div className="ml-auto flex items-center gap-2">
            {state.ok && <span className="text-xs text-neon-green">Saved</span>}
            <SubmitButton size="sm" disabled={!saveable} pendingLabel="Saving…">
              Save workflow
            </SubmitButton>
          </div>
        </div>
        {state.error && (
          <div className="mt-3">
            <FormAlert message={state.error} />
          </div>
        )}
      </form>

      {(errors.length > 0 || warnings.length > 0) && (
        <ul className="space-y-1.5">
          {[...errors, ...warnings].map((issue, i) => (
            <li
              key={i}
              className={`flex items-start gap-2 rounded-lg border px-3 py-2 text-xs ${
                issue.level === "error"
                  ? "border-neon-pink/30 bg-neon-pink/5 text-neon-pink"
                  : "border-neon-amber/30 bg-neon-amber/5 text-neon-amber"
              }`}
            >
              <AlertTriangle size={13} className="mt-0.5 shrink-0" aria-hidden="true" />
              {issue.message}
            </li>
          ))}
        </ul>
      )}

      {connectFrom && (
        <p
          role="status"
          className="flex items-center justify-between gap-3 rounded-lg border border-neon-cyan/30 bg-neon-cyan/5 px-3 py-2 text-xs text-neon-cyan"
        >
          <span className="inline-flex items-center gap-2">
            <Link2 size={13} aria-hidden="true" />
            Pick the node this should connect to.
          </span>
          <button type="button" onClick={() => setConnectFrom(null)} className="hover:underline">
            Cancel
          </button>
        </p>
      )}

      <div className="grid gap-4 lg:grid-cols-[1fr_300px]">
        <div
          ref={canvasRef}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerLeave={onPointerUp}
          className="relative min-h-[520px] overflow-auto rounded-xl border border-base-700 bg-base-950"
          style={{
            backgroundImage:
              "radial-gradient(circle, #1B1B24 1px, transparent 1px)",
            backgroundSize: `${24 * zoom}px ${24 * zoom}px`,
          }}
        >
          <div
            className="relative"
            style={{
              transform: `scale(${zoom})`,
              transformOrigin: "top left",
              width: canvasExtent(nodes).width,
              height: canvasExtent(nodes).height,
            }}
          >
            <svg
              className="pointer-events-none absolute inset-0 h-full w-full"
              aria-hidden="true"
            >
              <defs>
                <marker
                  id="wf-arrow"
                  viewBox="0 0 10 10"
                  refX="9"
                  refY="5"
                  markerWidth="6"
                  markerHeight="6"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 0 L 10 5 L 0 10 z" className="fill-neon-cyan/50" />
                </marker>
              </defs>
              {edges.map((edge, i) => {
                const from = nodes.find((n) => n.node_key === edge.source);
                const to = nodes.find((n) => n.node_key === edge.target);
                if (!from || !to) return null;
                return (
                  <line
                    key={i}
                    x1={from.position.x + NODE_WIDTH / 2}
                    y1={from.position.y + NODE_HEIGHT}
                    x2={to.position.x + NODE_WIDTH / 2}
                    y2={to.position.y}
                    strokeWidth="2"
                    markerEnd="url(#wf-arrow)"
                    className="stroke-neon-cyan/40"
                  />
                );
              })}
            </svg>

            {nodes.length === 0 && (
              <p className="absolute left-1/2 top-24 -translate-x-1/2 text-sm text-ink-600">
                Add a Start node to begin building this workflow.
              </p>
            )}

            {nodes.map((node) => {
              const meta = NODE_META[node.node_type];
              const Icon = meta.icon;
              const isSelected = selected === node.node_key;
              const isConnectSource = connectFrom === node.node_key;

              return (
                <div
                  key={node.node_key}
                  role="button"
                  tabIndex={0}
                  aria-pressed={isSelected}
                  aria-label={`${meta.label} node: ${node.label}`}
                  onClick={() => onNodeClick(node.node_key)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      onNodeClick(node.node_key);
                    } else {
                      onNodeKeyDown(e, node);
                    }
                  }}
                  onPointerDown={(e) => {
                    const canvas = canvasRef.current;
                    if (!canvas) return;
                    const rect = canvas.getBoundingClientRect();
                    dragState.current = {
                      key: node.node_key,
                      offsetX: (e.clientX - rect.left + canvas.scrollLeft) / zoom - node.position.x,
                      offsetY: (e.clientY - rect.top + canvas.scrollTop) / zoom - node.position.y,
                    };
                  }}
                  style={{ left: node.position.x, top: node.position.y, width: NODE_WIDTH }}
                  className={`absolute cursor-grab touch-none rounded-xl border bg-base-900 p-3 text-left transition-colors active:cursor-grabbing ${
                    isConnectSource
                      ? "border-neon-cyan shadow-neon-cyan"
                      : isSelected
                        ? "border-neon-cyan/70"
                        : "border-base-700 hover:border-base-700"
                  }`}
                >
                  <span className="flex items-center gap-1.5">
                    <Icon size={12} className={meta.tone} aria-hidden="true" />
                    <span className="font-mono text-[10px] uppercase tracking-wider text-ink-600">
                      {meta.label}
                    </span>
                  </span>
                  <p className="mt-1 truncate text-sm font-bold">{node.label}</p>
                  {node.node_type === "agent" && (
                    <p className="mt-0.5 truncate text-xs text-ink-600">
                      {agents.find((a) => a.id === node.agent_id)?.name ?? "No agent selected"}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <aside className="neon-card p-4">
          {selectedNode ? (
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-2">
                <p className="font-bold">Node settings</p>
                <IconButton
                  icon={X}
                  label="Deselect node"
                  size="sm"
                  onClick={() => setSelected(null)}
                />
              </div>

              <TextField
                label="Label"
                value={selectedNode.label}
                onChange={(e) => updateSelected({ label: e.target.value })}
                maxLength={120}
              />

              {selectedNode.node_type === "agent" && (
                <SelectField
                  label="Agent"
                  value={selectedNode.agent_id ?? ""}
                  onChange={(e) => updateSelected({ agent_id: e.target.value || null })}
                  hint={
                    agents.length === 0
                      ? "No ready AI agents in this workspace yet."
                      : "Only ready AI agents can run inside a workflow."
                  }
                >
                  <option value="">Select an agent…</option>
                  {agents.map((agent) => (
                    <option key={agent.id} value={agent.id}>
                      {agent.name}
                    </option>
                  ))}
                </SelectField>
              )}

              <div className="space-y-2 border-t border-base-700 pt-4">
                <Button
                  size="sm"
                  variant="secondary"
                  icon={Link2}
                  className="w-full"
                  onClick={() => setConnectFrom(selectedNode.node_key)}
                >
                  Connect to…
                </Button>
                <Button
                  size="sm"
                  variant="danger"
                  icon={Trash2}
                  className="w-full"
                  onClick={() => deleteNode(selectedNode.node_key)}
                >
                  Delete node
                </Button>
              </div>

              <p className="text-xs text-ink-600">
                Drag to move, or use the arrow keys when the node is focused. Shift makes larger
                steps.
              </p>
            </div>
          ) : (
            <div>
              <p className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-wider text-ink-600">
                <Plus size={11} aria-hidden="true" />
                Build the graph
              </p>
              <p className="mt-3 text-sm text-ink-400">
                Add a Start node, then Agent and Router steps, and connect them into a path.
              </p>
              <dl className="mt-4 space-y-2 border-t border-base-700 pt-4 text-xs">
                <div className="flex justify-between">
                  <dt className="text-ink-400">Nodes</dt>
                  <dd className="font-mono tabular-nums">{nodes.length}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-ink-400">Connections</dt>
                  <dd className="font-mono tabular-nums">{edges.length}</dd>
                </div>
              </dl>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

/** Canvas big enough to hold every node plus room to drag into. */
function canvasExtent(nodes: GraphNode[]): { width: number; height: number } {
  const maxX = nodes.reduce((max, n) => Math.max(max, n.position.x), 0);
  const maxY = nodes.reduce((max, n) => Math.max(max, n.position.y), 0);
  return { width: maxX + NODE_WIDTH + 120, height: Math.max(500, maxY + NODE_HEIGHT + 120) };
}
