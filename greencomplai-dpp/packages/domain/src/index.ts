export * from "./version-label.js";
export * from "./public-id.js";

export const dppStatuses = ["draft", "review", "published", "archived"] as const;
export type DppStatus = (typeof dppStatuses)[number];

export const organizationRoles = ["admin", "editor", "viewer", "authority"] as const;
export type OrganizationRole = (typeof organizationRoles)[number];

export const visibilityLevels = ["public", "controlled"] as const;
export type VisibilityLevel = (typeof visibilityLevels)[number];

export const dppRelationshipTypes = [
  "contains",
  "isComponentOf",
  "replaces",
  "isVariantOf",
  "derivedFrom",
  "hasPackaging",
  "hasSparePart",
] as const;
export type DppRelationshipType = (typeof dppRelationshipTypes)[number];

export const productLifecycleStatuses = ["concept", "active", "endOfLife", "recalled"] as const;
export type ProductLifecycleStatus = (typeof productLifecycleStatuses)[number];

export const productIdentifierTypes = [
  "gtin",
  "serialNumber",
  "batch",
  "model",
  "sku",
  "other",
] as const;
export type ProductIdentifierType = (typeof productIdentifierTypes)[number];

export const economicOperatorRoles = [
  "manufacturer",
  "importer",
  "distributor",
  "authorizedRepresentative",
  "serviceProvider",
  "recycler",
  "authority",
] as const;
export type EconomicOperatorRole = (typeof economicOperatorRoles)[number];

export const dataValueTypes = [
  "string",
  "number",
  "boolean",
  "date",
  "datetime",
  "enum",
  "object",
  "array",
  "document",
] as const;
export type DataValueType = (typeof dataValueTypes)[number];

export type ElementPolicy = {
  readRoles: OrganizationRole[];
  writeRoles: OrganizationRole[];
};

export type DppCore = {
  digitalProductPassportId: string;
  productId: string;
  granularity: string;
  dppSchemaVersion: string;
  status: DppStatus;
  lastUpdate: string;
  economicOperatorId: string;
  facilityId?: string | undefined;
};

export type TranslatableString = Record<string, string>;

export type BaseDataElement = {
  elementId: string;
  dictionaryReference?: string | undefined;
  name?: TranslatableString | undefined;
  visibility: VisibilityLevel;
  policy?: ElementPolicy | undefined;
  publicEligible?: boolean | undefined;
};

export type SinglevaluedDataElement = BaseDataElement & {
  kind: "single";
  value: unknown;
  valueDataType?: string | undefined;
  language?: string | undefined;
};

export type ValueElement = {
  elementId: string;
  dictionaryReference?: string | undefined;
  name?: TranslatableString | undefined;
  value: unknown;
  valueDataType: string;
  language?: string | undefined;
};

export type MultivaluedDataElement = BaseDataElement & {
  kind: "multi";
  valueList: ValueElement[];
};

export type DocumentDataElement = BaseDataElement & {
  kind: "document";
  blobObjectId: string;
  filename: string;
  contentType: string;
};

export type DataElement = SinglevaluedDataElement | MultivaluedDataElement | DocumentDataElement;

export type DataElementCollection = BaseDataElement & {
  kind: "collection";
  dataElements: DataElement[];
};

export type DppSnapshot = DppCore & {
  collections: DataElementCollection[];
  dataElements: DataElement[];
};

export type DppRelationship = {
  id: string;
  sourceDigitalProductPassportId: string;
  targetDigitalProductPassportId: string;
  targetProductId?: string | undefined;
  relationshipType: DppRelationshipType;
  visibility: VisibilityLevel;
  validFrom: string;
  validTo?: string | undefined;
  metadata?: Record<string, unknown> | undefined;
};

export type Product = {
  id: string;
  organizationId: string;
  productId: string;
  name: TranslatableString;
  category?: string | undefined;
  manufacturerProductId?: string | undefined;
  lifecycleStatus: ProductLifecycleStatus;
  identifiers?: Partial<Record<ProductIdentifierType, string>> | undefined;
  metadata?: Record<string, unknown> | undefined;
};

export type EconomicOperator = {
  id: string;
  organizationId: string;
  operatorId: string;
  legalName: string;
  roles: EconomicOperatorRole[];
  countryCode?: string | undefined;
  vatId?: string | undefined;
  address?: Record<string, unknown> | undefined;
};

