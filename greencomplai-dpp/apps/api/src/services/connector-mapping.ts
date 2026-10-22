import type { ExternalProduct } from "@dpp/connector-sdk";
import type { DataElement, DataElementCollection } from "@dpp/schemas";

// Where a connector's fields end up - and who decides that.
//
// This file has no knowledge of any specific connector module. It works on the
// SDK's normal form (`ExternalProduct`) and knows only three targets. A new
// module therefore brings no mapping logic of its own: it describes its
// fields, and the user decides here what happens to them - the same way for
// every module.
//
// Why this is a decision at all: a passport data element needs a
// `dictionaryReference`, a visibility, and a place in the structure. None of
// that is in the ERP. Guessing it would mean inventing passport content
// exactly where it becomes norm-relevant. So the platform asks once per
// record type and remembers the answer.

export type FieldTarget =
  // Do not import at all.
  | "ignore"
  // Keep as a provenance attribute on the product, without domain interpretation.
  | "attribute"
  // Import as a data element into the passport.
  | "element";

export type FieldDecision = {
  collectionElementId?: string | undefined;
  collectionName?: string | undefined;
  dictionaryReference?: string | undefined;
  elementId?: string | undefined;
  sourceField: string;
  target: FieldTarget;
  unit?: string | undefined;
  visibility: "public" | "controlled";
};

// A dictionary entry as a possible target - only as much of it as a decision needs.
export type MappingCandidate = {
  categoryId?: string | undefined;
  categoryLabel?: string | undefined;
  dictionaryReference: string;
  label: string;
  // The dictionary the entry belongs to. A candidate without it can be pointed
  // at but not placed: "the dictionary already describes this field" is only
  // true of one dictionary, and the draft wizard has to know which.
  repositoryKey: string;
  unit?: string | undefined;
  visibility: "public" | "controlled";
};

export type MappingSuggestion = MappingCandidate & {
  // How well the suggestion fits, between 0 and 1. It is part of the response
  // so a caller can decide for itself where to trust it - a threshold that
  // only existed here would be a guess about someone else's requirements.
  confidence: number;
};

export type FieldValue = string | number | boolean | null;

export type MappedField = FieldDecision & {
  label: string;
  value: FieldValue | FieldValue[];
  // Whether a decision has already been made for this field. The UI can use
  // this to highlight new fields - those are the ones someone needs to review.
  configured: boolean;
  // The most likely dictionary entry for this field. Only set for fields
  // without a decision yet; where one already exists, a suggestion would talk
  // past it.
  //
  // It is **never** applied automatically. A suggestion is a guess based on
  // name similarity, and a guess that writes itself in is exactly the kind of
  // invented passport content this whole intermediate step is meant to prevent.
  suggestion?: MappingSuggestion | undefined;
};

export type MappingPlan = {
  sourceType: { key: string; label: string };
  fields: MappedField[];
};

// Without a specified module, all records share one mapping.
export const DEFAULT_SOURCE_TYPE = { key: "", label: "Alle Datensätze" };

// A record's documents are represented as **one** field in the mapping, not one
// per file.
//
// The reason is the same as why the mapping is keyed by record type: a
// per-file decision would be worthless for the next record, which has
// different files. "This asset type's documents belong under entry X" is a
// statement that holds for the whole type.
//
// The key is reserved: a source system naming a field this way would collide
// with it - the double underscore makes that unlikely enough not to warrant a
// second structure.
export const DOCUMENTS_FIELD = "__documents";

// The default for a field that has never had a decision made about it.
//
// `attribute`, not `element`: writing a field without a dictionary entry into
// the passport would create a data element with no domain meaning. `ignore`
// is the alternative, but it discards data nobody asked to discard.
function defaultDecision(field: { key: string; unit?: string }): FieldDecision {
  return {
    sourceField: field.key,
    target: "attribute",
    unit: field.unit,
    visibility: "controlled",
  };
}

// Merges the stored decisions with the fields this record actually carries.
// The order is the source system's order - the one a user already knows the
// fields by.
export function buildMappingPlan(
  product: ExternalProduct,
  stored: readonly FieldDecision[],
  candidates: readonly MappingCandidate[] = [],
): MappingPlan {
  const byField = new Map(stored.map((decision) => [decision.sourceField, decision]));

  const fields: MappedField[] = product.attributes.map((attribute) => {
    const decision = byField.get(attribute.key);
    const unit = decision?.unit ?? attribute.unit;

    return {
      ...(decision ?? defaultDecision(attribute)),
      sourceField: attribute.key,
      label: attribute.label,
      value: attribute.value,
      // The source system's unit applies unless the mapping names its own: the
      // connector knows which unit it measures in.
      unit,
      configured: decision !== undefined,
      suggestion: decision
        ? undefined
        : suggestCandidate({ label: attribute.label, unit }, candidates),
    };
  });

  // The documents as one field, if the record has any. The value is their
  // listing - what a user needs to see to decide whether they belong in the
  // passport.
  if (product.documents.length > 0) {
    const decision = byField.get(DOCUMENTS_FIELD);

    fields.push({
      ...(decision ?? {
        sourceField: DOCUMENTS_FIELD,
        target: "attribute" as const,
        visibility: "controlled" as const,
      }),
      sourceField: DOCUMENTS_FIELD,
      label: `Dokumente (${product.documents.length})`,
      value: product.documents.map((document) => document.name),
      configured: decision !== undefined,
      // No suggestion: which dictionary entry a document belongs under has
      // nothing to do with name similarity.
      suggestion: undefined,
    });
  }

  return { sourceType: product.sourceType ?? DEFAULT_SOURCE_TYPE, fields };
}

