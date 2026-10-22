import { describe, expect, it } from "vitest";

import { canRoleReadBlob, collectPublicBlobIds } from "./index.js";
import type { DataElement, DataElementCollection } from "./index.js";

function documentElement(
  elementId: string,
  blobObjectId: string,
  overrides: Partial<DataElement> = {},
): DataElement {
  return {
    elementId,
    kind: "document",
    blobObjectId,
    filename: `${elementId}.pdf`,
    contentType: "application/pdf",
    visibility: "public",
    ...overrides,
  } as DataElement;
}

function collection(
  elementId: string,
  dataElements: DataElement[],
  overrides: Partial<DataElementCollection> = {},
): DataElementCollection {
  return {
    elementId,
    kind: "collection",
    visibility: "public",
    dataElements,
    ...overrides,
  } as DataElementCollection;
}

describe("collectPublicBlobIds", () => {
  it("collects blobs of public document elements", () => {
    const ids = collectPublicBlobIds({
      collections: [],
      dataElements: [documentElement("datasheet", "blob-1")],
    });

    expect(ids).toEqual(["blob-1"]);
  });

  it("ignores controlled documents", () => {
    const ids = collectPublicBlobIds({
      collections: [],
      dataElements: [
        documentElement("public-doc", "blob-1"),
        documentElement("secret-doc", "blob-2", { visibility: "controlled" }),
      ],
    });

    expect(ids).toEqual(["blob-1"]);
  });

  it("ignores documents excluded from the public projection", () => {
    const ids = collectPublicBlobIds({
      collections: [],
      dataElements: [documentElement("doc", "blob-1", { publicEligible: false })],
    });

    expect(ids).toEqual([]);
  });

  it("does not release documents of a controlled collection", () => {
    const ids = collectPublicBlobIds({
      collections: [
        collection("hidden", [documentElement("doc", "blob-1")], {
          visibility: "controlled",
        }),
      ],
      dataElements: [],
    });

    expect(ids).toEqual([]);
  });

  it("collects documents of a public collection", () => {
    const ids = collectPublicBlobIds({
      collections: [
        collection("compliance", [
          documentElement("cert", "blob-1"),
          documentElement("internal", "blob-2", { visibility: "controlled" }),
        ]),
      ],
      dataElements: [],
    });

    expect(ids).toEqual(["blob-1"]);
  });

  it("deduplicates a blob referenced by several elements", () => {
    const ids = collectPublicBlobIds({
      collections: [collection("group", [documentElement("copy", "blob-1")])],
      dataElements: [documentElement("original", "blob-1")],
    });

    expect(ids).toEqual(["blob-1"]);
  });

  it("skips non-document elements and empty references", () => {
    const ids = collectPublicBlobIds({
      collections: [],
      dataElements: [
        {
          elementId: "weight",
          kind: "single",
          value: 12,
          valueDataType: "number",
          visibility: "public",
        } as DataElement,
        documentElement("broken", ""),
      ],
    });

    expect(ids).toEqual([]);
  });
});

describe("canRoleReadBlob", () => {
  const publicDoc = documentElement("datasheet", "blob-1");
  const controlledDoc = documentElement("secret", "blob-2", {
    visibility: "controlled",
  });
  const policedDoc = documentElement("audit-report", "blob-3", {
    visibility: "controlled",
    policy: { readRoles: ["authority"], writeRoles: ["admin"] },
  });

  const snapshot = {
    collections: [],
    dataElements: [publicDoc, controlledDoc, policedDoc],
  };

  it("lets any role read a blob on a public element", () => {
    expect(canRoleReadBlob(snapshot, "blob-1", "viewer")).toBe(true);
  });

  it("denies a controlled blob without a policy to non-admins", () => {
    expect(canRoleReadBlob(snapshot, "blob-2", "viewer")).toBe(false);
    expect(canRoleReadBlob(snapshot, "blob-2", "editor")).toBe(false);
  });

  it("grants the admin override", () => {
    expect(canRoleReadBlob(snapshot, "blob-2", "admin")).toBe(true);
  });

  it("honours an explicit read policy", () => {
    expect(canRoleReadBlob(snapshot, "blob-3", "authority")).toBe(true);
    expect(canRoleReadBlob(snapshot, "blob-3", "editor")).toBe(false);
  });

  it("denies an unknown blob", () => {
    expect(canRoleReadBlob(snapshot, "blob-unknown", "admin")).toBe(false);
    expect(canRoleReadBlob(snapshot, "", "admin")).toBe(false);
  });

  it("denies a readable element inside a controlled collection", () => {
    const nested = {
      collections: [
        collection("locked", [documentElement("doc", "blob-9")], {
          visibility: "controlled",
        }),
      ],
      dataElements: [],
    };

    expect(canRoleReadBlob(nested, "blob-9", "viewer")).toBe(false);
  });

  it("allows a readable element inside a readable collection", () => {
    const nested = {
      collections: [collection("open", [documentElement("doc", "blob-9")])],
      dataElements: [],
    };

    expect(canRoleReadBlob(nested, "blob-9", "viewer")).toBe(true);
  });

  it("grants access if any referencing element is readable", () => {
    const shared = {
      collections: [],
      dataElements: [
        documentElement("hidden", "blob-7", { visibility: "controlled" }),
        documentElement("shown", "blob-7"),
      ],
    };

    expect(canRoleReadBlob(shared, "blob-7", "viewer")).toBe(true);
  });
});
