// Cheap, deterministic first pass at "does this description want an AI
// Agent or an ML Agent." Runs before any LLM call so the wizard can show
// an instant suggestion; Claude then refines/confirms in conversation.
// Keeping this heuristic (rather than calling an LLM for every keystroke)
// also means Phase 2's core routing logic is fully unit-testable offline.

export type AgentKind = "ai" | "ml";

export interface ClassificationResult {
  kind: AgentKind;
  confidence: number; // 0–1, based on signal strength difference
  matchedSignals: string[];
}

const ML_SIGNALS = [
  "predict", "prediction", "dataset", "csv", "spreadsheet", "forecast",
  "classify", "classification", "churn", "score", "scoring", "train a model",
  "training data", "fraud", "anomaly", "regression", "recommend based on",
  "historical data", "labeled data", "accuracy", "excel file",
];

const AI_SIGNALS = [
  "chatbot", "chat bot", "assistant", "answer questions", "support agent",
  "conversation", "respond to customers", "voice agent", "faq", "helpdesk",
  "sales agent", "onboarding assistant", "knowledge base", "talk to",
  "reply to", "customer service",
];

function countSignals(text: string, signals: string[]): string[] {
  const lower = text.toLowerCase();
  return signals.filter((signal) => lower.includes(signal));
}

export function classifyBuildIntent(description: string): ClassificationResult {
  const mlMatches = countSignals(description, ML_SIGNALS);
  const aiMatches = countSignals(description, AI_SIGNALS);

  const mlScore = mlMatches.length;
  const aiScore = aiMatches.length;

  // Ties (including 0–0, an under-specified description) default to AI:
  // it's the lower-friction path — no dataset required — so it's the
  // safer default to suggest when signal is weak.
  const kind: AgentKind = mlScore > aiScore ? "ml" : "ai";
  const matchedSignals = kind === "ml" ? mlMatches : aiMatches;
  const totalSignals = mlScore + aiScore;

  // Floor of 0.5 always applies: even a lone signal, or none at all,
  // is never reported as a coin flip below 50%.
  const rawConfidence = totalSignals === 0 ? 0 : Math.abs(mlScore - aiScore) / totalSignals;
  const confidence = Math.min(1, Math.max(0.5, rawConfidence));

  return { kind, confidence, matchedSignals };
}
