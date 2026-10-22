import type { ExternalAttribute, ExternalProduct } from "@dpp/connector-sdk";
import type { DataValueType, Visibility } from "@dpp/schemas";

import { DOCUMENTS_FIELD, type MappingPlan } from "./connector-mapping.js";

// A dictionary drafted from a record type.
//
// The mapping step assumes a dictionary already exists: it asks which entry a
// field follows. For the first import of a record type that assumption is
// wrong - there is nothing to point at, and every field falls back to
// `attribute`. Someone then has to leave, build a vocabulary by hand from the
// field list they just saw, and come back.
//
// The source system already carries what a dictionary entry needs. SIMPL
// keeps an asset type's custom fields as a JSON Schema: name, description,
// type, unit, and sometimes a closed value list. That is a vocabulary in a
// foreign notation, and translating a notation is not the same thing as
// inventing content.
//
// The line this keeps: nothing here writes. `buildDictionaryDraft` produces a
// **proposal** that is reviewed, edited and confirmed before a single row is
// created - and what gets confirmed is a dictionary, still not passport
// content. Whether a passport carries the field remains the mapping's
// decision, made afterwards, per field.

export type DictionaryDraftEntry = {
  allowedValues?: (string | number | boolean | null)[] | undefined;
  description?: string | undefined;
  entryKey: string;
  // What the platform already holds for this field, if anything - in whichever
  // dictionary of the tenant it was found. Reported instead of quietly
  // filtered out, because whether it is a reason to skip the entry depends on
  // where the entries are going: a second entry beside one that already
  // describes the field turns one vocabulary into two, but a field described
  // in *another* dictionary is not described in the one being written.
  existing?:
    | { confidence: number; dictionaryReference: string; label: string; repositoryKey: string }
    | undefined;
  // Whether the value type is the source system's statement or the platform's
  // reading of one value. A guess that says so can be corrected; one that
  // doesn't is indistinguishable from knowledge.
  inferredValueType: boolean;
  name: string;
  sourceField: string;
  unit?: string | undefined;
  valueType: DataValueType;
  visibility: Visibility;
};

export type DictionaryDraft = {
  entries: DictionaryDraftEntry[];
  repository: {
    name: string;
    namespaceUri: string;
    repositoryKey: string;
    version: string;
  };
};

export type DictionaryDraftOptions = {
  connectorKey: string;
  // The base every generated namespace URI hangs off. It carries the
  // organization, because the uniqueness of a namespace is global while a
  // record type's name is not: two tenants importing the same SIMPL asset type
  // would otherwise propose the same URI, and the second one would fail on the
  // unique index.
  namespaceBase: string;
  version: string;
};

export function buildDictionaryDraft(
  product: ExternalProduct,
  plan: MappingPlan,
  options: DictionaryDraftOptions,
): DictionaryDraft {
  const attributes = new Map(product.attributes.map((attribute) => [attribute.key, attribute]));
  const sourceTypeLabel = plan.sourceType.label;
  const repositoryKey = slug(`${options.connectorKey}-${sourceTypeLabel}`);

  const taken = new Set<string>();
  const entries: DictionaryDraftEntry[] = [];

  for (const field of plan.fields) {
    // A field already pointing at an entry has its answer; a field nobody
    // wants imported does not need a vocabulary either.
    if (field.dictionaryReference || field.target === "ignore") continue;

    const attribute = attributes.get(field.sourceField);
    const resolved = resolveValueType(field.sourceField, attribute, field.value);
    // The documents field's label says how many files *this* record carries.
    // That is a property of the record, not of the field: an entry called
    // "Dokumente (2)" is already wrong for the next asset, and it would key
    // differently besides - a dictionary with `dokumente-2` and `dokumente-5`
    // in it describes nothing.
    const name = field.sourceField === DOCUMENTS_FIELD ? "Dokumente" : field.label;

    entries.push({
      allowedValues: attribute?.allowedValues,
      description: attribute?.description,
      entryKey: uniqueKey(name, field.sourceField, taken),
      existing: field.suggestion
        ? {
            confidence: field.suggestion.confidence,
            dictionaryReference: field.suggestion.dictionaryReference,
            label: field.suggestion.label,
            // Which dictionary holds it. Reported rather than reduced to a
            // boolean here: whether it is a reason to skip the entry depends on
            // the dictionary the entries are headed for, and that is chosen
            // later.
            repositoryKey: field.suggestion.repositoryKey,
          }
        : undefined,
      inferredValueType: resolved.inferred,
      name,
      sourceField: field.sourceField,
      unit: field.unit,
      valueType: resolved.valueType,
      // `controlled`, like everywhere else a visibility is defaulted: what is
      // public is a disclosure decision, and defaulting it to `public` would
      // make that decision for someone by not asking them.
      visibility: "controlled",
    });
  }

  return {
    entries,
    repository: {
      name: `${sourceTypeLabel} (${options.connectorKey.toUpperCase()})`,
      namespaceUri: `${trimSlash(options.namespaceBase)}/${repositoryKey}/${options.version}/`,
      repositoryKey,
      version: options.version,
    },
  };
}

// The value type of an entry: what the source system says, or - where it says
// nothing - what this one value looks like.
//
// The fallback is a guess and is marked as one. It is still worth making: a
// draft where every field is `string` is a draft someone has to correct forty
// times, and correcting a wrong guess is the same amount of work as filling an
// empty one.
function resolveValueType(
  sourceField: string,
  attribute: ExternalAttribute | undefined,
  value: unknown,
): { inferred: boolean; valueType: DataValueType } {
  // The documents field is not an attribute and never was: it stands for the
  // record's files.
  if (sourceField === DOCUMENTS_FIELD) return { inferred: false, valueType: "document" };

  if (attribute?.valueType) return { inferred: false, valueType: attribute.valueType };

  // A list is several values of one type, not a type of its own - so the
  // question is what the entries look like, not that there are several.
  const sample = Array.isArray(value) ? value.find((entry) => entry !== null) : value;

  if (typeof sample === "number") return { inferred: true, valueType: "number" };
  if (typeof sample === "boolean") return { inferred: true, valueType: "boolean" };

  return { inferred: true, valueType: "string" };
}

// An entry key from the field's name, unique within the draft. The name is
// what someone recognizes the entry by later; the source field is the fallback
// where a name yields nothing usable (a label of only punctuation, say).
function uniqueKey(label: string, sourceField: string, taken: Set<string>): string {
  const base = slug(label) || slug(sourceField) || "feld";

  let key = base;
  for (let suffix = 2; taken.has(key); suffix += 1) key = `${base}-${suffix}`;
  taken.add(key);

  return key;
}

function slug(value: string): string {
  return value
    .toLowerCase()
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
    .replace(/-+$/g, "");
}

function trimSlash(value: string): string {
  return value.replace(/\/+$/, "");
}