export type DataDictionaryEntry = {
  id: string;
  organizationId: string;
  repositoryId?: string | undefined;
  entryKey: string;
  externalId?: string | undefined;
  canonicalUri?: string | undefined;
  version?: string | undefined;
  name: TranslatableString;
  valueType: DataValueType;
  unit?: string | undefined;
  required: boolean;
  visibility: VisibilityLevel;
  standardReference?: string | undefined;
  allowedValues?: unknown[] | undefined;
  validationRules?: Record<string, unknown> | undefined;
};

export type DataDictionaryRepository = {
  id: string;
  organizationId: string;
  repositoryKey: string;
  name: TranslatableString;
  namespaceUri: string;
  version: string;
  publisher?: string | undefined;
  status: "draft" | "active" | "retired";
  metadata?: Record<string, unknown> | undefined;
};

export type AuditEventType =
  | "dpp.created"
  | "dpp.read"
  | "dpp.updated"
  | "dpp.submitted_for_review"
  | "dpp.returned_to_draft"
  | "dpp.revision_created"
  | "dpp.published"
  | "dpp.archived"
  | "dpp.deleted"
  | "dpp.relationship.created"
  | "dpp.relationship.deleted"
  | "organization.member_invited"
  | "organization.member_updated"
  | "service_account.created"
  | "service_account.updated"
  | "api_key.created"
  | "api_key.revoked";

// prEN 18222: every response carries a Result with typed messages.
// `Exception` is for failures the server did not anticipate (an unhandled
// throw); `Error` is for the ones it did (validation, authorization, conflicts).
// Keeping them apart lets a caller tell "you sent something wrong" from
// "we broke", which is the difference between retrying and not.
export type ResultMessageType = "Info" | "Warning" | "Error" | "Exception";

export type ResultMessage = {
  messageType: ResultMessageType;
  text: string;
  code?: string | undefined;
  correlationId?: string | undefined;
  timestamp?: string | undefined;
  // Dotted path of the offending field, for validation messages. Lets a client
  // put the message next to the input that caused it instead of showing a
  // page-level "something was wrong".
  path?: string | undefined;
};

export type Result = {
  messages: ResultMessage[];
};

// A dictionary entry as needed for validation; matches both the DB row shape
// (nullable columns) and the DataDictionaryEntry domain type.
export type DictionaryEntryLike = {
  canonicalUri?: string | null | undefined;
  entryKey: string;
  externalId?: string | null | undefined;
  valueType: DataValueType;
  required: boolean;
  allowedValues?: unknown;
  validationRules?: unknown;
};

export type DppValidationError = {
  elementId: string;
  reference: string;
  message: string;
};

// Validates a DPP snapshot against the resolvable data dictionary entries:
// value type, required presence, allowed values and basic validation rules.
// Elements whose dictionaryReference does not resolve to a known local entry
// are skipped (the reference may point to an external repository).
export function validateSnapshotAgainstDictionary(
  snapshot: Pick<DppSnapshot, "collections" | "dataElements">,
  entries: DictionaryEntryLike[],
): DppValidationError[] {
  const byReference = new Map<string, DictionaryEntryLike>();
  for (const entry of entries) {
    for (const reference of [entry.canonicalUri, entry.entryKey, entry.externalId]) {
      if (reference) byReference.set(reference, entry);
    }
  }

  const errors: DppValidationError[] = [];
  const fail = (elementId: string, reference: string, message: string) =>
    errors.push({ elementId, reference, message });

  const checkValue = (
    elementId: string,
    reference: string,
    entry: DictionaryEntryLike,
    value: unknown,
  ) => {
    const typeError = valueTypeMismatch(value, entry.valueType);
    if (typeError) fail(elementId, reference, typeError);

    const allowed = entry.allowedValues;
    if (Array.isArray(allowed) && allowed.length > 0 && !allowed.includes(value)) {
      fail(elementId, reference, `value is not one of the allowed values`);
    }

    const ruleError = validationRuleMismatch(value, entry.validationRules);
    if (ruleError) fail(elementId, reference, ruleError);
  };

  const checkElement = (element: DataElement) => {
    const reference = element.dictionaryReference;
    if (!reference) return;
    const entry = byReference.get(reference);
    if (!entry) return;

    if (element.kind === "document") {
      if (entry.valueType !== "document") {
        fail(element.elementId, reference, `entry expects ${entry.valueType}, not a document`);
      }
      if (entry.required && !element.blobObjectId) {
        fail(element.elementId, reference, `required document is missing`);
      }
      return;
    }

    if (element.kind === "multi") {
      if (entry.required && element.valueList.length === 0) {
        fail(element.elementId, reference, `required data element has no values`);
      }
      for (const valueElement of element.valueList) {
        checkValue(element.elementId, reference, entry, valueElement.value);
      }
      return;
    }

    // single
    if (
      entry.required &&
      (element.value === null || element.value === undefined || element.value === "")
    ) {
      fail(element.elementId, reference, `required data element has no value`);
      return;
    }
    if (element.value !== null && element.value !== undefined) {
      checkValue(element.elementId, reference, entry, element.value);
    }
  };

  for (const collection of snapshot.collections) {
    collection.dataElements.forEach(checkElement);
  }
  snapshot.dataElements.forEach(checkElement);

  return errors;
}

