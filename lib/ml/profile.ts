export type ColumnType = "numeric" | "categorical" | "boolean" | "text" | "empty";

export interface ColumnProfile {
  name: string;
  type: ColumnType;
  missingCount: number;
  missingPct: number;
  uniqueCount: number;
  // Only populated for categorical/boolean columns with a manageable cardinality —
  // this is what flags class imbalance for a suggested target column.
  valueCounts?: Record<string, number>;
}

export interface DatasetProfile {
  rowCount: number;
  columns: ColumnProfile[];
  suggestedTargetColumn: string | null;
}

const MAX_CATEGORICAL_CARDINALITY = 20;

function inferColumnType(values: string[]): ColumnType {
  const nonEmpty = values.filter((v) => v !== "" && v !== null && v !== undefined);
  if (nonEmpty.length === 0) return "empty";

  const boolSet = new Set(nonEmpty.map((v) => v.toLowerCase()));
  const isBoolean = [...boolSet].every((v) => ["true", "false", "0", "1", "yes", "no"].includes(v));
  if (isBoolean && boolSet.size <= 2) return "boolean";

  const numericCount = nonEmpty.filter((v) => v.trim() !== "" && !Number.isNaN(Number(v))).length;
  if (numericCount / nonEmpty.length > 0.95) return "numeric";

  const uniqueRatio = new Set(nonEmpty).size / nonEmpty.length;
  const uniqueCount = new Set(nonEmpty).size;
  // Repetition (ratio < 0.5) is the primary categorical signal. The absolute
  // cardinality cap is a secondary signal and only counts when there's SOME
  // repetition (ratio < 1) — otherwise a small sample of all-distinct free
  // text (e.g. 3 unique notes in 3 rows) would wrongly read as categorical.
  if (uniqueRatio < 0.5 || (uniqueCount <= MAX_CATEGORICAL_CARDINALITY && uniqueRatio < 1)) {
    return "categorical";
  }

  return "text";
}

/**
 * rows: array of objects keyed by column name (i.e. already-parsed CSV,
 * one object per row) — parsing the raw file is left to the upload route,
 * this function only profiles already-tabular data.
 */
export function profileDataset(rows: Record<string, string>[]): DatasetProfile {
  if (rows.length === 0) {
    return { rowCount: 0, columns: [], suggestedTargetColumn: null };
  }

  const columnNames = Object.keys(rows[0]);
  const columns: ColumnProfile[] = columnNames.map((name) => {
    const values = rows.map((r) => r[name] ?? "");
    const missingCount = values.filter((v) => v === "" || v === null || v === undefined).length;
    const type = inferColumnType(values);
    const uniqueCount = new Set(values.filter((v) => v !== "")).size;

    const profile: ColumnProfile = {
      name,
      type,
      missingCount,
      missingPct: Math.round((missingCount / values.length) * 1000) / 10,
      uniqueCount,
    };

    if ((type === "categorical" || type === "boolean") && uniqueCount <= MAX_CATEGORICAL_CARDINALITY) {
      const counts: Record<string, number> = {};
      for (const v of values) {
        if (v === "") continue;
        counts[v] = (counts[v] ?? 0) + 1;
      }
      profile.valueCounts = counts;
    }

    return profile;
  });

  // Heuristic: the best target-column guess is a low-cardinality
  // categorical/boolean column with the fewest missing values, since
  // that's what a classification task needs as its label.
  const targetCandidates = columns
    .filter((c) => (c.type === "categorical" || c.type === "boolean") && c.uniqueCount >= 2)
    .sort((a, b) => a.missingCount - b.missingCount);

  return {
    rowCount: rows.length,
    columns,
    suggestedTargetColumn: targetCandidates[0]?.name ?? null,
  };
}
