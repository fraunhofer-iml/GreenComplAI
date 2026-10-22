import { describe, expect, it } from "vitest";

import type { DictionaryDraftEntry } from "./connectors-api";
import { defaultSelected } from "./dictionary-draft-wizard";

// Which fields the wizard has checked when it opens.
//
// This looks like a detail and is not: a field that starts unchecked is a field
// that does not get created, and the only feedback is a count in the footer.
// The rule got this wrong once by asking whether the tenant held a matching
// entry *anywhere* - importing a record whose fields another dictionary already
// described then produced a new dictionary with 5 of 25 fields in it.

const entry = (existing?: {
	label: string;
	repositoryKey: string;
}): DictionaryDraftEntry => ({
	entryKey: "betriebsdruck",
	existing: existing
		? {
				confidence: 1,
				dictionaryReference: "urn:pressure",
				label: existing.label,
				repositoryKey: existing.repositoryKey,
			}
		: null,
	inferredValueType: false,
	name: "Betriebsdruck",
	sourceField: "cf_pressure",
	valueType: "string",
	visibility: "controlled",
});

describe("what the draft wizard checks by default", () => {
	it("checks a field nothing describes yet", () => {
		expect(defaultSelected(entry(), null)).toBe(true);
		expect(defaultSelected(entry(), "anlagen")).toBe(true);
	});

	it("checks a field the target dictionary does not describe", () => {
		// A new dictionary describes nothing, whatever else the tenant holds.
		expect(
			defaultSelected(
				entry({ label: "Druck", repositoryKey: "anlagen" }),
				null,
			),
		).toBe(true);
		// And another dictionary's vocabulary is not this one's.
		expect(
			defaultSelected(
				entry({ label: "Druck", repositoryKey: "anlagen" }),
				"maschinen",
			),
		).toBe(true);
	});

	it("leaves out a field the target dictionary already describes", () => {
		// Creating it a second time in the same dictionary is how one vocabulary
		// becomes two.
		expect(
			defaultSelected(
				entry({ label: "Druck", repositoryKey: "anlagen" }),
				"anlagen",
			),
		).toBe(false);
	});
});
