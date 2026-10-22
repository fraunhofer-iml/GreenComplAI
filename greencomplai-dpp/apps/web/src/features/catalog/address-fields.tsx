import { Field, FieldLabel } from "#/components/ui/field";
import { Input } from "#/components/ui/input";

// The address lives as free-form jsonb in the database - but a raw text field for it isn't
// freedom, it's a source of errors: one forgotten brace loses the whole address. This form
// maintains the four fields an address practically always has, and leaves anything else already
// in the object untouched (see `mergeAddress`).
export type AddressDraft = {
	city: string;
	country: string;
	postalCode: string;
	street: string;
};

const FIELDS = [
	{ key: "street", label: "Straße und Hausnummer" },
	{ key: "postalCode", label: "PLZ" },
	{ key: "city", label: "Ort" },
	{ key: "country", label: "Land" },
] as const;

export function emptyAddress(): AddressDraft {
	return { city: "", country: "", postalCode: "", street: "" };
}

export function addressToDraft(address: unknown): AddressDraft {
	if (!address || typeof address !== "object") return emptyAddress();
	const source = address as Record<string, unknown>;
	const read = (key: string) =>
		typeof source[key] === "string" ? (source[key] as string) : "";

	return {
		city: read("city"),
		country: read("country"),
		postalCode: read("postalCode"),
		street: read("street"),
	};
}

// Merge instead of replace: an import can bring fields this form doesn't know about (state,
// address line 2). Overwriting them just because the form doesn't display them would be silent
// data loss.
export function mergeAddress(
	existing: unknown,
	draft: AddressDraft,
): Record<string, unknown> | undefined {
	const base =
		existing && typeof existing === "object"
			? { ...(existing as Record<string, unknown>) }
			: {};

	for (const { key } of FIELDS) {
		const value = draft[key].trim();
		if (value) base[key] = value;
		else delete base[key];
	}

	return Object.keys(base).length > 0 ? base : undefined;
}

export function AddressFields({
	onChange,
	value,
}: {
	onChange: (address: AddressDraft) => void;
	value: AddressDraft;
}) {
	return (
		<div className="grid gap-4 sm:grid-cols-2">
			{FIELDS.map(({ key, label }) => (
				// No manual ids: `Field` links the label and the input itself. Setting both by
				// hand was the earlier bug - the label pointed at an id the field no longer had.
				<Field key={key}>
					<FieldLabel>{label}</FieldLabel>
					<Input
						value={value[key]}
						onChange={(event) =>
							onChange({ ...value, [key]: event.target.value })
						}
					/>
				</Field>
			))}
		</div>
	);
}
