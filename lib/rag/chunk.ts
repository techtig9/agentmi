// Splits raw knowledge text into chunks suitable for embedding.
// Overlap keeps context from being severed exactly at a chunk boundary
// (a fact split mid-sentence across two chunks would be unretrievable).

export interface Chunk {
  index: number;
  text: string;
  charStart: number;
  charEnd: number;
}

export interface ChunkOptions {
  maxChars: number; // target chunk size
  overlapChars: number; // how much of the previous chunk repeats at the start of the next
}

export const DEFAULT_CHUNK_OPTIONS: ChunkOptions = { maxChars: 800, overlapChars: 150 };

export function chunkText(text: string, opts: ChunkOptions = DEFAULT_CHUNK_OPTIONS): Chunk[] {
  const trimmed = text.trim();
  if (trimmed.length === 0) return [];
  if (opts.overlapChars >= opts.maxChars) {
    throw new Error("overlapChars must be smaller than maxChars");
  }

  const chunks: Chunk[] = [];
  let start = 0;
  let index = 0;

  while (start < trimmed.length) {
    let end = Math.min(start + opts.maxChars, trimmed.length);

    // Prefer breaking at a sentence or paragraph boundary near the target
    // end, rather than mid-word/mid-sentence, when one exists nearby.
    if (end < trimmed.length) {
      const windowStart = Math.max(start + opts.maxChars - 200, start);
      const window = trimmed.slice(windowStart, end);
      const lastBreak = Math.max(window.lastIndexOf(". "), window.lastIndexOf("\n"));
      if (lastBreak !== -1) {
        end = windowStart + lastBreak + 1;
      }
    }

    const chunkStr = trimmed.slice(start, end).trim();
    if (chunkStr.length > 0) {
      chunks.push({ index, text: chunkStr, charStart: start, charEnd: end });
      index += 1;
    }

    if (end >= trimmed.length) break;
    start = end - opts.overlapChars;
  }

  return chunks;
}
