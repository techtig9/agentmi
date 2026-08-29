/** Case-insensitive substring check — the actual reply passes if it contains the expected text. */
export function caseWasPassed(actualReply: string, expectedContains: string): boolean {
  return actualReply.toLowerCase().includes(expectedContains.toLowerCase());
}

export interface ScoredCase {
  input: string;
  expectedContains: string;
  actualReply: string;
  passed: boolean;
}

/** Aggregate score as a 0-100 percentage of passed cases. */
export function scorePercent(results: { passed: boolean }[]): number {
  if (results.length === 0) return 0;
  const passed = results.filter((r) => r.passed).length;
  return Math.round((passed / results.length) * 1000) / 10; // one decimal place
}
