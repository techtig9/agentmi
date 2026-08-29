export interface EmbeddedChunk {
  id: string;
  text: string;
  vector: number[];
}

export interface RetrievalResult {
  id: string;
  text: string;
  score: number;
}

export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error(`vector length mismatch: ${a.length} vs ${b.length}`);
  }
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

/** Returns the top-k chunks most similar to the query vector, highest score first. */
export function retrieveTopK(
  queryVector: number[],
  candidates: EmbeddedChunk[],
  k: number
): RetrievalResult[] {
  if (k <= 0) return [];

  return candidates
    .map((c) => ({ id: c.id, text: c.text, score: cosineSimilarity(queryVector, c.vector) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, k);
}
