import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { summarizeToolUsage } from "../lib/tools/usage";
import { EXECUTABLE_TOOL_KINDS, isExecutableToolKind } from "../lib/chat/tool-runtime";

const root = path.resolve(process.cwd());
const read = (relative: string) => fs.readFileSync(path.join(root, relative), "utf8");

test("tool usage is tallied from recorded run traces", () => {
  const usage = summarizeToolUsage([
    {
      created_at: "2026-03-10T10:00:00Z",
      trace: [
        { step: "retrieve", sources: 2 },
        { step: "tool", tool_id: "tool-a", status: "succeeded" },
        { step: "tool", tool_id: "tool-b", status: "failed" },
      ],
    },
    {
      created_at: "2026-03-09T10:00:00Z",
      trace: [{ step: "tool", tool_id: "tool-a", status: "succeeded" }],
    },
  ]);

  assert.equal(usage.get("tool-a")?.callCount, 2);
  assert.equal(usage.get("tool-a")?.failureCount, 0);
  // Runs come newest-first, so the first sighting is the most recent use.
  assert.equal(usage.get("tool-a")?.lastUsedAt, "2026-03-10T10:00:00Z");
  assert.equal(usage.get("tool-b")?.failureCount, 1);
});

test("malformed traces are skipped rather than throwing", () => {
  const usage = summarizeToolUsage([
    { created_at: "2026-03-10T10:00:00Z", trace: null },
    { created_at: "2026-03-10T10:00:00Z", trace: "not-an-array" },
    { created_at: "2026-03-10T10:00:00Z", trace: [null, 42, { step: "tool" }] },
  ]);
  assert.equal(usage.size, 0, "a trace entry with no tool_id contributes nothing");
});

test("only tool kinds the runtime can execute are offered for creation", () => {
  // The form previously offered web_search, calculator, code, database and
  // email — every one of which throws in executeTool, so a tool created with
  // them could be attached to an agent and would then fail on first call.
  for (const kind of ["web_search", "calculator", "code", "database", "email"]) {
    assert.equal(isExecutableToolKind(kind), false, `${kind} is not executable`);
  }
  for (const kind of EXECUTABLE_TOOL_KINDS) {
    assert.equal(isExecutableToolKind(kind), true);
  }

  const action = read("lib/actions/platform-tools.ts");
  assert.ok(
    action.includes("z.enum(EXECUTABLE_TOOL_KINDS)"),
    "the server schema must derive its kinds from the runtime, not repeat them"
  );

  const form = read("components/dashboard/CreateToolForm.tsx");
  for (const kind of ["web_search", "calculator", "database", "email"]) {
    assert.ok(!form.includes(`value="${kind}"`), `the form must not offer the ${kind} kind`);
  }
});

test("a tool cannot be created without an endpoint it needs to run", () => {
  const action = read("lib/actions/platform-tools.ts");
  assert.ok(
    /endpoint:\s*z\.string\(\)\.url\(/.test(action),
    "endpoint must be required — executeHttpTool refuses to run without one"
  );
  assert.ok(action.includes("isSafeHttpUrl"), "the SSRF guard must apply at creation time too");
});

test("the tool test action runs the real execution path", () => {
  const action = read("lib/actions/platform-tools.ts");
  const block = action.slice(action.indexOf("export async function testPlatformTool"));
  assert.ok(block.includes("executeTool("), "must call the same executor an agent uses");
  assert.ok(block.includes("resolveSecret"), "must resolve credentials from the secrets vault");
  assert.ok(block.includes('.eq("org_id", ctx.orgId)'), "must be organization-scoped");
});

test("knowledge sources can be deleted and re-indexed", () => {
  const actions = read("lib/actions/knowledge.ts");
  assert.ok(actions.includes("export async function deleteKnowledgeSource"));
  assert.ok(actions.includes("export async function reindexKnowledgeSource"));

  const deleteBlock = actions.slice(actions.indexOf("export async function deleteKnowledgeSource"));
  assert.ok(
    deleteBlock.includes('from("knowledge_chunks")'),
    "chunks must be deleted explicitly — an orphaned chunk would keep answering queries"
  );
});

test("re-indexing computes embeddings before destroying the existing ones", () => {
  const actions = read("lib/actions/knowledge.ts");
  const block = actions.slice(actions.indexOf("export async function reindexKnowledgeSource"));
  const embedAt = block.indexOf("await embedChunks");
  const deleteAt = block.indexOf('.from("knowledge_chunks")\n      .delete()');
  assert.ok(embedAt > -1 && deleteAt > -1, "both steps must be present");
  assert.ok(
    embedAt < deleteAt,
    "a provider failure must not leave the agent with no knowledge at all"
  );
});

test("memory deletion is wired into the page that promises it", () => {
  const manager = read("components/dashboard/MemoryManager.tsx");
  assert.ok(manager.includes('method: "DELETE"'), "the delete endpoint must actually be called");

  const page = read("app/(dashboard)/dashboard/agents/[id]/memory/page.tsx");
  assert.ok(page.includes("MemoryManager"), "the memory page must render the manager");
});

test("status is never rendered as unconditionally green", () => {
  // Every one of these screens previously hardcoded text-neon-green next to a
  // status value, so failed, paused and disconnected all looked healthy.
  const pages = [
    "app/(dashboard)/dashboard/integrations/page.tsx",
    "components/dashboard/ToolCard.tsx",
    "components/dashboard/KnowledgeManager.tsx",
  ];
  for (const page of pages) {
    const source = read(page);
    assert.ok(source.includes("StatusBadge"), `${page} must render status through StatusBadge`);
    assert.ok(
      !/text-neon-green[^"]*">\{[a-z.]*status\}/.test(source),
      `${page} must not paint a raw status value green`
    );
  }
});

test("no component references a CSS class the stylesheet never defines", () => {
  // The integrations form used className="input", which was never defined —
  // those controls rendered completely unstyled.
  const css = read("app/globals.css");
  const forms = read("app/(dashboard)/dashboard/integrations/IntegrationForms.tsx");
  assert.ok(!forms.includes('className="input"'), "the undefined .input class must be gone");
  assert.ok(!css.includes(".input"), "sanity check: .input is still not a defined class");
});

test("undefined ink shades are not used as if they were tokens", () => {
  // tailwind.config.ts defines ink 100/400/600 only; ink-300 and ink-500
  // silently produce no CSS at all.
  const files = [
    "components/dashboard/WorkflowBuilder.tsx",
    "app/(dashboard)/dashboard/workflows/[id]/page.tsx",
    "app/(dashboard)/dashboard/agents/[id]/knowledge/page.tsx",
  ];
  for (const file of files) {
    const source = read(file);
    assert.ok(!/text-ink-(300|500|200|700)\b/.test(source), `${file} uses an undefined ink shade`);
  }
});

test("the multi-agent page reads the saved graph rather than describing orchestration", () => {
  const page = read("app/(dashboard)/dashboard/multi-agent/page.tsx");
  assert.ok(page.includes('from("workflow_nodes")'), "roles must come from the real graph");
  assert.ok(page.includes('from("workflow_edges")'), "routing must come from the real graph");
});

test("datasets infer task type from the profiled target column", () => {
  const page = read("app/(dashboard)/dashboard/datasets/page.tsx");
  assert.ok(page.includes("column_profile"), "the stored profile must be read");
  assert.ok(
    page.includes('column.type === "numeric" ? "Regression" : "Classification"'),
    "task type must be derived from the target's profiled type"
  );
});
