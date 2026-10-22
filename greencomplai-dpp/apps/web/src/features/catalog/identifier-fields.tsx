import { Plus, Trash2 } from "lucide-react";

import { Button } from "#/components/ui/button";
import { Input } from "#/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "#/components/ui/select";

import {
	identifierTypeLabels,
	identifierTypes,
	type ProductIdentifierType,
} from "./catalog-api";

// The draft form of an identifier, not the write form: `issuer` comes back
// from the API as `null` (empty column) and becomes "unset" on save.
// Treating the two forms as equivalent would be convenient and wrong - this
// exact kind of imprecision is what made identifiers unmaintainable before.
export type IdentifierDraft = {
	identifierType: ProductIdentifierType;
	identifierValue: string;
	issuer?: string | null;
};

// Product identifiers as a list of rows. A generic form can't represent this:
// it's multi-row, each row has three fields, and two rows may share the same
// type (two batch numbers). Hence a dedicated sub-form instead of another
// entry in `EntityEditForm`.
export function IdentifierFields({
	onChange,
	// Off where a panel heading already says "Kennungen": the visible caption is
	// for a form that mixes this group with other fields, and repeating it
	// directly under a heading of the same name reads as a mistake. The group's
	// accessible name stays either way.
	showCaption = true,
	value,
}: {
	onChange: (identifiers: IdentifierDraft[]) => void;
	showCaption?: boolean;
	value: IdentifierDraft[];
}) {
	const update = (index: number, patch: Partial<IdentifierDraft>) => {
		onChange(
			value.map((identifier, current) =>
				current === index ? { ...identifier, ...patch } : identifier,
			),
		);
	};

	// Deliberately no `Field`/`FieldLabel`: this is a group of several rows with
	// three controls each, not a single labelled field. A group label pointing
	// at one element names the wrong thing - it renamed the "add" button to
	// "Kennungen". The rows instead each carry their own `aria-label`.
	return (
		<fieldset className="grid gap-2" aria-label="Kennungen">
			{showCaption ? (
				<span className="text-sm font-medium">Kennungen</span>
			) : null}
			<div className="grid gap-2">
				{value.map((identifier, index) => (
					// The index is the right key here: rows have no stable identity
					// (the value changes as you type), and the list is only ever
					// appended to or has a single entry removed.
					// biome-ignore lint/suspicious/noArrayIndexKey: see above
					<div className="flex flex-wrap items-center gap-2" key={index}>
						<Select
							value={identifier.identifierType}
							onValueChange={(identifierType) =>
								update(index, {
									identifierType:
										(identifierType as ProductIdentifierType | null) ??
										identifier.identifierType,
								})
							}
						>
							<SelectTrigger
								aria-label={`Typ der ${index + 1}. Kennung`}
								className="w-[150px]"
							>
								<SelectValue>
									{identifierTypeLabels[identifier.identifierType]}
								</SelectValue>
							</SelectTrigger>
							<SelectContent>
								{identifierTypes.map((identifierType) => (
									<SelectItem key={identifierType} value={identifierType}>
										{identifierTypeLabels[identifierType]}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
						<Input
							aria-label={`Wert der ${index + 1}. Kennung`}
							className="min-w-[160px] flex-1"
							placeholder="Wert"
							value={identifier.identifierValue}
							onChange={(event) =>
								update(index, { identifierValue: event.target.value })
							}
						/>
						<Input
							aria-label={`Ausgebende Stelle der ${index + 1}. Kennung`}
							className="w-[140px]"
							placeholder="Aussteller"
							value={identifier.issuer ?? ""}
							onChange={(event) =>
								update(index, { issuer: event.target.value || undefined })
							}
						/>
						<Button
							aria-label={`${index + 1}. Kennung entfernen`}
							onClick={() =>
								onChange(value.filter((_, current) => current !== index))
							}
							size="icon"
							type="button"
							variant="ghost"
						>
							<Trash2 className="size-4" />
						</Button>
					</div>
				))}
			</div>
			<Button
				className="justify-self-start"
				onClick={() =>
					onChange([...value, { identifierType: "gtin", identifierValue: "" }])
				}
				size="sm"
				type="button"
				variant="outline"
			>
				<Plus className="size-4" />
				Kennung hinzufügen
			</Button>
			<p className="text-[13px] text-muted-foreground">
				GTIN, Seriennummer, Charge … Mehrere Kennungen desselben Typs sind
				zulässig. Zeilen ohne Wert werden nicht gespeichert.
			</p>
		</fieldset>
	);
}

// Empty rows are dropped: a row that was just added and not yet filled in is
// not an identifier, and the server would reject it.
export function usableIdentifiers(identifiers: IdentifierDraft[]): {
	identifierType: ProductIdentifierType;
	identifierValue: string;
	issuer?: string;
}[] {
	return identifiers
		.filter((identifier) => identifier.identifierValue.trim() !== "")
		.map((identifier) => ({
			identifierType: identifier.identifierType,
			identifierValue: identifier.identifierValue.trim(),
			...(identifier.issuer?.trim()
				? { issuer: identifier.issuer.trim() }
				: {}),
		}));
}