export type ValidationSeverity = "error" | "warning";

export type ValidationIssue = {
  path: string;
  code: string;
  message: string;
  severity: ValidationSeverity;
};

export type ValidationReport = {
  valid: boolean;
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
};

// Hard completeness/consistency check used before publishing (prEN 18223, 4.2 /
// G4). Unlike validateSnapshotAgainstDictionary this also flags MISSING required
// datapoints, unknown references, duplicate element paths, empty core fields and
// controlled elements without an access policy. `entries` MUST be scoped to the
// DPP's linked dictionary repository so the required-datapoint check is correct.
export function validateSnapshotForPublish(
  snapshot: DppSnapshot,
  entries: DictionaryEntryLike[],
  options: {
    // Whether `dppSchemaVersion` actually names a dictionary version the tenant
    // holds. An empty `entries` is ambiguous on its own - an empty dictionary
    // and a binding pointing nowhere look the same - and the two deserve
    // different messages. Defaults to true: a caller that says nothing is
    // taken to have passed the bound dictionary's entries.
    bindingResolved?: boolean;
  } = {},
): ValidationReport {
  const bindingResolved = options.bindingResolved !== false;
  const issues: ValidationIssue[] = [];
  const error = (path: string, code: string, message: string) =>
    issues.push({ path, code, message, severity: "error" });
  const warn = (path: string, code: string, message: string) =>
    issues.push({ path, code, message, severity: "warning" });

  const coreFields: Array<[keyof DppCore, string]> = [
    ["productId", "Produkt-ID"],
    ["granularity", "Granularität"],
    ["dppSchemaVersion", "Schema-Version"],
    ["economicOperatorId", "Economic Operator"],
  ];
  for (const [field, label] of coreFields) {
    const value = snapshot[field];
    if (value === undefined || value === null || String(value).trim() === "") {
      error(field, "core-field-missing", `${label} fehlt`);
    }
  }

  // A binding naming no dictionary the tenant holds resolves to no entries, and
  // a passport validated against no entries passes everything. Reported once,
  // where the cause is - on the binding.
  if (!bindingResolved) {
    error(
      "dppSchemaVersion",
      "unresolved-binding",
      `Die Bindung „${snapshot.dppSchemaVersion}" nennt kein Wörterbuch dieser Organisation`,
    );
  }

  const byReference = new Map<string, DictionaryEntryLike>();
  for (const entry of entries) {
    for (const reference of [entry.canonicalUri, entry.entryKey, entry.externalId]) {
      if (reference) byReference.set(reference, entry);
    }
  }

  const seenPaths = new Set<string>();
  const presentEntryKeys = new Set<string>();

  const checkValue = (path: string, entry: DictionaryEntryLike, value: unknown) => {
    const typeError = valueTypeMismatch(value, entry.valueType);
    if (typeError) error(path, "type-mismatch", typeError);
    const allowed = entry.allowedValues;
    if (Array.isArray(allowed) && allowed.length > 0 && !allowed.includes(value)) {
      error(path, "value-not-allowed", "Wert ist nicht in den erlaubten Werten");
    }
    const ruleError = validationRuleMismatch(value, entry.validationRules);
    if (ruleError) error(path, "rule-mismatch", ruleError);
  };

  const visit = (element: DataElement, path: string) => {
    if (seenPaths.has(path)) error(path, "duplicate-path", `Doppelter Elementpfad ${path}`);
    else seenPaths.add(path);

    if (element.visibility === "controlled" && !element.policy) {
      warn(path, "missing-policy", "Kontrolliertes Element ohne Zugriffs-Policy");
    }

    const reference = element.dictionaryReference;
    if (!reference) return;
    const entry = byReference.get(reference);
    if (!entry) {
      // An error, not a warning. An element whose reference the bound dictionary
      // does not hold is not checked at all - not its type, not its allowed
      // values, not its rules - and publishing it would state as verified what
      // was never looked at. A warning left that decision to whoever read the
      // report, and the report is not where the guarantee lives.
      //
      // Silent while the binding itself is broken: every element would report
      // the same fact, and the one error that names the cause would be the
      // hardest to find among them.
      if (bindingResolved) {
        error(path, "unknown-reference", `Referenz „${reference}" nicht im Dictionary aufgelöst`);
      }
      return;
    }
    presentEntryKeys.add(entry.entryKey);

    if (element.kind === "document") {
      if (entry.valueType !== "document") {
        error(path, "type-mismatch", `Eintrag erwartet ${entry.valueType}, kein Dokument`);
      }
      if (entry.required && !element.blobObjectId) {
        error(path, "required-empty", "Pflicht-Dokument fehlt");
      }
      return;
    }
    if (element.kind === "multi") {
      if (entry.required && element.valueList.length === 0) {
        error(path, "required-empty", "Pflicht-Element ohne Werte");
      }
      for (const valueElement of element.valueList) checkValue(path, entry, valueElement.value);
      return;
    }
    if (
      entry.required &&
      (element.value === null || element.value === undefined || element.value === "")
    ) {
      error(path, "required-empty", "Pflicht-Element ohne Wert");
    } else if (element.value !== null && element.value !== undefined) {
      checkValue(path, entry, element.value);
    }
  };

  for (const collection of snapshot.collections) {
    if (seenPaths.has(collection.elementId)) {
      error(collection.elementId, "duplicate-path", `Doppelter Pfad ${collection.elementId}`);
    } else {
      seenPaths.add(collection.elementId);
    }
    for (const element of collection.dataElements) {
      visit(element, `${collection.elementId}/${element.elementId}`);
    }
  }
  for (const element of snapshot.dataElements) visit(element, element.elementId);

  for (const entry of entries) {
    if (entry.required && !presentEntryKeys.has(entry.entryKey)) {
      error(
        `dictionary:${entry.entryKey}`,
        "required-missing",
        `Pflicht-Datenpunkt „${entry.entryKey}" fehlt`,
      );
    }
  }

  const errors = issues.filter((issue) => issue.severity === "error");
  const warnings = issues.filter((issue) => issue.severity === "warning");
  return { valid: errors.length === 0, errors, warnings };
}

