import type { AgentKind } from "./classify";

export type WizardStep =
  | "describe"
  | "confirm_type"
  | "template"
  | "theme"
  | "data_source"
  | "review";

const STEP_ORDER: WizardStep[] = [
  "describe",
  "confirm_type",
  "template",
  "theme",
  "data_source",
  "review",
];

export interface WizardState {
  step: WizardStep;
  description: string;
  suggestedKind: AgentKind | null;
  confirmedKind: AgentKind | null;
  templateId: string | null;
  theme: string | null;
  // AI: knowledge base doc refs. ML: dataset file ref. Either can be empty
  // going into review (both support "add later"), so it never blocks review.
  dataSourceRef: string | null;
}

export const initialWizardState: WizardState = {
  step: "describe",
  description: "",
  suggestedKind: null,
  confirmedKind: null,
  templateId: null,
  theme: null,
  dataSourceRef: null,
};

export type WizardAction =
  | { type: "SET_DESCRIPTION"; description: string; suggestedKind: AgentKind }
  | { type: "CONFIRM_TYPE"; kind: AgentKind }
  | { type: "SELECT_TEMPLATE"; templateId: string }
  | { type: "SELECT_THEME"; theme: string }
  | { type: "SET_DATA_SOURCE"; ref: string | null }
  | { type: "NEXT" }
  | { type: "BACK" }
  | { type: "GO_TO"; step: WizardStep };

/** Can the wizard advance past `state.step` right now? Drives the Next button's disabled state. */
export function canAdvance(state: WizardState): boolean {
  switch (state.step) {
    case "describe":
      return state.description.trim().length >= 10;
    case "confirm_type":
      return state.confirmedKind !== null;
    case "template":
      return state.templateId !== null;
    case "theme":
      return state.theme !== null;
    case "data_source":
      return true; // optional at this stage — can be added after creation
    case "review":
      return false; // review's "advance" is a submit action, not a step change
  }
}

function nextStep(current: WizardStep): WizardStep {
  const idx = STEP_ORDER.indexOf(current);
  return STEP_ORDER[Math.min(idx + 1, STEP_ORDER.length - 1)];
}

function prevStep(current: WizardStep): WizardStep {
  const idx = STEP_ORDER.indexOf(current);
  return STEP_ORDER[Math.max(idx - 1, 0)];
}

export function wizardReducer(state: WizardState, action: WizardAction): WizardState {
  switch (action.type) {
    case "SET_DESCRIPTION":
      return { ...state, description: action.description, suggestedKind: action.suggestedKind };

    case "CONFIRM_TYPE":
      return { ...state, confirmedKind: action.kind };

    case "SELECT_TEMPLATE":
      return { ...state, templateId: action.templateId };

    case "SELECT_THEME":
      return { ...state, theme: action.theme };

    case "SET_DATA_SOURCE":
      return { ...state, dataSourceRef: action.ref };

    case "NEXT":
      return canAdvance(state) ? { ...state, step: nextStep(state.step) } : state;

    case "BACK":
      return { ...state, step: prevStep(state.step) };

    case "GO_TO": {
      // Only allow jumping to a step whose prerequisites are already met —
      // prevents deep-linking/back-nav into an invalid mid-wizard state.
      const targetIdx = STEP_ORDER.indexOf(action.step);
      const currentIdx = STEP_ORDER.indexOf(state.step);
      if (targetIdx <= currentIdx) return { ...state, step: action.step };
      return state;
    }

    default:
      return state;
  }
}