// The most likely dictionary entry for a source field.
//
// The problem this solves: an asset type with forty extra fields means
// searching a list forty times. A suggestion that is right often enough turns
// that into forty confirmations - and where it is wrong, that is obvious at a
// glance because the field name and the suggestion sit side by side.
//
// Deliberately an explainable heuristic, not a model: name similarity plus
// unit. Anyone who can't follow the reasoning also can't reasonably disagree
// with it.
export function suggestCandidate(
  field: { label: string; unit?: string | undefined },
  candidates: readonly MappingCandidate[],
): MappingSuggestion | undefined {
  let best: MappingSuggestion | undefined;

  for (const candidate of candidates) {
    const confidence = score(field, candidate);
    if (confidence < SUGGESTION_THRESHOLD) continue;
    if (best && best.confidence >= confidence) continue;

    best = { ...candidate, confidence: Math.round(confidence * 100) / 100 };
  }

  return best;
}

// Below this threshold a suggestion is more noise than help: it draws
// attention to a false lead instead of leaving it on the field.
const SUGGESTION_THRESHOLD = 0.45;

function score(
  field: { label: string; unit?: string | undefined },
  candidate: MappingCandidate,
): number {
  const left = normalise(field.label);
  const right = normalise(candidate.label);
  if (left.length === 0 || right.length === 0) return 0;

  let base: number;
  if (left === right) {
    base = 1;
  } else if (left.includes(right) || right.includes(left)) {
    // Substring match, e.g. "Druck" in "Betriebsdruck". Weighted by the share
    // the shorter string makes up of the longer one - otherwise any short word
    // would match inside any long one.
    base =
      0.55 + 0.35 * (Math.min(left.length, right.length) / Math.max(left.length, right.length));
  } else {
    base = jaccard(tokens(left), tokens(right));
  }

  if (field.unit && candidate.unit) {
    // A matching unit is a strong signal; a differing one is a weak
    // counter-signal - the same quantity can be tracked in different units.
    base += normalise(field.unit) === normalise(candidate.unit) ? 0.15 : -0.1;
  }

  return Math.max(0, Math.min(1, base));
}

