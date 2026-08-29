// Mulberry32 — a small, dependency-free seeded PRNG. Deterministic:
// the same seed always produces the same split, which matters for
// reproducible evaluation metrics across retrains.
function mulberry32(seed: number): () => number {
  let a = seed;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface SplitResult<T> {
  train: T[];
  test: T[];
}

export function trainTestSplit<T>(rows: T[], testFraction: number, seed = 42): SplitResult<T> {
  if (testFraction <= 0 || testFraction >= 1) {
    throw new Error("testFraction must be between 0 and 1 (exclusive)");
  }

  const rand = mulberry32(seed);
  const shuffled = [...rows];
  // Fisher–Yates using the seeded generator, not Math.random — determinism
  // is the whole point of taking a seed parameter.
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  const testSize = Math.round(shuffled.length * testFraction);
  return { train: shuffled.slice(testSize), test: shuffled.slice(0, testSize) };
}