function valueTypeMismatch(value: unknown, valueType: DataValueType): string | null {
  switch (valueType) {
    case "string":
    case "enum":
      return typeof value === "string" ? null : `expected ${valueType} value`;
    case "number":
      return typeof value === "number" && Number.isFinite(value) ? null : `expected number value`;
    case "boolean":
      return typeof value === "boolean" ? null : `expected boolean value`;
    case "date":
    case "datetime":
      return typeof value === "string" && !Number.isNaN(Date.parse(value))
        ? null
        : `expected ${valueType} value`;
    case "object":
      return value !== null && typeof value === "object" && !Array.isArray(value)
        ? null
        : `expected object value`;
    case "array":
      return Array.isArray(value) ? null : `expected array value`;
    case "document":
      return null;
    default:
      return null;
  }
}

function validationRuleMismatch(value: unknown, rulesValue: unknown): string | null {
  if (!rulesValue || typeof rulesValue !== "object") return null;
  const rules = rulesValue as Record<string, unknown>;

  if (typeof value === "string") {
    if (typeof rules.minLength === "number" && value.length < rules.minLength) {
      return `value is shorter than minLength ${rules.minLength}`;
    }
    if (typeof rules.maxLength === "number" && value.length > rules.maxLength) {
      return `value is longer than maxLength ${rules.maxLength}`;
    }
    if (typeof rules.pattern === "string" && !new RegExp(rules.pattern).test(value)) {
      return `value does not match pattern ${rules.pattern}`;
    }
  }

  if (typeof value === "number") {
    const min = typeof rules.minimum === "number" ? rules.minimum : rules.min;
    const max = typeof rules.maximum === "number" ? rules.maximum : rules.max;
    if (typeof min === "number" && value < min) return `value is below minimum ${min}`;
    if (typeof max === "number" && value > max) return `value is above maximum ${max}`;
  }

  return null;
}

