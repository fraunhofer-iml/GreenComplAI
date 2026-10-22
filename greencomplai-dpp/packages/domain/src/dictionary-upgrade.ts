// A passport is pinned to one dictionary version (`dppSchemaVersion =
// "{repositoryKey}/{version}"`) so that the meaning and the required fields of a
// published passport cannot change because someone edited the dictionary later
// . The cost of that pinning is this step: moving a passport to a newer
// version is an explicit act, because it can pull in required fields that block
// publishing and it can orphan existing references.

export type UpgradeEntryLike = {
  canonicalUri?: string | null;
  entryKey: string;
  name?: unknown;
  required?: boolean | null;
  valueType: string;
};

export type DictionaryUpgradeDiff = {
  added: { entryKey: string; required: boolean; valueType: string }[];
  // Values in the passport are kept — deleting them would be data loss — but
  // they lose their dictionary reference.
  removed: { entryKey: string; usedByPassport: boolean }[];
  // Same entry, different value type: a stored value can become invalid without
  // the value itself changing.
  typeChanged: { entryKey: string; from: string; to: string }[];
  requiredMissing: string[];
};

// An element may reference an entry by either identifier.
function referencesOf(entry: UpgradeEntryLike): string[] {
  return [entry.entryKey, entry.canonicalUri].filter((reference): reference is string =>
    Boolean(reference),
  );
}

export function diffDictionaryVersions(
  current: UpgradeEntryLike[],
  next: UpgradeEntryLike[],
  // References the passport actually carries, taken from `dictionaryReference`
  // or, where that is absent, from the element id.
  passportReferences: string[],
): DictionaryUpgradeDiff {
  const carried = new Set(passportReferences);
  const currentKeys = new Set(current.map((entry) => entry.entryKey));
  const nextByKey = new Map(next.map((entry) => [entry.entryKey, entry]));

  const added = next
    .filter((entry) => !currentKeys.has(entry.entryKey))
    .map((entry) => ({
      entryKey: entry.entryKey,
      required: Boolean(entry.required),
      valueType: entry.valueType,
    }));

  const removed = current
    .filter((entry) => !nextByKey.has(entry.entryKey))
    .map((entry) => ({
      entryKey: entry.entryKey,
      usedByPassport: referencesOf(entry).some((reference) => carried.has(reference)),
    }));

  const typeChanged = current
    .map((entry) => ({ entry, target: nextByKey.get(entry.entryKey) }))
    .filter(
      (pair): pair is { entry: UpgradeEntryLike; target: UpgradeEntryLike } =>
        pair.target !== undefined && pair.target.valueType !== pair.entry.valueType,
    )
    .map((pair) => ({
      entryKey: pair.entry.entryKey,
      from: pair.entry.valueType,
      to: pair.target.valueType,
    }));

  // Not only the newly added required entries: one that was already required
  // and is still missing blocks publishing after the upgrade just as much, so
  // the preview has to list it too.
  const requiredMissing = next
    .filter((entry) => entry.required)
    .filter((entry) => !referencesOf(entry).some((reference) => carried.has(reference)))
    .map((entry) => entry.entryKey);

  return { added, removed, typeChanged, requiredMissing };
}

export function isEmptyUpgrade(diff: DictionaryUpgradeDiff): boolean {
  return (
    diff.added.length === 0 &&
    diff.removed.length === 0 &&
    diff.typeChanged.length === 0 &&
    diff.requiredMissing.length === 0
  );
}
