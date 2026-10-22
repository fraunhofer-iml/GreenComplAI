import { afterEach, describe, expect, it } from "vitest";

import { baseLocale, overwriteGetLocale } from "#/paraglide/runtime";

import { ApiError } from "./client";
import { hasMessageForCode, messageForCode } from "./error-messages";

const message = (code: string | undefined, text: string) => ({
	code,
	messageType: "Error" as const,
	text,
});

// The locale comes from the URL at runtime; there is none in a test, so it is
// set directly. Restoring it afterwards matters: this is process-wide state.
const speaking = (locale: "de" | "en") => overwriteGetLocale(() => locale);

afterEach(() => overwriteGetLocale(() => baseLocale));

describe("the text shown for a failed request", () => {
	it("prefers the message for the code over what the API wrote", () => {
		speaking("de");

		expect(
			messageForCode(
				message("CONNECTOR_DISABLED", "This connector is switched off"),
				409,
			),
		).toBe(
			"Diese Anbindung ist abgeschaltet. Sie lässt sich in den Einstellungen wieder aktivieren.",
		);
	});

	it("says the same thing in the language that is set", () => {
		// The whole point of the code being the key: one failure, one entry per
		// language, and the API said nothing about which one to use.
		const failure = message("CONNECTOR_RATE_LIMITED", "Rate limited");

		speaking("en");
		const english = messageForCode(failure, 503);
		speaking("de");
		const german = messageForCode(failure, 503);

		expect(english).toMatch(/^The connected system is not accepting/);
		expect(german).toMatch(/^Das angebundene System nimmt gerade/);
	});

	it("falls back to the API's text for a code it has never heard of", () => {
		// This is what keeps a deployed client usable against a newer API: an
		// unknown code produces the API's own wording, not a shrug.
		expect(
			messageForCode(
				message("SOMETHING_NEW", "Etwas Neues ist schiefgegangen."),
				400,
			),
		).toBe("Etwas Neues ist schiefgegangen.");
	});

	it("falls back again when there is no message at all", () => {
		speaking("de");

		expect(messageForCode(undefined, 503)).toBe(
			"Die Anfrage ist fehlgeschlagen (503).",
		);
	});

	it("leaves a message that names a field to the API", () => {
		// A field-level validation message says *which* field, and no code can say
		// that. The generic entry for `VALIDATION_FAILED` must not swallow it.
		speaking("de");
		expect(hasMessageForCode("VALIDATION_FAILED")).toBe(true);

		expect(
			messageForCode(
				{
					code: "VALIDATION_FAILED",
					messageType: "Error",
					path: "dpp.granularity",
					text: "Pflichtfeld",
				},
				422,
			),
		).toBe("Pflichtfeld");

		// Without a field, the code is all there is, and the entry applies.
		expect(
			messageForCode(
				message("VALIDATION_FAILED", "Invalid import request"),
				422,
			),
		).toBe("Die Anfrage war unvollständig oder ungültig.");
	});

	it("drops a value the screen already shows", () => {
		// The API names the identifier it did not find; the person is looking at
		// the search field they typed it into. Repeating it buys nothing, and it
		// is what lets this code have a fixed wording at all.
		speaking("de");

		expect(
			messageForCode(
				message(
					"EXTERNAL_PRODUCT_NOT_FOUND",
					'No record with the identifier "ERP-9" exists in the connected system',
				),
				404,
			),
		).toBe(
			"Im angebundenen System gibt es keinen Datensatz mit dieser Kennung.",
		);
	});

	it("applies to every error the client raises, not only where someone remembered", () => {
		speaking("de");
		const error = new ApiError(409, [
			message("CONNECTOR_DISABLED", "This connector is switched off"),
		]);

		expect(error.message).toMatch(/^Diese Anbindung ist abgeschaltet/);
		// What the server actually sent stays available - for field errors, for a
		// log line, for a bug report.
		expect(error.messages[0]?.text).toBe("This connector is switched off");
		expect(error.code).toBe("CONNECTOR_DISABLED");
	});
});