export function canTransitionDppStatus(from: DppStatus, to: DppStatus): boolean {
  if (from === to) return true;

  const allowed: Record<DppStatus, DppStatus[]> = {
    draft: ["review", "archived"],
    review: ["draft", "published", "archived"],
    published: ["archived"],
    archived: [],
  };

  return allowed[from].includes(to);
}

export function isPubliclyVisible(element: BaseDataElement): boolean {
  return element.visibility === "public" && element.publicEligible !== false;
}

// Org admins have full element-level access (the emergency/owner override).
// For every other role an explicit policy grants access to the listed roles;
// without a matching policy, `public` elements stay accessible but `controlled`
// elements are fail-closed, i.e. reachable only through the admin override
// (prEN 18239 5.2 no. 24/25).
export function canRoleReadElement(element: BaseDataElement, role: OrganizationRole): boolean {
  if (role === "admin") return true;
  const readRoles = element.policy?.readRoles;
  if (readRoles && readRoles.length > 0) return readRoles.includes(role);
  return element.visibility === "public";
}

export function canRoleWriteElement(element: BaseDataElement, role: OrganizationRole): boolean {
  if (role === "admin") return true;
  const writeRoles = element.policy?.writeRoles;
  if (writeRoles && writeRoles.length > 0) return writeRoles.includes(role);
  return element.visibility === "public";
}

// Drops collections and data elements the role may not read, recursing into
// collection members. Used to enforce per-element read policy (prEN 18239).
export function filterSnapshotForRole(snapshot: DppSnapshot, role: OrganizationRole): DppSnapshot {
  if (role === "admin") return snapshot;

  const collections = snapshot.collections
    .filter((collection) => canRoleReadElement(collection, role))
    .map((collection) => ({
      ...collection,
      dataElements: collection.dataElements.filter((element) => canRoleReadElement(element, role)),
    }));

  return {
    ...snapshot,
    collections,
    dataElements: snapshot.dataElements.filter((element) => canRoleReadElement(element, role)),
  };
}

export type DppFieldDiff = {
  // Absolute path: `elementId` for a top-level element/core field,
  // `collectionId/elementId` for a collection member.
  path: string;
  label: string;
  oldValue: string | null;
  newValue: string | null;
  kind: "added" | "removed" | "changed";
};

