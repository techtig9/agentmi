export interface Command {
  href: string;
  label: string;
  group: string;
}

/**
 * Ranks navigation commands against a query.
 *
 * Subsequence matching (not substring) so "apik" finds "API Keys" and "obs"
 * finds "Observability" — the shorthand people actually type into a palette.
 * Kept as a pure function, separate from the React component, so the matching
 * rules are unit-testable without rendering anything.
 *
 * Ranking, best first:
 *   0 — label starts with the query
 *   1 — query appears somewhere in the label
 *   2 — query spans the start of consecutive words ("apik" → "API Keys")
 *   3 — label letters match the query in order (subsequence)
 *   4 — the group name matches instead
 * Ties keep the original navigation order, so an empty query returns the
 * sidebar's own ordering untouched.
 */
export function filterCommands(commands: Command[], query: string): Command[] {
  const q = query.trim().toLowerCase();
  if (!q) return commands;

  const scored: Array<{ command: Command; rank: number; index: number }> = [];

  commands.forEach((command, index) => {
    const label = command.label.toLowerCase();
    const group = command.group.toLowerCase();

    let rank = -1;
    if (label.startsWith(q)) rank = 0;
    else if (label.includes(q)) rank = 1;
    else if (matchesWordPrefixes(q, label)) rank = 2;
    else if (isSubsequence(q, label)) rank = 3;
    else if (group.includes(q)) rank = 4;

    if (rank >= 0) scored.push({ command, rank, index });
  });

  return scored
    .sort((a, b) => a.rank - b.rank || a.index - b.index)
    .map((entry) => entry.command);
}

/**
 * True when the query can be consumed by walking the label's words in order,
 * taking a prefix of each. "apik" → "api" + "k(eys)" matches "API Keys", but
 * not "API & SDK", which is what makes it a stronger signal than a plain
 * subsequence.
 */
function matchesWordPrefixes(needle: string, label: string): boolean {
  const words = label.split(/[^a-z0-9]+/).filter(Boolean);
  let rest = needle;
  for (const word of words) {
    if (!rest) break;
    let taken = 0;
    while (taken < word.length && taken < rest.length && word[taken] === rest[taken]) {
      taken++;
    }
    // A word must either be consumed entirely or finish the query, otherwise
    // the query is drifting across a word boundary mid-token.
    if (taken > 0 && (taken === word.length || taken === rest.length)) {
      rest = rest.slice(taken);
    }
  }
  return rest.length === 0;
}

/** True when every character of `needle` appears in `haystack` in order. */
function isSubsequence(needle: string, haystack: string): boolean {
  let i = 0;
  for (const char of haystack) {
    if (char === needle[i]) i++;
    if (i === needle.length) return true;
  }
  return i === needle.length;
}
