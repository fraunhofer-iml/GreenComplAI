import { describe, expect, it } from "vitest";

import {
  canRoleReadElement,
  canRoleWriteElement,
  filterSnapshotForRole,
  findElementSecurityViolations,
  reconcilePatchForRole,
  type BaseDataElement,
  type DppSnapshot,
  type ElementPolicy,
  type SinglevaluedDataElement,
} from "./index.js";

function element(overrides: Partial<SinglevaluedDataElement>): SinglevaluedDataElement {
  return {
    elementId: "el",
    kind: "single",
    visibility: "controlled",
    value: "v",
    ...overrides,
  };
}

function snapshot(dataElements: DppSnapshot["dataElements"]): DppSnapshot {
  return {
    digitalProductPassportId: "urn:dpp:test",
    productId: "p-1",
    granularity: "item",
    dppSchemaVersion: "1.0",
    status: "draft",
    lastUpdate: "2026-07-16T00:00:00.000Z",
    economicOperatorId: "op-1",
    collections: [],
    dataElements,
  };
}

const policy = (p: Partial<ElementPolicy>): ElementPolicy => ({
  readRoles: [],
  writeRoles: [],
  ...p,
});

describe("fail-closed read/write on controlled elements", () => {
  it("denies non-admins access to a controlled element without a policy", () => {
    const el: BaseDataElement = { elementId: "e", visibility: "controlled" };
    expect(canRoleReadElement(el, "editor")).toBe(false);
    expect(canRoleReadElement(el, "viewer")).toBe(false);
    expect(canRoleReadElement(el, "authority")).toBe(false);
    expect(canRoleWriteElement(el, "editor")).toBe(false);
  });

  it("grants admins the emergency/owner override", () => {
    const el: BaseDataElement = { elementId: "e", visibility: "controlled" };
    expect(canRoleReadElement(el, "admin")).toBe(true);
    expect(canRoleWriteElement(el, "admin")).toBe(true);
  });

  it("keeps public elements accessible without a policy", () => {
    const el: BaseDataElement = { elementId: "e", visibility: "public" };
    expect(canRoleReadElement(el, "viewer")).toBe(true);
    expect(canRoleWriteElement(el, "editor")).toBe(true);
  });

  it("honors an explicit policy on controlled elements", () => {
    const el: BaseDataElement = {
      elementId: "e",
      visibility: "controlled",
      policy: policy({ readRoles: ["authority"], writeRoles: ["editor"] }),
    };
    expect(canRoleReadElement(el, "authority")).toBe(true);
    expect(canRoleReadElement(el, "editor")).toBe(false);
    expect(canRoleWriteElement(el, "editor")).toBe(true);
    expect(canRoleWriteElement(el, "authority")).toBe(false);
  });

  it("filterSnapshotForRole hides controlled-without-policy elements from non-admins", () => {
    const snap = snapshot([
      element({ elementId: "secret", visibility: "controlled" }),
      element({ elementId: "open", visibility: "public" }),
    ]);
    const filtered = filterSnapshotForRole(snap, "editor");
    expect(filtered.dataElements.map((e) => e.elementId)).toEqual(["open"]);
    expect(filterSnapshotForRole(snap, "admin").dataElements).toHaveLength(2);
  });
});

