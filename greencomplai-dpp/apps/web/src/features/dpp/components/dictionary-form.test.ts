import { describe, expect, it } from "vitest";

import type { DataElement, DictionaryEntry, DppSnapshot } from "../dpp-view";
import {
	buildCollectionDrafts,
	buildDictionaryDrafts,
	dictionaryFieldElement,
	entriesCoveredByCollections,
} from "./dictionary-form";

const entry = (entryKey: string, canonicalUri?: string): DictionaryEntry =>
	({
		canonicalUri,
		entryKey,
		name: { de: entryKey },
		required: false,
		valueType: "string",
		visibility: "public",
	}) as unknown as DictionaryEntry;

const element = (
	elementId: string,
	dictionaryReference: string,
	value: string,
) =>
	({
		dictionaryReference,
		elementId,
		kind: "single",
		value,
		valueDataType: "string",
		visibility: "public",
	}) as unknown as DataElement;

const collection = (
	elementId: string,
	elements: DataElement[],
): DppSnapshot["collections"][number] =>
	({
		dataElements: elements,
		elementId,
		name: { de: elementId },
		visibility: "public",
	}) as unknown as DppSnapshot["collections"][number];

describe("dictionary fields from the stored passport", () => {
	it("fills a field from a top-level element", () => {
		const { drafts } = buildDictionaryDrafts(
			[entry("productName", "urn:test:productName")],
			[element("element-productName", "urn:test:productName", "Testanlage")],
			"admin",
		);

		expect(drafts).toHaveLength(1);
		expect(drafts[0]?.raw).toBe("Testanlage");
		// The original path is preserved so saving hits the existing element
		// instead of creating a second one.
		expect(drafts[0]?.existedPath).toBe("element-productName");
	});

	// The reported bug: a passport carried 24 of its 29 data points inside
	// collections; the form built 24 empty fields for them. The value was
	// there, the field next to it was empty - it looked like data loss.
	describe("ein Datenpunkt, dessen Wert in einer Sammlung steht", () => {
		const entries = [
			entry("serialNumber", "urn:test:serialNumber"),
			entry("productName", "urn:test:productName"),
		];
		const collections = [
			collection("collection-identification", [
				element("element-serialNumber", "urn:test:serialNumber", "SN-4711"),
			]),
		];

		it("bekommt kein zweites, leeres Feld", () => {
			const { drafts } = buildDictionaryDrafts(
				entries,
				[],
				"admin",
				collections,
			);

			expect(drafts.map((draft) => draft.entry.entryKey)).toEqual([
				"productName",
			]);
		});

		it("wird benannt, statt wortlos zu verschwinden", () => {
			const { inCollections } = buildDictionaryDrafts(
				entries,
				[],
				"admin",
				collections,
			);

			expect(inCollections.map((covered) => covered.entryKey)).toEqual([
				"serialNumber",
			]);
		});

		// If the value sits both at the top level **and** in a collection, the
		// top-level field wins: otherwise an element the editor already saved
		// would disappear.
		it("retains the field alongside a top-level element", () => {
			const { drafts } = buildDictionaryDrafts(
				entries,
				[element("element-serialNumber", "urn:test:serialNumber", "SN-oben")],
				"admin",
				collections,
			);

			expect(drafts.map((draft) => draft.entry.entryKey)).toEqual([
				"serialNumber",
				"productName",
			]);
			expect(drafts[0]?.raw).toBe("SN-oben");
		});

		it("matches an element through its entry key", () => {
			const covered = entriesCoveredByCollections(
				[entry("serialNumber")],
				[
					collection("collection-identification", [
						element("serialNumber", "serialNumber", "SN-4711"),
					]),
				],
			);

			expect(covered.map((match) => match.entryKey)).toEqual(["serialNumber"]);
		});
	});

	it("passes elements without a dictionary entry to the free-form editor", () => {
		const { customElements } = buildDictionaryDrafts(
			[entry("productName", "urn:test:productName")],
			[element("eigenes", "urn:test:etwasAnderes", "Wert")],
			"admin",
		);

		expect(customElements.map((custom) => custom.elementId)).toEqual([
			"eigenes",
		]);
	});

	// A collection's fields. This iterates over the **elements**, not the
	// dictionary entries - otherwise every collection would show all of the
	// dictionary's data points instead of just the ones it actually carries.
	describe("Felder einer Sammlung", () => {
		const entries = [
			entry("powerSupply", "urn:test:powerSupply"),
			entry("serialNumber", "urn:test:serialNumber"),
			entry("productName", "urn:test:productName"),
		];

		it("builds a typed field for each resolved element", () => {
			const { drafts, customElements } = buildCollectionDrafts(
				entries,
				[element("element-powerSupply", "urn:test:powerSupply", "400VAC")],
				"admin",
			);

			expect(drafts).toHaveLength(1);
			expect(drafts[0]?.entry.entryKey).toBe("powerSupply");
			expect(drafts[0]?.raw).toBe("400VAC");
			expect(customElements).toEqual([]);
		});

		it("excludes entries not present in the collection", () => {
			const { drafts } = buildCollectionDrafts(
				entries,
				[element("element-powerSupply", "urn:test:powerSupply", "400VAC")],
				"admin",
			);

			expect(drafts.map((draft) => draft.entry.entryKey)).toEqual([
				"powerSupply",
			]);
		});

		it("keeps an element without an entry in the free-form editor", () => {
			const { drafts, customElements } = buildCollectionDrafts(
				entries,
				[element("eigenes", "urn:test:unbekannt", "Wert")],
				"admin",
			);

			expect(drafts).toEqual([]);
			expect(customElements.map((custom) => custom.elementId)).toEqual([
				"eigenes",
			]);
		});

		// The point where this would otherwise cost data: on save, the field
		// must hit **the same** element, not create a second one next to it.
		it("preserves the element ID when writing back", () => {
			const { drafts } = buildCollectionDrafts(
				entries,
				[element("element-powerSupply", "urn:test:powerSupply", "400VAC")],
				"admin",
			);
			const saved = dictionaryFieldElement({
				...drafts[0]!,
				raw: "230VAC",
			});

			expect(saved?.elementId).toBe("element-powerSupply");
			expect(saved?.dictionaryReference).toBe("urn:test:powerSupply");
			expect(saved?.kind === "single" ? saved.value : undefined).toBe("230VAC");
		});
	});
});
