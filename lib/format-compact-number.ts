const COMPACT_UNITS = ["", "k", "M", "G", "T"] as const;

export function formatCompactNumber(value: number) {
  if (!Number.isFinite(value) || Math.abs(value) < 1_000) return String(value);

  let unitIndex = Math.min(
    Math.floor(Math.log10(Math.abs(value)) / 3),
    COMPACT_UNITS.length - 1,
  );
  let compactValue = value / (1_000 ** unitIndex);
  let roundedValue = Math.round(compactValue * 10) / 10;

  if (Math.abs(roundedValue) >= 1_000 && unitIndex < COMPACT_UNITS.length - 1) {
    unitIndex += 1;
    compactValue = value / (1_000 ** unitIndex);
    roundedValue = Math.round(compactValue * 10) / 10;
  }

  return `${roundedValue}${COMPACT_UNITS[unitIndex]}`;
}
