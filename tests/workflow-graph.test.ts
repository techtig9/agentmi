import test from "node:test";
import assert from "node:assert/strict";
import {
  toClientEdges,
  validateGraph,
  reachableFrom,
  hasCycle,
  canSaveGraph,
  removeNode,
  connectNodes,
  type GraphEdge,
  type GraphNode,
} from "../lib/workflows/graph";

function node(key: string, type: GraphNode["node_type"], agentId: string | null = null): GraphNode {
  return { node_key: key, node_type: type, label: key, agent_id: agentId, position: { x: 0, y: 0 } };
}

function edge(source: string, target: string): GraphEdge {
  return { source, target, condition: {} };
}

test("stored edges are rewritten from row ids to node keys", () => {
  // This is the round-trip that used to break: saving deletes every node row
  // and re-inserts it, so the ids the client loaded are dead by the time the
  // new edges are written. Echoing them back produced a foreign-key failure.
  const nodeRows = [
    { id: "db-1", node_key: "key-a" },
    { id: "db-2", node_key: "key-b" },
  ];
  const edgeRows = [{ source_node_id: "db-1", target_node_id: "db-2", condition: {} }];

  assert.deepEqual(toClientEdges(edgeRows, nodeRows), [
    { source: "key-a", target: "key-b", condition: {} },
  ]);
});

test("an edge pointing at a node that no longer exists is dropped, not kept dangling", () => {
  const nodeRows = [{ id: "db-1", node_key: "key-a" }];
  const edgeRows = [{ source_node_id: "db-1", target_node_id: "db-missing", condition: {} }];
  assert.deepEqual(toClientEdges(edgeRows, nodeRows), []);
});

test("a non-object stored condition is normalised to an empty object", () => {
  const nodeRows = [
    { id: "1", node_key: "a" },
    { id: "2", node_key: "b" },
  ];
  for (const condition of [null, "oops", 42, ["a"]]) {
    const [result] = toClientEdges(
      [{ source_node_id: "1", target_node_id: "2", condition }],
      nodeRows
    );
    assert.deepEqual(result.condition, {});
  }
});

test("an empty graph cannot be saved", () => {
  const issues = validateGraph([], []);
  assert.equal(canSaveGraph(issues), false);
});

test("a graph without a start node is rejected", () => {
  const nodes = [node("a", "agent", "agent-1"), node("b", "end")];
  const issues = validateGraph(nodes, [edge("a", "b")]);
  assert.ok(issues.some((i) => i.level === "error" && /Start node/.test(i.message)));
  assert.equal(canSaveGraph(issues), false);
});

test("two start nodes are rejected", () => {
  const nodes = [node("s1", "start"), node("s2", "start")];
  const issues = validateGraph(nodes, []);
  assert.ok(issues.some((i) => i.level === "error" && /Only one Start/.test(i.message)));
});

test("an agent step with no agent selected is a blocking error", () => {
  const nodes = [node("s", "start"), node("a", "agent", null), node("e", "end")];
  const issues = validateGraph(nodes, [edge("s", "a"), edge("a", "e")]);
  const found = issues.find((i) => i.nodeKey === "a" && i.level === "error");
  assert.ok(found, "an unassigned agent node must block the save");
  assert.equal(canSaveGraph(issues), false);
});

test("a valid linear graph saves cleanly", () => {
  const nodes = [node("s", "start"), node("a", "agent", "agent-1"), node("e", "end")];
  const issues = validateGraph(nodes, [edge("s", "a"), edge("a", "e")]);
  assert.equal(canSaveGraph(issues), true);
  assert.deepEqual(issues, []);
});

test("a disconnected node warns but does not block the save", () => {
  const nodes = [
    node("s", "start"),
    node("a", "agent", "agent-1"),
    node("e", "end"),
    node("orphan", "agent", "agent-2"),
  ];
  const issues = validateGraph(nodes, [edge("s", "a"), edge("a", "e")]);
  const warning = issues.find((i) => i.nodeKey === "orphan");
  assert.equal(warning?.level, "warning", "an unreachable node is a warning, not a blocker");
  assert.equal(canSaveGraph(issues), true);
});

test("a missing end node warns rather than blocking", () => {
  const nodes = [node("s", "start"), node("a", "agent", "agent-1")];
  const issues = validateGraph(nodes, [edge("s", "a")]);
  assert.ok(issues.some((i) => i.level === "warning" && /End node/.test(i.message)));
  assert.equal(canSaveGraph(issues), true);
});

test("a cycle is rejected — it would never finish", () => {
  const nodes = [node("s", "start"), node("a", "agent", "x"), node("b", "agent", "y")];
  const issues = validateGraph(nodes, [edge("s", "a"), edge("a", "b"), edge("b", "a")]);
  assert.ok(issues.some((i) => i.level === "error" && /loop/.test(i.message)));
  assert.equal(canSaveGraph(issues), false);
});

test("reachability follows edges forward only", () => {
  const edges = [edge("s", "a"), edge("a", "b"), edge("x", "y")];
  const reached = reachableFrom("s", edges);
  assert.deepEqual([...reached].sort(), ["a", "b"]);
  assert.ok(!reached.has("y"), "a separate component must not be reported as reachable");
});

test("cycle detection is not fooled by a diamond", () => {
  // s → a → c and s → b → c share a descendant but form no loop.
  const nodes = [node("s", "start"), node("a", "agent", "1"), node("b", "agent", "2"), node("c", "end")];
  const edges = [edge("s", "a"), edge("s", "b"), edge("a", "c"), edge("b", "c")];
  assert.equal(hasCycle(nodes, edges), false);
});

test("deleting a node removes every edge that touched it", () => {
  const nodes = [node("s", "start"), node("a", "agent", "1"), node("e", "end")];
  const edges = [edge("s", "a"), edge("a", "e")];
  const result = removeNode("a", nodes, edges);
  assert.deepEqual(result.nodes.map((n) => n.node_key), ["s", "e"]);
  assert.deepEqual(result.edges, [], "no edge may survive pointing at a deleted node");
});

test("connecting refuses self-links and duplicates", () => {
  let edges: GraphEdge[] = [];
  edges = connectNodes("a", "a", edges);
  assert.deepEqual(edges, [], "a node cannot connect to itself");

  edges = connectNodes("a", "b", edges);
  assert.equal(edges.length, 1);

  edges = connectNodes("a", "b", edges);
  assert.equal(edges.length, 1, "the same connection must not be added twice");
});
