// Turns human-written binary labels (yes/no, churned/retained, true/false...)
// into clean 0/1 for the trainer. Picking which side is "1" matters for
// interpretability (a churn model where 1=retained would be silently
// backwards) — POSITIVE_WORDS lets us pick the intuitive side when a
// label matches a known word; otherwise we fall back to a stated,
// deterministic rule and say so, rather than guessing quietly.

export interface EncodingResult {
  encoded: number[];
  mapping: Record<string, 0 | 1>;
  warnings: string[];
}

export class NotBinaryError extends Error {}

// Words that conventionally represent the "positive"/1 class across common
// business use cases (churn, fraud, conversion...). Matched case-insensitively.
const POSITIVE_WORDS = new Set([
  "yes", "true", "1", "churned", "churn", "fraud", "fraudulent", "spam",
  "positive", "active", "converted", "success", "won", "approved",
]);
const NEGATIVE_WORDS = new Set([
  "no", "false", "0", "retained", "not_churned", "legitimate", "not_spam",
  "negative", "inactive", "not_converted", "failure", "lost", "denied",
]);

export function encodeBinaryLabels(rawValues: string[]): EncodingResult {
  const normalized = rawValues.map((v) => v.trim().toLowerCase());
  const uniqueValues = [...new Set(normalized)];

  if (uniqueValues.length !== 2) {
    throw new NotBinaryError(
      `Expected exactly 2 distinct values for binary encoding, found ${uniqueValues.length}: ${uniqueValues.join(", ")}`
    );
  }

  const warnings: string[] = [];
  const [a, b] = uniqueValues;
  const aIsPositive = POSITIVE_WORDS.has(a);
  const bIsPositive = POSITIVE_WORDS.has(b);
  const aIsNegative = NEGATIVE_WORDS.has(a);
  const bIsNegative = NEGATIVE_WORDS.has(b);

  let mapping: Record<string, 0 | 1>;

  if (aIsPositive && !bIsPositive) {
    mapping = { [a]: 1, [b]: 0 };
  } else if (bIsPositive && !aIsPositive) {
    mapping = { [a]: 0, [b]: 1 };
  } else if (aIsNegative && !bIsNegative) {
    mapping = { [a]: 0, [b]: 1 };
  } else if (bIsNegative && !aIsNegative) {
    mapping = { [b]: 0, [a]: 1 };
  } else {
    // Neither side matched a known word (or both did, ambiguously) —
    // fall back to alphabetical order and say so explicitly rather than
    // silently picking a side that might read backwards to the user.
    const sorted = [...uniqueValues].sort();
    mapping = { [sorted[0]]: 0, [sorted[1]]: 1 };
    warnings.push(
      `Couldn't confidently determine which value means "positive" — mapped alphabetically: ` +
        `"${sorted[0]}" → 0, "${sorted[1]}" → 1. Double-check this matches what you intended.`
    );
  }

  const encoded = normalized.map((v) => mapping[v]);
  return { encoded, mapping, warnings };
}

/** True if a column's values look like they need encoding (i.e. aren't already clean "0"/"1" strings). */
export function needsEncoding(rawValues: string[]): boolean {
  const uniqueValues = new Set(rawValues.map((v) => v.trim()));
  if (uniqueValues.size !== 2) return false;
  return ![...uniqueValues].every((v) => v === "0" || v === "1");
}
