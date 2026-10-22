import { describe, expect, it } from "vitest";

import {
	type DictionaryEntry,
	dictionaryEntryForElement,
	elementLabel,
	indexDictionaryEntries,
} from "./dpp-view";

const entry = (over: Partial<DictionaryEntry>): DictionaryEntry =>
	({
		canonicalUri: undefined,
		entryKey: "powerSupply",
		externalId: undefined,
		name: { de: "Stromversorgung", en: "Power supply" },
		required: false,
		valueType: "string",
		visibility: "public",
		...over,
	}) as unknown as DictionaryEntry;

const index = indexDictionaryEntries([
	entry({
		canonicalUri:
			"https://demo.dpp.local/dictionaries/demo-machinery/2026.1/powerSupply",
	}),
]);

describe("Anzeigename eines Elements", () => {
	// The reported case: the element carries no name of its own, but a
	// reference. Without resolution, "element-powerSupply" showed up on the card.
	it("uses the dictionary label when the element has none", () => {
		expect(
			elementLabel(
				{
					dictionaryReference:
						"https://demo.dpp.local/dictionaries/demo-machinery/2026.1/powerSupply",
					elementId: "element-powerSupply",
					name: undefined,
				},
				index,
			),
		).toBe("Stromversorgung");
	});

	it("resolves through the entry key", () => {
		expect(
			elementLabel(
				{
					dictionaryReference: undefined,
					elementId: "powerSupply",
					name: undefined,
				},
				index,
			),
		).toBe("Stromversorgung");
	});

	// The dictionary is the maintained source; an element name is the exception.
	it("prefers the dictionary label to the stored element name", () => {
		expect(
			elementLabel(
				{
					dictionaryReference:
						"https://demo.dpp.local/dictionaries/demo-machinery/2026.1/powerSupply",
					elementId: "element-powerSupply",
					name: { de: "Eigener Name" },
				},
				index,
			),
		).toBe("Stromversorgung");
	});

	// A technical identifier is better than a blank line.
	it("falls back to the element ID when no label resolves", () => {
		expect(
			elementLabel(
				{
					dictionaryReference: "urn:unbekannt",
					elementId: "element-x",
					name: undefined,
				},
				index,
			),
		).toBe("element-x");

		expect(
			dictionaryEntryForElement(
				{ dictionaryReference: "urn:unbekannt", elementId: "element-x" },
				index,
			),
		).toBeUndefined();
	});
});