function elementDisplayValue(element: DataElement): string {
  if (element.kind === "document") return element.filename;
  if (element.kind === "multi") {
    return element.valueList.map((entry) => String(entry.value)).join(", ");
  }
  const value = element.value;
  if (value === null || value === undefined) return "";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function elementDisplayLabel(element: BaseDataElement): string {
  return element.name?.de ?? element.name?.en ?? element.elementId;
}

// Flattens a snapshot's data elements into path -> { label, value }, recursing
// into collections (path `collectionId/elementId`).
function flattenSnapshotElements(
  snapshot: Pick<DppSnapshot, "collections" | "dataElements">,
): Map<string, { label: string; value: string }> {
  const flat = new Map<string, { label: string; value: string }>();
  for (const element of snapshot.dataElements) {
    flat.set(element.elementId, {
      label: elementDisplayLabel(element),
      value: elementDisplayValue(element),
    });
  }
  for (const collection of snapshot.collections) {
    const collectionLabel = elementDisplayLabel(collection);
    for (const element of collection.dataElements) {
      flat.set(`${collection.elementId}/${element.elementId}`, {
        label: `${collectionLabel} · ${elementDisplayLabel(element)}`,
        value: elementDisplayValue(element),
      });
    }
  }
  return flat;
}

const diffableCoreFields: Array<[keyof DppCore, string]> = [
  ["productId", "Produkt-ID"],
  ["granularity", "Granularität"],
  ["dppSchemaVersion", "Schema"],
  ["economicOperatorId", "Operator"],
  ["facilityId", "Facility"],
];

// Computes the field-level diff between two DPP snapshots (previous -> next):
// changed core fields plus added/removed/changed data elements by path. The
// caller should pass role-filtered snapshots so unreadable controlled elements
// never surface in a diff.
export function diffDppSnapshots(previous: DppSnapshot, next: DppSnapshot): DppFieldDiff[] {
  const diffs: DppFieldDiff[] = [];

  for (const [field, label] of diffableCoreFields) {
    const oldValue = previous[field] === undefined ? null : String(previous[field] ?? "");
    const newValue = next[field] === undefined ? null : String(next[field] ?? "");
    if (oldValue !== newValue) {
      diffs.push({ path: field, label, oldValue, newValue, kind: "changed" });
    }
  }

  const before = flattenSnapshotElements(previous);
  const after = flattenSnapshotElements(next);
  for (const path of new Set([...before.keys(), ...after.keys()])) {
    const prev = before.get(path);
    const now = after.get(path);
    if (prev && now) {
      if (prev.value !== now.value) {
        diffs.push({
          path,
          label: now.label,
          oldValue: prev.value,
          newValue: now.value,
          kind: "changed",
        });
      }
    } else if (now) {
      diffs.push({ path, label: now.label, oldValue: null, newValue: now.value, kind: "added" });
    } else if (prev) {
      diffs.push({
        path,
        label: prev.label,
        oldValue: prev.value,
        newValue: null,
        kind: "removed",
      });
    }
  }

  return diffs;
}

// Returns the elementIds the role is not allowed to write within the given
// elements, recursing into collections. Empty array means the write is
// permitted. Accepts a partial snapshot so it works for both create and patch.
export function findWriteViolations(
  elements: Pick<DppSnapshot, "collections" | "dataElements">,
  role: OrganizationRole,
): string[] {
  if (role === "admin") return [];

  const violations: string[] = [];
  const check = (element: BaseDataElement) => {
    if (!canRoleWriteElement(element, role)) violations.push(element.elementId);
  };

  for (const collection of elements.collections ?? []) {
    check(collection);
    collection.dataElements.forEach(check);
  }
  (elements.dataElements ?? []).forEach(check);

  return violations;
}

export type ElementSecurityViolation = {
  // Absolute path of the offending element: `elementId` for a top-level element
  // or collection, `collectionId/elementId` for a collection member.
  path: string;
  elementId: string;
  reason: "write-forbidden" | "policy-change-forbidden";
};

type ElementSecurityFields = Pick<BaseDataElement, "visibility" | "publicEligible" | "policy">;

function normalizeRoles(roles: OrganizationRole[] | undefined): string {
  return [...(roles ?? [])].sort().join(",");
}

// Canonical signature of the fields that govern who may see/change an element.
// Two elements with the same signature expose the same data to the same roles,
// so a differing signature marks a policy/visibility change.
function elementSecuritySignature(element: ElementSecurityFields): string {
  const read = normalizeRoles(element.policy?.readRoles);
  const write = normalizeRoles(element.policy?.writeRoles);
  return `${element.visibility}|${element.publicEligible !== false}|r:${read}|w:${write}`;
}

// Order-independent, undefined-insensitive serialization so that echoing an
// element back (possibly re-serialized with different key order) is not
// mistaken for a content change.
function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === "object") {
    const source = value as Record<string, unknown>;
    const result: Record<string, unknown> = {};
    for (const key of Object.keys(source).sort()) {
      if (source[key] !== undefined) result[key] = canonicalize(source[key]);
    }
    return result;
  }
  return value;
}

function elementContentSignature(element: BaseDataElement): string {
  // A collection's own change is independent of its members: each member is
  // walked and compared under its own path, so exclude the nested array here to
  // avoid attributing a child edit to the parent collection.
  const { dataElements: _members, ...own } = element as Record<string, unknown>;
  return JSON.stringify(canonicalize(own));
}

function walkPolicyElements(
  source: Pick<DppSnapshot, "collections" | "dataElements">,
  visit: (path: string, element: BaseDataElement) => void,
): void {
  for (const collection of source.collections ?? []) {
    visit(collection.elementId, collection);
    for (const child of collection.dataElements) {
      visit(`${collection.elementId}/${child.elementId}`, child);
    }
  }
  for (const element of source.dataElements ?? []) {
    visit(element.elementId, element);
  }
}

