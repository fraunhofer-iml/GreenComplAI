import type { DataElement, DataElementCollection, DppSnapshot } from "./index.js";

// Addressing individual elements of a passport (EN 18222 Table 19).
//
// The path is the same one diff, policy checks and the validation report
// already use: `elementId` for a top-level element, `collectionId/elementId`
// for one inside a collection. Introducing a second notation for this would
// be the kind of duplication that drifts apart later.

export type ElementLocation =
  | { element: DataElement; kind: "element"; collectionId?: string }
  | { collection: DataElementCollection; kind: "collection" };

// Splits a path. There is no more than one level: a collection contains
// elements, not collections. A path with two separators is therefore not a
// deeper path but an invalid one.
export function parseElementPath(
  path: string,
): { collectionId?: string; elementId: string } | undefined {
  const parts = path.split("/").filter((part) => part !== "");
  if (parts.length === 1 && parts[0]) return { elementId: parts[0] };
  if (parts.length === 2 && parts[0] && parts[1]) {
    return { collectionId: parts[0], elementId: parts[1] };
  }

  return undefined;
}

export function findCollection(
  snapshot: Pick<DppSnapshot, "collections">,
  collectionId: string,
): DataElementCollection | undefined {
  return snapshot.collections.find((collection) => collection.elementId === collectionId);
}

export function findElementByPath(
  snapshot: Pick<DppSnapshot, "collections" | "dataElements">,
  path: string,
): { collectionId?: string; element: DataElement } | undefined {
  const parsed = parseElementPath(path);
  if (!parsed) return undefined;

  if (parsed.collectionId === undefined) {
    const element = snapshot.dataElements.find(
      (candidate) => candidate.elementId === parsed.elementId,
    );
    return element ? { element } : undefined;
  }

  const collection = findCollection(snapshot, parsed.collectionId);
  const element = collection?.dataElements.find(
    (candidate) => candidate.elementId === parsed.elementId,
  );

  return element ? { collectionId: parsed.collectionId, element } : undefined;
}

// Replaces exactly one element, leaving the rest of the passport untouched.
// Returns `undefined` if the path points nowhere - this function never
// creates: `UpdateElement` updates, it does not add.
export function replaceElementAtPath(
  snapshot: DppSnapshot,
  path: string,
  next: DataElement,
): DppSnapshot | undefined {
  const parsed = parseElementPath(path);
  if (!parsed) return undefined;

  if (parsed.collectionId === undefined) {
    if (!snapshot.dataElements.some((e) => e.elementId === parsed.elementId)) {
      return undefined;
    }

    return {
      ...snapshot,
      dataElements: snapshot.dataElements.map((element) =>
        element.elementId === parsed.elementId ? next : element,
      ),
    };
  }

  const collection = findCollection(snapshot, parsed.collectionId);
  if (!collection?.dataElements.some((e) => e.elementId === parsed.elementId)) {
    return undefined;
  }

  return {
    ...snapshot,
    collections: snapshot.collections.map((candidate) =>
      candidate.elementId === parsed.collectionId
        ? {
            ...candidate,
            dataElements: candidate.dataElements.map((element) =>
              element.elementId === parsed.elementId ? next : element,
            ),
          }
        : candidate,
    ),
  };
}

export function replaceCollection(
  snapshot: DppSnapshot,
  collectionId: string,
  next: DataElementCollection,
): DppSnapshot | undefined {
  if (!findCollection(snapshot, collectionId)) return undefined;

  return {
    ...snapshot,
    collections: snapshot.collections.map((collection) =>
      collection.elementId === collectionId ? next : collection,
    ),
  };
}

// RFC 7396 JSON Merge Patch.
//
// The standard says only "partial DPP" for `UpdateDPP` and does not fix the
// semantics. RFC 7396 is the specification that applies to
// `application/merge-patch+json`, and it has a property worth knowing:
// **`null` deletes**. That is exactly where it differs from the internal
// semantics, which does a flat overlay and expects arrays to be replaced
// wholesale - there `null` is a value like any other.
//
// Running both semantics side by side is deliberate: the internal one belongs
// to the editor, which sends whole lists; the normative one belongs to the
// facade. Mixing them would mean guessing, for every request, what a `null`
// means.
//
// Arrays are **replaced**, not merged - RFC 7396 mandates this, and for data
// element lists it's also the only lossless choice: merging would need a key
// per entry that the format doesn't have.
export function applyMergePatch(target: unknown, patch: unknown): unknown {
  if (patch === null || typeof patch !== "object" || Array.isArray(patch)) {
    return patch;
  }

  const base: Record<string, unknown> =
    target && typeof target === "object" && !Array.isArray(target)
      ? { ...(target as Record<string, unknown>) }
      : {};

  for (const [key, value] of Object.entries(patch as Record<string, unknown>)) {
    if (value === null) delete base[key];
    else base[key] = applyMergePatch(base[key], value);
  }

  return base;
}
