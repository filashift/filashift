/** Prefer a shared slot when it is involved in every conflict, not because its preset is wrong. */
export function reviewSlots(conflicts: [number, number][]): number[] {
  if (!conflicts.length) return [];
  const common = conflicts[0].filter(slot => conflicts.every(pair => pair.includes(slot)));
  return common.length === 1 ? common : [...new Set(conflicts.flat())].sort((a, b) => a - b);
}
