import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { seedWizardState, initialWizardState } from "../lib/agent-builder/wizard-state";

const root = path.resolve(process.cwd());
const read = (relative: string) => fs.readFileSync(path.join(root, relative), "utf8");

test("the landing page is a real page, not a redirect stub", () => {
  const page = read("app/page.tsx");
  assert.ok(page.includes("Build AI agents."), "the hero headline must be present");
  assert.ok(page.includes("Start Building"), "the primary CTA must be present");
  assert.ok(page.includes('id="pricing"'), "pricing must be reachable from the nav anchor");
  // Signed-in visitors should still skip the pitch.
  assert.ok(page.includes("redirect(\"/dashboard\")"), "signed-in users must go straight to the app");
});

test("landing pricing is quoted through the billing engine, not hardcoded", () => {
  // The pricing table moved into its own client component when the
  // monthly/yearly toggle was added. The guarantee is unchanged: whichever
  // file renders the landing page's prices must derive them from the engine
  // and must not carry a literal price string.
  const surface = read("app/page.tsx") + read("components/marketing/PricingTable.tsx");
  assert.ok(surface.includes("quotePrice"), "must quote through lib/pricing/engine");
  assert.ok(surface.includes("PLAN_ORDER"), "must render the real plan list");
  assert.ok(
    !/\$\d+\s*\/\s*mo/.test(surface),
    "must not hardcode a price string alongside the engine-derived one"
  );
});

test("onboarding redirect targets are allow-listed, not caller-controlled", () => {
  const actions = read("lib/actions/organizations.ts");
  assert.ok(actions.includes("ALLOWED_ONBOARDING_DESTINATIONS"), "an allow-list must exist");
  assert.ok(
    actions.includes("redirect(destination)"),
    "the action must redirect to the validated destination"
  );
  // The guard must be a membership check, not a prefix check that "//evil.com" passes.
  assert.ok(
    actions.includes("ALLOWED_ONBOARDING_DESTINATIONS.has(candidate)"),
    "validation must be set membership, not a startsWith prefix test"
  );
});

test("seedWizardState preselects a template without skipping the describe step", () => {
  assert.deepEqual(seedWizardState(null), initialWizardState, "no template means the normal start");

  const seeded = seedWizardState("template-123");
  assert.equal(seeded.templateId, "template-123");
  assert.equal(seeded.step, "describe", "a template must not skip describing the agent");
  assert.equal(seeded.description, "", "nothing else may be pre-filled");
});

test("the create page validates ?template= against the real template list", () => {
  const page = read("app/(dashboard)/dashboard/create/page.tsx");
  assert.ok(
    page.includes("available.some((t) => t.id === requested)"),
    "an unknown template id from the query string must not be trusted"
  );
  assert.ok(page.includes("initialTemplateId"), "the validated id must reach the wizard");
});

test("the agent builder edits the config keys the chat runtime actually reads", () => {
  const runtime = read("lib/chat/run-agent-chat.ts");
  const action = read("lib/actions/agent-config.ts");

  // If the runtime stops reading one of these, the builder field becomes a lie.
  for (const key of ["system_prompt", "model", "max_tokens"]) {
    assert.ok(runtime.includes(`config.${key}`), `runtime must still read config.${key}`);
    assert.ok(action.includes(key), `updateAgent must still write ${key}`);
  }
});

test("updateAgent refuses to write runtime-internal config keys", () => {
  const action = read("lib/actions/agent-config.ts");
  // A blanket merge of form input into config would let `__memory_context` through.
  assert.ok(
    !/config\s*=\s*\{\s*\.\.\.existing,\s*\.\.\.(parsed|formData|body)/.test(action),
    "config must be built key by key, never spread from caller-supplied input"
  );
  assert.ok(action.includes("setOrClear"), "fields must be set individually");
});

test("every agent action is organization-scoped", () => {
  const action = read("lib/actions/agent-config.ts");
  const orgScoped = action.match(/\.eq\("org_id", ctx\.orgId\)/g) ?? [];
  assert.ok(
    orgScoped.length >= 6,
    `every agent read and write must filter on org_id, found ${orgScoped.length}`
  );
  assert.ok(
    !/\.eq\("id", parsed\.data\.agentId\)\s*\.single\(\)/.test(action),
    "an agent must never be looked up by id alone, without the org filter"
  );
});

test("archive and restore require an elevated role", () => {
  const action = read("lib/actions/agent-config.ts");
  const archiveBlock = action.slice(action.indexOf("export async function archiveAgent"));
  assert.ok(
    archiveBlock.includes('requireRole(ctx, ["owner", "admin"])'),
    "archiving must be role-gated server-side"
  );
});

test("duplicating an agent charges credits and skips private data", () => {
  const action = read("lib/actions/agent-config.ts");
  const block = action.slice(action.indexOf("export async function duplicateAgent"));
  assert.ok(block.includes("consume_credits"), "a duplicate is a new billable agent");
  assert.ok(
    block.includes('key.startsWith("__")'),
    "runtime-internal config keys must be stripped from the copy"
  );
});

test("the playground reports server-recorded values, not client guesses", () => {
  const route = read("app/api/dashboard/agents/[id]/chat/route.ts");
  assert.ok(route.includes("run_id"), "the API must return the recorded run id");
  assert.ok(route.includes("duration_ms"), "the API must return the measured duration");
  assert.ok(route.includes("credits_used"), "the API must return the charged credits");

  const playground = read("components/dashboard/AgentPlayground.tsx");
  assert.ok(
    !/Date\.now\(\)\s*-\s*\w*start/i.test(playground),
    "latency must come from the server, not be timed in the browser"
  );
});

test("the builder no longer advertises a drag-and-drop canvas it does not have", () => {
  const builder = read("app/(dashboard)/dashboard/agents/[id]/builder/page.tsx");
  const component = read("components/dashboard/AgentBuilder.tsx");
  for (const source of [builder, component]) {
    // Strip comments first: prose explaining what was removed is not a claim
    // made to the user, only rendered text is.
    assert.ok(
      !/drag-and-drop/i.test(stripComments(source)),
      "the builder must not claim drag-and-drop orchestration it does not implement"
    );
  }
  assert.ok(component.includes("updateAgent"), "the builder must actually save changes");
});

/** Removes block and line comments so a guard tests shipped text, not commentary. */
function stripComments(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .split("\n")
    .map((line) => line.split("//")[0])
    .join("\n");
}

test("the dashboard summarises real recorded runs", () => {
  const page = read("app/(dashboard)/dashboard/page.tsx");
  assert.ok(page.includes('from("agent_runs")'), "run metrics must come from agent_runs");
  assert.ok(page.includes("summarizeRuns"), "metrics must use the shared summariser");
  assert.ok(
    page.includes("successRate === null"),
    "an empty workspace must render a dash, not a fabricated rate"
  );
});