// Authorizes a patch at element granularity by comparing the resulting snapshot
// against the STORED one (prEN 18239 5.2 no. 24/25):
//   - changing an element's value/content requires write permission on the
//     stored policy, so relaxing the policy in the same patch cannot unlock the
//     write (the patch-bypass this closes);
//   - changing an element's visibility or read/write policy is reserved for
//     admins (policy managers).
// Admins bypass both checks. Elements that are unchanged are ignored, so
// re-submitting a read-filtered snapshot is not treated as a write. Note this
// does not police element *removal* by omission, which is governed by the patch
// merge semantics (see the RFC-7396 partial-update work).
// Merges an incoming patch with the stored snapshot from the perspective of a
// single role. A client only ever sees what `filterSnapshotForRole` showed it
// and sends exactly that back on save, so an element the role may not read is
// missing from *every* patch it sends - not because it wants it deleted, but
// because it never knew the element existed. Replacing the lists outright
// would therefore let an ordinary editor save wipe out controlled elements it
// could never see, with no error and a 200 status.
//
// The rule is split accordingly:
//   * an invisible element is preserved - its absence carries no meaning;
//   * a visible element that is missing counts as a deletion, and a deletion
//     is a write - permitted for whoever may write the element, not otherwise.
//     This means deleting needs no separate right beyond `writeRoles`.
export function reconcilePatchForRole(
  stored: DppSnapshot,
  patched: DppSnapshot,
  role: OrganizationRole,
): { removedPaths: string[]; snapshot: DppSnapshot } {
  if (role === "admin") {
    // The admin sees everything, so their patch is complete - anything
    // missing was deliberately removed.
    return { removedPaths: removedVisiblePaths(stored, patched, role), snapshot: patched };
  }

  const patchedElementIds = new Set(patched.dataElements.map((element) => element.elementId));
  const hiddenTopLevel = stored.dataElements.filter(
    (element) => !canRoleReadElement(element, role) && !patchedElementIds.has(element.elementId),
  );

  const patchedCollections = new Map(
    patched.collections.map((collection) => [collection.elementId, collection]),
  );
  const collections = stored.collections.flatMap((storedCollection) => {
    const fromPatch = patchedCollections.get(storedCollection.elementId);

    // An invisible collection is left untouched.
    if (!canRoleReadElement(storedCollection, role)) {
      return fromPatch ? [fromPatch] : [storedCollection];
    }
    if (!fromPatch) return [];

    const patchedChildIds = new Set(fromPatch.dataElements.map((child) => child.elementId));
    const hiddenChildren = storedCollection.dataElements.filter(
      (child) => !canRoleReadElement(child, role) && !patchedChildIds.has(child.elementId),
    );

    return [{ ...fromPatch, dataElements: [...fromPatch.dataElements, ...hiddenChildren] }];
  });

  // Collections the patch introduces are appended.
  const storedCollectionIds = new Set(stored.collections.map((collection) => collection.elementId));
  const addedCollections = patched.collections.filter(
    (collection) => !storedCollectionIds.has(collection.elementId),
  );

  const snapshot: DppSnapshot = {
    ...patched,
    collections: [...collections, ...addedCollections],
    dataElements: [...patched.dataElements, ...hiddenTopLevel],
  };

  return { removedPaths: removedVisiblePaths(stored, snapshot, role), snapshot };
}

// Paths that were visible in the stored snapshot but are missing from the
// result - i.e. actually removed, not merely never visible.
function removedVisiblePaths(
  stored: DppSnapshot,
  next: Pick<DppSnapshot, "collections" | "dataElements">,
  role: OrganizationRole,
): string[] {
  const remaining = new Set<string>();
  walkPolicyElements(next, (path) => remaining.add(path));

  const removed: string[] = [];
  walkPolicyElements(stored, (path, element) => {
    if (remaining.has(path)) return;
    if (role !== "admin" && !canRoleReadElement(element, role)) return;
    removed.push(path);
  });

  return removed;
}

export function findElementSecurityViolations(
  storedSnapshot: Pick<DppSnapshot, "collections" | "dataElements">,
  nextSnapshot: Pick<DppSnapshot, "collections" | "dataElements">,
  role: OrganizationRole,
  removedPaths?: string[],
): ElementSecurityViolation[] {
  if (role === "admin") return [];

  const stored = new Map<string, BaseDataElement>();
  walkPolicyElements(storedSnapshot, (path, element) => stored.set(path, element));

  const violations: ElementSecurityViolation[] = [];
  walkPolicyElements(nextSnapshot, (path, element) => {
    const previous = stored.get(path);
    if (previous && elementContentSignature(previous) === elementContentSignature(element)) {
      return; // unchanged element: no write occurred
    }

    if (previous && elementSecuritySignature(previous) !== elementSecuritySignature(element)) {
      violations.push({ path, elementId: element.elementId, reason: "policy-change-forbidden" });
    }

    // Write authorization is evaluated against the stored element (or, for a new
    // element, its own definition), never against a client-relaxed policy.
    const governing = previous ?? element;
    if (!canRoleWriteElement(governing, role)) {
      violations.push({ path, elementId: element.elementId, reason: "write-forbidden" });
    }
  });

  // Removal is a write. Without this pass, the check only ran over the *new*
  // snapshot - an element that exists in storage but is missing from the
  // patch was never checked and could be removed by anyone allowed to patch
  // at all.
  for (const path of removedPaths ?? []) {
    const element = stored.get(path);
    if (!element) continue;
    if (canRoleWriteElement(element, role)) continue;

    violations.push({ path, elementId: element.elementId, reason: "write-forbidden" });
  }

  return violations;
}

