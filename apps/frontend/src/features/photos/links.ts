/** Stable cover-first groups in the selection's existing display order. */
export function photoGroups(
  selected: readonly string[],
  links: readonly (readonly string[])[],
): string[][] {
  const available = new Set(selected),
    seen = new Set<string>(),
    result: string[][] = [];
  for (const id of selected) {
    if (seen.has(id)) continue;
    const group = (links.find((row) => row.includes(id)) ?? [id]).filter(
      (value) => available.has(value),
    );
    for (const member of group) seen.add(member);
    result.push(group);
  }
  return result;
}
