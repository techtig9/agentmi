// For classification targets with 3+ distinct string values — the
// binary case (lib/ml/encode.ts) has richer "which side is positive"
// logic that doesn't generalize past 2 classes, so this is deliberately
// a separate, simpler function: alphabetical order is the only sane
// default once there's no single "positive" class.

export interface MulticlassEncodingResult {
  encoded: number[];
  classNames: string[]; // index-aligned: classNames[i] is what encoded value i means
}

export class NotMulticlassError extends Error {}

const MIN_CLASSES = 3;
const MAX_CLASSES = 20; // matches training-service's cap — a free-text/ID column isn't a classification target

export function encodeMulticlassLabels(rawValues: string[]): MulticlassEncodingResult {
  const normalized = rawValues.map((v) => v.trim());
  const classNames = [...new Set(normalized)].sort();

  if (classNames.length < MIN_CLASSES) {
    throw new NotMulticlassError(
      `Expected at least ${MIN_CLASSES} distinct values for multi-class encoding, found ${classNames.length}`
    );
  }
  if (classNames.length > MAX_CLASSES) {
    throw new NotMulticlassError(
      `Found ${classNames.length} distinct values — that looks like a free-text or ID column, not a classification target (max ${MAX_CLASSES} classes)`
    );
  }

  const indexOf = new Map(classNames.map((name, i) => [name, i]));
  const encoded = normalized.map((v) => indexOf.get(v)!);

  return { encoded, classNames };
}