// Every document reference a snapshot carries, with the absolute path of the
// element that carries it. `collectPublicBlobIds` below answers a different
// question - what may be downloaded *publicly* - and filters accordingly;
// this one is only about whether a reference resolves at all, which applies
// to controlled documents just the same.
export type DocumentReference = { blobObjectId: string; path: string };

export function collectDocumentReferences(
  snapshot: Pick<DppSnapshot, "collections" | "dataElements">,
): DocumentReference[] {
  const references: DocumentReference[] = [];

  const visit = (element: DataElement, path: string) => {
    if (element.kind !== "document") return;
    if (!element.blobObjectId) return;
    references.push({ blobObjectId: element.blobObjectId, path });
  };

  for (const collection of snapshot.collections ?? []) {
    for (const child of collection.dataElements) {
      visit(child, `${collection.elementId}/${child.elementId}`);
    }
  }
  for (const element of snapshot.dataElements ?? []) visit(element, element.elementId);

  return references;
}

// Collects the blob ids a snapshot exposes as publicly downloadable documents.
// Intended for a public projection (which already contains only public
// elements), but re-checks visibility so a full snapshot can never be passed in
// by accident and leak a controlled document (prEN 18239 5.2 no. 24/25).
export function collectPublicBlobIds(
  snapshot: Pick<DppSnapshot, "collections" | "dataElements">,
): string[] {
  const blobIds = new Set<string>();

  const visit = (element: DataElement, containerIsPublic: boolean): void => {
    if (element.kind !== "document") return;
    if (!containerIsPublic) return;
    if (element.visibility !== "public" || element.publicEligible === false) return;
    if (element.blobObjectId) blobIds.add(element.blobObjectId);
  };

  for (const collection of snapshot.collections ?? []) {
    const collectionIsPublic =
      collection.visibility === "public" && collection.publicEligible !== false;
    for (const child of collection.dataElements) visit(child, collectionIsPublic);
  }
  for (const element of snapshot.dataElements ?? []) visit(element, true);

  return [...blobIds];
}

// Whether a role may read a blob through a given snapshot: at least one document
// element referencing the blob must be readable, and for an element inside a
// collection the collection must be readable too. Fail-closed — no readable
// reference means no access (prEN 18239 5.2 no. 24/25).
export function canRoleReadBlob(
  snapshot: Pick<DppSnapshot, "collections" | "dataElements">,
  blobObjectId: string,
  role: OrganizationRole,
): boolean {
  if (!blobObjectId) return false;

  const referencesBlob = (element: DataElement): boolean =>
    element.kind === "document" && element.blobObjectId === blobObjectId;

  for (const collection of snapshot.collections ?? []) {
    if (!collection.dataElements.some(referencesBlob)) continue;
    if (!canRoleReadElement(collection, role)) continue;
    if (
      collection.dataElements.some(
        (element) => referencesBlob(element) && canRoleReadElement(element, role),
      )
    ) {
      return true;
    }
  }

  return (snapshot.dataElements ?? []).some(
    (element) => referencesBlob(element) && canRoleReadElement(element, role),
  );
}

// Every blob a snapshot references, regardless of visibility. Distinct from
// collectPublicBlobIds, which answers "what may the public download": this one
// answers "what is still in use" and therefore must not be swept.
export function collectReferencedBlobIds(
  snapshot: Pick<DppSnapshot, "collections" | "dataElements">,
): string[] {
  const blobIds = new Set<string>();

  const visit = (element: DataElement): void => {
    if (element.kind !== "document") return;
    if (element.blobObjectId) blobIds.add(element.blobObjectId);
  };

  for (const collection of snapshot.collections ?? []) {
    for (const child of collection.dataElements) visit(child);
  }
  for (const element of snapshot.dataElements ?? []) visit(element);

  return [...blobIds];
}

// Addressing individual elements (EN 18222 Table 19) and RFC-7396 merge.
export * from "./element-paths.js";

// Reporting feed for sustainability reporting (ESRS).
export * from "./dictionary-upgrade.js";
export * from "./sustainability.js";

// ESRS requirement profiles for dictionaries.
export * from "./esrs-profiles.js";
