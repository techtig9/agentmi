import { test } from "node:test";
import assert from "node:assert/strict";
import {
  wizardReducer,
  canAdvance,
  initialWizardState,
  type WizardState,
} from "../lib/agent-builder/wizard-state";

test("cannot advance past describe step with a too-short description", () => {
  const state: WizardState = { ...initialWizardState, description: "hi" };
  assert.equal(canAdvance(state), false);
});

test("NEXT is a no-op when the current step's requirement isn't met", () => {
  const state: WizardState = { ...initialWizardState, description: "hi" };
  const result = wizardReducer(state, { type: "NEXT" });
  assert.equal(result.step, "describe"); // unchanged
});

test("full happy path advances through every step in order", () => {
  let state = initialWizardState;

  state = wizardReducer(state, {
    type: "SET_DESCRIPTION",
    description: "A chatbot that answers customer support questions",
    suggestedKind: "ai",
  });
  state = wizardReducer(state, { type: "NEXT" });
  assert.equal(state.step, "confirm_type");

  state = wizardReducer(state, { type: "CONFIRM_TYPE", kind: "ai" });
  state = wizardReducer(state, { type: "NEXT" });
  assert.equal(state.step, "template");

  state = wizardReducer(state, { type: "SELECT_TEMPLATE", templateId: "tmpl_support" });
  state = wizardReducer(state, { type: "NEXT" });
  assert.equal(state.step, "theme");

  state = wizardReducer(state, { type: "SELECT_THEME", theme: "cyber_neon" });
  state = wizardReducer(state, { type: "NEXT" });
  assert.equal(state.step, "data_source");

  state = wizardReducer(state, { type: "NEXT" }); // data source is optional
  assert.equal(state.step, "review");
});

test("BACK moves one step back regardless of validation state", () => {
  const state: WizardState = { ...initialWizardState, step: "template" };
  const result = wizardReducer(state, { type: "BACK" });
  assert.equal(result.step, "confirm_type");
});

test("BACK from the first step stays on the first step", () => {
  const result = wizardReducer(initialWizardState, { type: "BACK" });
  assert.equal(result.step, "describe");
});

test("GO_TO forward is blocked (no skipping ahead via deep link)", () => {
  const result = wizardReducer(initialWizardState, { type: "GO_TO", step: "review" });
  assert.equal(result.step, "describe"); // blocked, stays put
});

test("GO_TO backward is allowed (revisit an earlier step)", () => {
  const state: WizardState = { ...initialWizardState, step: "theme" };
  const result = wizardReducer(state, { type: "GO_TO", step: "template" });
  assert.equal(result.step, "template");
});

test("review step never reports advanceable (it submits, it doesn't advance)", () => {
  const state: WizardState = { ...initialWizardState, step: "review" };
  assert.equal(canAdvance(state), false);
});
