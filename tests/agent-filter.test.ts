import test from "node:test";
import assert from "node:assert/strict";
import {
  filterAgents,
  countByStatus,
  DEFAULT_AGENT_FILTERS,
  type AgentListItem,
} from "../lib/agents/filter";
import { nextCopyName } from "../lib/agents/copy-name";

function agent(overrides: Partial<AgentListItem> & { id: string; name: string }): AgentListItem {
  return {
    kind: "ai",
    status: "ready",
    description: "",
    model: null,
    toolCount: 0,
    knowledgeSources: 0,
    knowledgeChunks: 0,
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
    lastRunAt: null,
    ...overrides,
  };
}

const AGENTS: AgentListItem[] = [
  agent({
    id: "1",
    name: "Support bot",
    description: "Answers refund questions",
    updatedAt: "2026-03-01T00:00:00Z",
    lastRunAt: "2026-03-05T00:00:00Z",
  }),
  agent({
    id: "2",
    name: "Churn predictor",
    kind: "ml",
    status: "training",
    updatedAt: "2026-02-01T00:00:00Z",
  }),
  agent({
    id: "3",
    name: "Archived helper",
    status: "archived",
    updatedAt: "2026-04-01T00:00:00Z",
  }),
  agent({
    id: "4",
    name: "Sales outreach",
    model: "llama-3.3-70b-versatile",
    updatedAt: "2026-01-15T00:00:00Z",
    lastRunAt: "2026-03-09T00:00:00Z",
  }),
];

test("archived agents are hidden by default but reachable via the status filter", () => {
  const shown = filterAgents(AGENTS, DEFAULT_AGENT_FILTERS).map((a) => a.id);
  assert.ok(!shown.includes("3"), "archived agent must not appear in the default view");

  const archived = filterAgents(AGENTS, { ...DEFAULT_AGENT_FILTERS, status: "archived" });
  assert.deepEqual(
    archived.map((a) => a.id),
    ["3"],
    "the archived filter must still reach it"
  );
});

test("search matches name, description and model", () => {
  const byName = filterAgents(AGENTS, { ...DEFAULT_AGENT_FILTERS, query: "support" });
  assert.deepEqual(byName.map((a) => a.id), ["1"]);

  const byDescription = filterAgents(AGENTS, { ...DEFAULT_AGENT_FILTERS, query: "refund" });
  assert.deepEqual(byDescription.map((a) => a.id), ["1"]);

  const byModel = filterAgents(AGENTS, { ...DEFAULT_AGENT_FILTERS, query: "llama" });
  assert.deepEqual(byModel.map((a) => a.id), ["4"]);
});

test("search is case-insensitive and ignores surrounding whitespace", () => {
  const results = filterAgents(AGENTS, { ...DEFAULT_AGENT_FILTERS, query: "  SUPPORT  " });
  assert.deepEqual(results.map((a) => a.id), ["1"]);
});

test("the kind filter separates AI from ML agents", () => {
  const ml = filterAgents(AGENTS, { ...DEFAULT_AGENT_FILTERS, kind: "ml", status: "all" });
  assert.deepEqual(ml.map((a) => a.id), ["2"]);

  const ai = filterAgents(AGENTS, { ...DEFAULT_AGENT_FILTERS, kind: "ai" }).map((a) => a.id);
  assert.ok(!ai.includes("2"));
});

test("filters combine rather than override one another", () => {
  const results = filterAgents(AGENTS, {
    ...DEFAULT_AGENT_FILTERS,
    kind: "ai",
    query: "sales",
  });
  assert.deepEqual(results.map((a) => a.id), ["4"]);
});

test("default sort is most recently updated first", () => {
  const results = filterAgents(AGENTS, DEFAULT_AGENT_FILTERS);
  assert.deepEqual(results.map((a) => a.id), ["1", "2", "4"]);
});

test("activity sort ranks by last run, pushing never-run agents to the end", () => {
  const results = filterAgents(AGENTS, { ...DEFAULT_AGENT_FILTERS, sort: "activity" });
  assert.deepEqual(
    results.map((a) => a.id),
    ["4", "1", "2"],
    "agent 4 ran most recently; agent 2 has never run and sorts last"
  );
});

test("name sort is alphabetical and oldest sort is by creation", () => {
  const byName = filterAgents(AGENTS, { ...DEFAULT_AGENT_FILTERS, sort: "name" });
  assert.deepEqual(byName.map((a) => a.name), ["Churn predictor", "Sales outreach", "Support bot"]);

  const oldest = filterAgents(
    [
      agent({ id: "a", name: "A", createdAt: "2026-05-01T00:00:00Z" }),
      agent({ id: "b", name: "B", createdAt: "2026-01-01T00:00:00Z" }),
    ],
    { ...DEFAULT_AGENT_FILTERS, sort: "oldest" }
  );
  assert.deepEqual(oldest.map((a) => a.id), ["b", "a"]);
});

test("filtering never mutates the source array", () => {
  const input = [...AGENTS];
  filterAgents(input, { ...DEFAULT_AGENT_FILTERS, sort: "name" });
  assert.deepEqual(input.map((a) => a.id), AGENTS.map((a) => a.id));
});

test("status counts cover every agent, archived included", () => {
  const counts = countByStatus(AGENTS);
  assert.equal(counts.ready, 2);
  assert.equal(counts.training, 1);
  assert.equal(counts.archived, 1);
});

test("duplicate names stay inside the 80-character column limit", () => {
  assert.equal(nextCopyName("Support bot"), "Support bot (copy)");
  const long = "x".repeat(80);
  const copied = nextCopyName(long);
  assert.ok(copied.length <= 80, `copy name must fit the column, got ${copied.length}`);
  assert.ok(copied.endsWith(" (copy)"), "the suffix must survive truncation, not the tail of the name");
});
