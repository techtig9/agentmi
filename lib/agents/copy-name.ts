/**
 * "Support bot" → "Support bot (copy)", staying inside the agents table's
 * 80-character name limit by trimming the base rather than the suffix, so a
 * duplicate is always recognisable as one.
 *
 * Lives outside the "use server" action module because every export from one
 * of those must be an async server action.
 */
export function nextCopyName(name: string): string {
  const suffix = " (copy)";
  const base = name.length + suffix.length > 80 ? name.slice(0, 80 - suffix.length) : name;
  return `${base}${suffix}`;
}
