// Year-based version labels (`2026.1`, `2026.2`, `2027.1`) shared by DPP
// revisions and data-dictionary versions. Two independent counters that happen
// to use the same scheme: a DPP's version says nothing about the dictionary
// version it is bound to, and vice versa.

export type ParsedVersionLabel = { sequence: number; year: number };

const LABEL_PATTERN = /^(\d{4})\.(\d+)$/;

export function parseVersionLabel(label: string): ParsedVersionLabel | null {
  const match = LABEL_PATTERN.exec(label.trim());
  if (!match) return null;

  const year = Number(match[1]);
  const sequence = Number(match[2]);
  // `2026.0` and `2026.007` are not labels this scheme ever produces; rejecting
  // them keeps the increment total-ordered and the display canonical.
  if (sequence < 1) return null;
  if (match[2] !== String(sequence)) return null;

  return { sequence, year };
}

export function isValidVersionLabel(label: string): boolean {
  return parseVersionLabel(label) !== null;
}

// The next label after `existingLabels`, restarting the sequence in a new year.
// The year comes from the caller (server clock), never from a client.
export function nextVersionLabel(existingLabels: readonly string[], now: Date): string {
  const year = now.getFullYear();
  const sequences = existingLabels
    .map(parseVersionLabel)
    .filter((parsed): parsed is ParsedVersionLabel => parsed !== null)
    .filter((parsed) => parsed.year === year)
    .map((parsed) => parsed.sequence);

  // Labels of earlier years are irrelevant: a new year restarts at .1, which is
  // the point of the scheme.
  const next = sequences.length > 0 ? Math.max(...sequences) + 1 : 1;

  return `${year}.${next}`;
}

// Orders version labels the way the scheme means them, not the way strings sort:
// "2026.10" is newer than "2026.2", but sorts before it as text. Unparseable
// labels sort oldest so a legacy value can never win.
export function compareVersionLabels(left: string, right: string): number {
  const a = parseVersionLabel(left);
  const b = parseVersionLabel(right);
  if (!a && !b) return left.localeCompare(right);
  if (!a) return -1;
  if (!b) return 1;
  if (a.year !== b.year) return a.year - b.year;
  return a.sequence - b.sequence;
}

// The newest label of a set, or undefined when the set is empty.
export function latestVersionLabel(labels: readonly string[]): string | undefined {
  return [...labels].sort(compareVersionLabels).at(-1);
}
