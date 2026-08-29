// Given an incoming message and a set of specialist agents (each with a
// short description of what it handles), picks which specialist should
// answer. Same word-overlap approach as classify.ts, generalized from a
// fixed 2-way choice to N specialists — deliberately simple and
// inspectable rather than an LLM call, so routing is instant, free, and
// fully testable; the router agent's job is dispatch, not generation.

export interface Specialist {
  id: string;
  name: string;
  description: string;
  keywords?: string[];
}

export interface RouteResult {
  specialistId: string;
  specialistName: string;
  score: number;
  matchedTerms: string[];
}

const STOP_WORDS = new Set([
  "the", "a", "an", "and", "or", "is", "are", "to", "of", "for", "in",
  "on", "with", "my", "i", "me", "you", "your", "can", "do", "does",
  "what", "how", "want", "need", "please", "help",
]);

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 1 && !STOP_WORDS.has(w));
}

/**
 * Routes to the specialist whose description/keywords share the most
 * terms with the message. Throws if `specialists` is empty — a workflow
 * with no members is a configuration error, not a routing outcome.
 */
export function routeToSpecialist(message: string, specialists: Specialist[]): RouteResult {
  if (specialists.length === 0) {
    throw new Error("routeToSpecialist: at least one specialist is required");
  }

  const messageTerms = new Set(tokenize(message));

  const scored = specialists.map((s) => {
    const specialistTerms = new Set([...tokenize(s.description), ...(s.keywords ?? []).map((k) => k.toLowerCase())]);
    const matchedTerms = [...messageTerms].filter((t) => specialistTerms.has(t));
    return { specialist: s, score: matchedTerms.length, matchedTerms };
  });

  scored.sort((a, b) => b.score - a.score);
  const winner = scored[0];

  // No term overlap at all — fall back to the first-listed specialist
  // (the workflow creator's default) rather than an arbitrary tie-break.
  const best = winner.score > 0 ? winner : { ...scored[0], specialist: specialists[0], matchedTerms: [] };

  return {
    specialistId: best.specialist.id,
    specialistName: best.specialist.name,
    score: best.score,
    matchedTerms: best.matchedTerms,
  };
}
