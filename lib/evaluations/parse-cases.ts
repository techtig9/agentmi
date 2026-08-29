export interface EvalCase {
  input: string;
  expectedContains: string;
}

export const MAX_EVAL_CASES = 20;

/**
 * Parses one test case per line, formatted as `input => expected substring`.
 * A case passes if the agent's reply contains the expected substring
 * (case-insensitive) — a deterministic, explainable check rather than an
 * LLM-as-judge, so results are reproducible and don't themselves depend on
 * a model call.
 */
export function parseEvalCases(raw: string): { ok: true; cases: EvalCase[] } | { ok: false; error: string } {
  const lines = raw
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length === 0) {
    return { ok: false, error: "Add at least one test case." };
  }
  if (lines.length > MAX_EVAL_CASES) {
    return { ok: false, error: `Too many test cases. Maximum is ${MAX_EVAL_CASES} per evaluation.` };
  }

  const cases: EvalCase[] = [];
  for (const [i, line] of lines.entries()) {
    const sepIndex = line.indexOf("=>");
    if (sepIndex === -1) {
      return { ok: false, error: `Line ${i + 1} is missing "=>" — format each line as: input => expected substring` };
    }
    const input = line.slice(0, sepIndex).trim();
    const expectedContains = line.slice(sepIndex + 2).trim();
    if (!input) return { ok: false, error: `Line ${i + 1} is missing an input before "=>".` };
    if (!expectedContains) return { ok: false, error: `Line ${i + 1} is missing an expected substring after "=>".` };
    if (input.length > 2000) return { ok: false, error: `Line ${i + 1}'s input is too long (max 2000 characters).` };
    cases.push({ input, expectedContains });
  }

  return { ok: true, cases };
}
