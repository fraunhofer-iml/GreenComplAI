import { render, screen } from "@testing-library/react";
import { StrictMode } from "react";
import { describe, expect, it } from "vitest";

import { Field, FieldLabel } from "./field";
import { Input } from "./input";

// Everything here runs under `StrictMode`, because the app does too: React
// invokes every render function twice there. The first version of this
// label-to-control wiring passed the test without StrictMode yet was
// nonetheless ineffective in the running app - the second call found the id
// already taken, and the second call is the one that wins.
//
// Without this wiring, a label is just text next to a field: clicking it
// focuses nothing, screen readers announce an unnamed field, and any search
// by name comes up empty. Testing it here instead of in a browser test means
// it can't quietly break in a single form unnoticed.
describe("Field", () => {
	it("links its label to the control", () => {
		render(
			<StrictMode>
				<Field>
					<FieldLabel>Produkt-ID</FieldLabel>
					<Input />
				</Field>
			</StrictMode>,
		);

		expect(screen.getByLabelText("Produkt-ID")).toBe(
			screen.getByRole("textbox"),
		);
	});

	it("leaves an explicit id alone", () => {
		render(
			<StrictMode>
				<Field>
					<FieldLabel htmlFor="eigene-kennung">Name</FieldLabel>
					<Input id="eigene-kennung" />
				</Field>
			</StrictMode>,
		);

		expect(screen.getByLabelText("Name").id).toBe("eigene-kennung");
	});

	// Two elements sharing an id would be invalid HTML, and the label would
	// point at the wrong one. Only the first gets the field's id; the second
	// keeps the one it supplies itself.
	it("never hands the same id to two controls", () => {
		render(
			<StrictMode>
				<Field>
					<FieldLabel>Zeitraum</FieldLabel>
					<Input aria-label="von" />
					<Input aria-label="bis" />
				</Field>
			</StrictMode>,
		);

		const first = screen.getByLabelText("von");
		const second = screen.getByLabelText("bis");
		expect(first.id).not.toBe("");
		expect(second.id).not.toBe("");
		expect(first.id).not.toBe(second.id);
		expect(screen.getByText("Zeitraum").getAttribute("for")).toBe(first.id);
	});
});