describe("patch-bypass protection (findElementSecurityViolations)", () => {
  it("blocks removing a restrictive policy and writing in the same patch", () => {
    const stored = snapshot([
      element({
        elementId: "e",
        value: "old",
        policy: policy({ writeRoles: ["admin"] }),
      }),
    ]);
    const next = snapshot([element({ elementId: "e", value: "new", policy: undefined })]);

    const violations = findElementSecurityViolations(stored, next, "editor");
    const reasons = violations.map((v) => v.reason).sort();
    expect(reasons).toContain("write-forbidden");
    expect(reasons).toContain("policy-change-forbidden");
  });

  it("blocks a policy change even when the editor may write the element", () => {
    const stored = snapshot([
      element({ elementId: "e", value: "v", policy: policy({ writeRoles: ["editor"] }) }),
    ]);
    const next = snapshot([
      element({
        elementId: "e",
        value: "v2",
        policy: policy({ writeRoles: ["editor", "viewer"] }),
      }),
    ]);

    const violations = findElementSecurityViolations(stored, next, "editor");
    expect(violations.map((v) => v.reason)).toEqual(["policy-change-forbidden"]);
  });

  it("allows a value edit the editor is authorized for", () => {
    const stored = snapshot([
      element({ elementId: "e", value: "v", policy: policy({ writeRoles: ["editor"] }) }),
    ]);
    const next = snapshot([
      element({ elementId: "e", value: "v2", policy: policy({ writeRoles: ["editor"] }) }),
    ]);
    expect(findElementSecurityViolations(stored, next, "editor")).toEqual([]);
  });

  it("ignores unchanged elements (echoing a read-filtered snapshot is not a write)", () => {
    const stored = snapshot([
      element({ elementId: "e", value: "v", policy: policy({ writeRoles: ["admin"] }) }),
    ]);
    const next = snapshot([
      element({ elementId: "e", value: "v", policy: policy({ writeRoles: ["admin"] }) }),
    ]);
    expect(findElementSecurityViolations(stored, next, "editor")).toEqual([]);
  });

  it("blocks a non-admin adding a new controlled element without a self-granting policy", () => {
    const stored = snapshot([]);
    const next = snapshot([element({ elementId: "new", visibility: "controlled" })]);
    const violations = findElementSecurityViolations(stored, next, "editor");
    expect(violations.map((v) => v.reason)).toEqual(["write-forbidden"]);
  });

  it("lets admins change policies freely", () => {
    const stored = snapshot([
      element({ elementId: "e", value: "v", policy: policy({ writeRoles: ["admin"] }) }),
    ]);
    const next = snapshot([element({ elementId: "e", value: "new", policy: undefined })]);
    expect(findElementSecurityViolations(stored, next, "admin")).toEqual([]);
  });

  it("resolves collection members by absolute path", () => {
    const stored: DppSnapshot = {
      ...snapshot([]),
      collections: [
        {
          elementId: "col",
          kind: "collection",
          visibility: "controlled",
          policy: policy({ readRoles: ["admin"], writeRoles: ["admin"] }),
          dataElements: [
            element({ elementId: "child", value: "v", policy: policy({ writeRoles: ["admin"] }) }),
          ],
        },
      ],
    };
    const next: DppSnapshot = {
      ...stored,
      collections: [
        {
          ...stored.collections[0]!,
          dataElements: [
            element({
              elementId: "child",
              value: "changed",
              policy: policy({ writeRoles: ["admin"] }),
            }),
          ],
        },
      ],
    };
    const violations = findElementSecurityViolations(stored, next, "editor");
    expect(violations).toEqual([
      { path: "col/child", elementId: "child", reason: "write-forbidden" },
    ]);
  });
});

// a client only sees what `filterSnapshotForRole` shows it, and sends
// back exactly that on save. Without reconciliation, any ordinary save
// would wipe out the elements the role is not allowed to read.
describe("reconcilePatchForRole", () => {
  const stored = (): DppSnapshot => ({
    digitalProductPassportId: "urn:dpp:test",
    productId: "P-1",
    granularity: "model",
    dppSchemaVersion: "dict/2026.1",
    status: "draft",
    lastUpdate: "2026-01-01T00:00:00.000Z",
    economicOperatorId: "OP-1",
    collections: [],
    dataElements: [
      { elementId: "offen", kind: "single", value: "a", visibility: "public" },
      {
        elementId: "nur-admin",
        kind: "single",
        value: "geheim",
        visibility: "controlled",
        policy: { readRoles: ["admin"], writeRoles: ["admin"] },
      },
    ],
  });

  it("puts back what the role never received", () => {
    const patched = { ...stored(), dataElements: [stored().dataElements[0]!] };

    const { snapshot, removedPaths } = reconcilePatchForRole(stored(), patched, "editor");

    expect(snapshot.dataElements.map((element) => element.elementId).sort()).toEqual([
      "nur-admin",
      "offen",
    ]);
    // No delete attempt: the element was never visible.
    expect(removedPaths).toEqual([]);
  });

  it("reports a visible element that is gone as removed", () => {
    const patched = { ...stored(), dataElements: [] };

    const { removedPaths } = reconcilePatchForRole(stored(), patched, "editor");

    expect(removedPaths).toEqual(["offen"]);
  });

  // The admin sees everything; their patch is complete, so an absence is deliberate.
  it("treats every absence as intentional for an admin", () => {
    const patched = { ...stored(), dataElements: [] };

    const { snapshot, removedPaths } = reconcilePatchForRole(stored(), patched, "admin");

    expect(snapshot.dataElements).toEqual([]);
    expect(removedPaths.sort()).toEqual(["nur-admin", "offen"]);
  });
});