// Lowercased, umlauts spelled out, no separators. "Betriebs-Druck",
// "betriebsdruck" and "Betriebs Druck" are the same word, and a comparison
// that can't see that helps no one.
function normalise(value: string): string {
  return value
    .toLowerCase()
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

function tokens(value: string): Set<string> {
  // After normalising there are no separators left, so the string is split
  // into 3-grams: this finds similarity even where two systems compose the
  // same word differently.
  const grams = new Set<string>();
  for (let index = 0; index + 3 <= value.length; index += 1) {
    grams.add(value.slice(index, index + 3));
  }

  return grams.size > 0 ? grams : new Set([value]);
}

function jaccard(left: Set<string>, right: Set<string>): number {
  let shared = 0;
  for (const gram of left) if (right.has(gram)) shared += 1;

  const union = left.size + right.size - shared;

  return union === 0 ? 0 : shared / union;
}

// Applies the decisions from a request, but only for fields this record
// actually has. A caller submitting mappings for made-up fields does not get
// them stored - otherwise the table could be filled with arbitrary content
// via the import route.
export function reconcileDecisions(
  plan: MappingPlan,
  submitted: readonly FieldDecision[],
): MappedField[] {
  const known = new Map(plan.fields.map((field) => [field.sourceField, field]));

  const merged = submitted
    .filter((decision) => known.has(decision.sourceField))
    .map((decision) => {
      const field = known.get(decision.sourceField)!;

      return {
        ...decision,
        label: field.label,
        value: field.value,
        configured: true,
      };
    });

  const overridden = new Set(merged.map((field) => field.sourceField));

  return [...merged, ...plan.fields.filter((field) => !overridden.has(field.sourceField))];
}

export type AppliedMapping = {
  // What remains as provenance attributes on the product.
  attributes: { key: string; label: string; unit?: string; value: unknown }[];
  collections: DataElementCollection[];
  dataElements: DataElement[];
};

// Builds what is actually written from the decisions.
//
// Elements with a parent category collect into their collection, the rest
// stay at the top level - that is the structure the passport knows (EN 18223).
// A document whose bytes have already been stored. The mapping decides
// **whether** to download it; by this point that has already happened.
export type StoredDocument = {
  blobObjectId: string;
  collectionElementId?: string | undefined;
  collectionName?: string | undefined;
  contentType: string;
  dictionaryReference?: string | undefined;
  elementId: string;
  filename: string;
  visibility: "public" | "controlled";
};

export function applyMapping(
  fields: readonly MappedField[],
  documents: readonly StoredDocument[] = [],
): AppliedMapping {
  const attributes: AppliedMapping["attributes"] = [];
  const loose: DataElement[] = [];
  const collections = new Map<string, DataElementCollection>();

  for (const field of fields) {
    if (field.target === "ignore") continue;
    // Documents flow through `documents`: their bytes are already in blob
    // storage by this point, and their value here is only the listing the
    // preview showed.
    if (field.sourceField === DOCUMENTS_FIELD) {
      if (field.target === "attribute") {
        attributes.push({ key: field.sourceField, label: field.label, value: field.value });
      }
      continue;
    }

    if (field.target === "attribute") {
      attributes.push({
        key: field.sourceField,
        label: field.label,
        unit: field.unit,
        value: field.value,
      });
      continue;
    }

    // An element without a dictionary reference would be a field in the
    // passport that means nothing. Instead of creating it, it falls back to
    // a provenance attribute - the decision is incomplete, not wrong.
    if (!field.dictionaryReference) {
      attributes.push({
        key: field.sourceField,
        label: field.label,
        unit: field.unit,
        value: field.value,
      });
      continue;
    }

    place(elementFor(field), field);
  }

  // Documents come not from the attributes but from the record's own field -
  // and the platform only fetched their bytes once someone wanted them. They
  // carry the same kind of decision as an attribute, so they go through the
  // same placement logic here.
  for (const document of documents) {
    place(
      {
        elementId: document.elementId,
        dictionaryReference: document.dictionaryReference,
        name: { de: document.filename, en: document.filename },
        visibility: document.visibility,
        kind: "document",
        blobObjectId: document.blobObjectId,
        filename: document.filename,
        contentType: document.contentType,
      },
      document,
    );
  }

  function place(
    element: DataElement,
    at: {
      collectionElementId?: string | undefined;
      collectionName?: string | undefined;
      visibility: "public" | "controlled";
    },
  ) {
    if (!at.collectionElementId) {
      loose.push(element);
      return;
    }

    const existing = collections.get(at.collectionElementId);
    if (existing) {
      existing.dataElements.push(element);
      return;
    }

    collections.set(at.collectionElementId, {
      elementId: at.collectionElementId,
      name: {
        de: at.collectionName ?? at.collectionElementId,
        en: at.collectionName ?? at.collectionElementId,
      },
      // A collection is as visible as its first element. Making it public
      // while its content is controlled would be the more dangerous default.
      visibility: at.visibility,
      kind: "collection",
      dataElements: [element],
    });
  }

  return { attributes, collections: [...collections.values()], dataElements: loose };
}

// A list becomes a multi-value element, a scalar a single-value one. The
// decision is made on the value, not a setting: whether a field carries
// multiple values is known to the source system, not the user.
function elementFor(field: MappedField): DataElement {
  const elementId = field.elementId ?? elementIdFor(field.sourceField);
  const base = {
    elementId,
    dictionaryReference: field.dictionaryReference,
    name: { de: field.label, en: field.label },
    visibility: field.visibility,
  };

  if (!Array.isArray(field.value)) {
    return {
      ...base,
      kind: "single",
      value: field.value,
      valueDataType: valueDataType(field.value),
    };
  }

  return {
    ...base,
    kind: "multi",
    valueList: field.value.map((value, index) => ({
      // Each value needs its own identifier; position is the only thing that
      // distinguishes it in the source system.
      elementId: `${elementId}.${index + 1}`,
      dictionaryReference: field.dictionaryReference,
      value,
      // `valueDataType` is required on a list entry - a `null` in a list has
      // no derivable type and is treated as a string.
      valueDataType: valueDataType(value) ?? "string",
    })),
  };
}

// The element identifier in the passport. Derived from the source field name
// so it stays recognisable - some systems' generated keys are ugly but
// stable, and stability is what matters here.
function elementIdFor(sourceField: string): string {
  const cleaned = sourceField.replace(/[^a-zA-Z0-9_.-]/g, "-").replace(/^-+|-+$/g, "");

  return cleaned.length > 0 ? cleaned : "field";
}

function valueDataType(value: MappedField["value"]): string | undefined {
  if (typeof value === "number") return "number";
  if (typeof value === "boolean") return "boolean";
  if (typeof value === "string") return "string";

  return undefined;
}
