export function stripInternalDictionaryMetadata<T extends { metadata?: unknown }>(entry: T): T {
  if (!entry.metadata || typeof entry.metadata !== "object") {
    return entry;
  }

  const metadata = stripInternalMetadataKeys(entry.metadata as Record<string, unknown>);

  return {
    ...entry,
    metadata,
  };
}

export function stripInternalDictionaryMetadataList<T extends { metadata?: unknown }>(
  entries: T[],
) {
  return entries.map(stripInternalDictionaryMetadata);
}

function stripInternalMetadataKeys(value: Record<string, unknown>) {
  const metadata = Object.fromEntries(
    Object.entries(value).filter(([key]) => !isInternalMetadataKey(key)),
  );

  return Object.keys(metadata).length > 0 ? metadata : null;
}

function isInternalMetadataKey(key: string) {
  return ["display", "internalDisplay", "internalUi", "sort", "sortOrder", "ui"].includes(key);
}
