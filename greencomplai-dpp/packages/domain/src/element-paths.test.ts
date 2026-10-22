import { describe, expect, it } from "vitest";

import type { DataElement, DataElementCollection, DppSnapshot } from "./index.js";
import {
  applyMergePatch,
  findElementByPath,
  parseElementPath,
  replaceCollection,
  replaceElementAtPath,
} from "./element-paths.js";

const element = (elementId: string, value: unknown): DataElement => ({
  elementId,
  kind: "single",
  value,
  valueDataType: "string",
  visibility: "public",
});

const collection = (elementId: string, children: DataElement[]): DataElementCollection => ({
  elementId,
  kind: "collection",
  visibility: "public",
  dataElements: children,
});

const snapshot = (): DppSnapshot => ({
  digitalProductPassportId: "urn:dpp:test",
  productId: "P-1",
  granularity: "model",
  dppSchemaVersion: "dict/2026.1",
  status: "draft",
  lastUpdate: "2026-01-01T00:00:00.000Z",
  economicOperatorId: "OP-1",
  collections: [collection("material", [element("anteil", "40 %")])],
  dataElements: [element("gewicht", "12 kg")],
});

describe("element paths", () => {
  describe("parsing", () => {
    it("reads a top-level element id", () => {
      expect(parseElementPath("gewicht")).toEqual({ elementId: "gewicht" });
    });

    it("reads a path into a collection", () => {
      expect(parseElementPath("material/anteil")).toEqual({
        collectionId: "material",
        elementId: "anteil",
      });
    });

    // A collection contains elements, not collections. A third path segment
    // is therefore not a deeper path but a wrong one - and silently taking
    // the first element would be worse than rejecting it.
    it("refuses a path deeper than the model goes", () => {
      expect(parseElementPath("a/b/c")).toBeUndefined();
    });

    it("refuses an empty path", () => {
      expect(parseElementPath("")).toBeUndefined();
      expect(parseElementPath("/")).toBeUndefined();
    });
  });

  describe("lookup", () => {
    it("finds a top-level element", () => {
      expect(findElementByPath(snapshot(), "gewicht")?.element.elementId).toBe("gewicht");
    });

    it("finds an element inside a collection and reports the collection", () => {
      const found = findElementByPath(snapshot(), "material/anteil");

      expect(found?.element.elementId).toBe("anteil");
      expect(found?.collectionId).toBe("material");
    });

    // Otherwise a collection member could be reached by its bare id, bypassing
    // the collection it belongs to.
    it("does not find a collection member under its bare id", () => {
      expect(findElementByPath(snapshot(), "anteil")).toBeUndefined();
    });

    it("does not find an element in the wrong collection", () => {
      expect(findElementByPath(snapshot(), "gewicht/anteil")).toBeUndefined();
    });
  });

  describe("replacing", () => {
    it("replaces a top-level element and leaves the rest alone", () => {
      const next = replaceElementAtPath(snapshot(), "gewicht", element("gewicht", "13 kg"));

      expect(findElementByPath(next!, "gewicht")?.element).toMatchObject({ value: "13 kg" });
      expect(findElementByPath(next!, "material/anteil")?.element).toMatchObject({
        value: "40 %",
      });
    });

    it("replaces an element inside a collection", () => {
      const next = replaceElementAtPath(snapshot(), "material/anteil", element("anteil", "60 %"));

      expect(findElementByPath(next!, "material/anteil")?.element).toMatchObject({
        value: "60 %",
      });
    });

    // `UpdateElement` updates - it does not create. An unknown path is a 404,
    // not a silent creation at a location the caller merely meant.
    it("refuses to create an element that is not there", () => {
      expect(
        replaceElementAtPath(snapshot(), "unbekannt", element("unbekannt", "x")),
      ).toBeUndefined();
      expect(
        replaceElementAtPath(snapshot(), "material/unbekannt", element("unbekannt", "x")),
      ).toBeUndefined();
    });

    it("replaces a whole collection", () => {
      const next = replaceCollection(
        snapshot(),
        "material",
        collection("material", [element("anteil", "70 %"), element("herkunft", "EU")]),
      );

      expect(next?.collections[0]?.dataElements).toHaveLength(2);
    });

    it("refuses an unknown collection", () => {
      expect(replaceCollection(snapshot(), "gibtsnicht", collection("x", []))).toBeUndefined();
    });
  });

  // RFC 7396. The one property worth knowing is `null`: it deletes, rather
  // than setting the value to null.
  describe("merge patch (RFC 7396)", () => {
    it("adds and overwrites keys", () => {
      expect(applyMergePatch({ a: 1, b: 2 }, { b: 3, c: 4 })).toEqual({ a: 1, b: 3, c: 4 });
    });

    it("deletes a key when the patch says null", () => {
      expect(applyMergePatch({ a: 1, b: 2 }, { b: null })).toEqual({ a: 1 });
    });

    it("merges nested objects rather than replacing them", () => {
      expect(applyMergePatch({ a: { x: 1, y: 2 } }, { a: { y: 3 } })).toEqual({
        a: { x: 1, y: 3 },
      });
    });

    // Mandated by the RFC - and the only lossless choice for element lists:
    // merging would need a key per entry, which the format has no concept of.
    it("replaces arrays instead of merging them", () => {
      expect(applyMergePatch({ a: [1, 2, 3] }, { a: [4] })).toEqual({ a: [4] });
    });

    it("replaces a whole object when the patch is a scalar", () => {
      expect(applyMergePatch({ a: 1 }, "text")).toBe("text");
    });

    it("treats a missing key as no change", () => {
      expect(applyMergePatch({ a: 1, b: 2 }, {})).toEqual({ a: 1, b: 2 });
    });

    // The examples from RFC 7396 appendix A, so the implementation is tied to
    // the source rather than to one reading of it.
    it("matches the examples from RFC 7396 appendix A", () => {
      expect(applyMergePatch({ a: "b" }, { a: "c" })).toEqual({ a: "c" });
      expect(applyMergePatch({ a: "b" }, { b: "c" })).toEqual({ a: "b", b: "c" });
      expect(applyMergePatch({ a: "b" }, { a: null })).toEqual({});
      expect(applyMergePatch({ a: "b", b: "c" }, { a: null })).toEqual({ b: "c" });
      expect(applyMergePatch({ a: ["b"] }, { a: "c" })).toEqual({ a: "c" });
      expect(applyMergePatch({ a: "c" }, { a: ["b"] })).toEqual({ a: ["b"] });
      expect(applyMergePatch({ a: { b: "c" } }, { a: { b: "d", c: null } })).toEqual({
        a: { b: "d" },
      });
      expect(applyMergePatch({ a: [{ b: "c" }] }, { a: [1] })).toEqual({ a: [1] });
      expect(applyMergePatch(["a", "b"], ["c", "d"])).toEqual(["c", "d"]);
      expect(applyMergePatch({ a: "b" }, ["c"])).toEqual(["c"]);
      expect(applyMergePatch({ a: "foo" }, null)).toBeNull();
      expect(applyMergePatch({ a: "foo" }, "bar")).toBe("bar");
      expect(applyMergePatch({ e: null }, { a: 1 })).toEqual({ e: null, a: 1 });
      expect(applyMergePatch({}, { a: { bb: { ccc: null } } })).toEqual({ a: { bb: {} } });
    });
  });
});
