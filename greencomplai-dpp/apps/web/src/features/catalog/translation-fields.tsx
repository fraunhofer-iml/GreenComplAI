import { Plus, Trash2 } from "lucide-react";

import { Button } from "#/components/ui/button";
import { Field, FieldLabel } from "#/components/ui/field";
import { Input } from "#/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "#/components/ui/select";
import { Textarea } from "#/components/ui/textarea";
import type { TranslatableString } from "./catalog-api";

export type TranslationRow = {
	language: string;
	value: string;
};

const languageOptions = [
	{ label: "Deutsch", value: "de" },
	{ label: "Englisch", value: "en" },
	{ label: "Französisch", value: "fr" },
	{ label: "Spanisch", value: "es" },
	{ label: "Italienisch", value: "it" },
	{ label: "Niederländisch", value: "nl" },
	{ label: "Polnisch", value: "pl" },
	{ label: "Tschechisch", value: "cs" },
	{ label: "Dänisch", value: "da" },
	{ label: "Schwedisch", value: "sv" },
] as const;

export function translatableStringToRows(
	value?: TranslatableString | null,
): TranslationRow[] {
	const rows = Object.entries(value ?? {}).map(([language, rowValue]) => ({
		language,
		value: rowValue,
	}));

	return rows.length ? rows : [{ language: "de", value: "" }];
}

export function rowsToTranslatableString(
	rows: TranslationRow[],
): TranslatableString {
	return rows.reduce<TranslatableString>((translations, row) => {
		const language = row.language.trim();
		const value = row.value.trim();
		if (language && value) translations[language] = value;
		return translations;
	}, {});
}

export function optionalRowsToTranslatableString(rows: TranslationRow[]) {
	const translations = rowsToTranslatableString(rows);
	return Object.keys(translations).length ? translations : undefined;
}

export function TranslationFields({
	label,
	multiline = false,
	onRowsChange,
	required = false,
	rows,
}: {
	label: string;
	multiline?: boolean;
	onRowsChange: (rows: TranslationRow[]) => void;
	required?: boolean;
	rows: TranslationRow[];
}) {
	const selectedLanguages = new Set(rows.map((row) => row.language));
	const nextLanguage = languageOptions.find(
		(option) => !selectedLanguages.has(option.value),
	)?.value;

	return (
		<Field>
			<FieldLabel>{label}</FieldLabel>
			<div className="grid gap-2">
				{rows.map((row, index) => {
					const availableOptions = languageOptions.filter(
						(option) =>
							option.value === row.language ||
							!selectedLanguages.has(option.value),
					);
					const canRemove = !required || rows.length > 1;

					return (
						<div
							className="grid gap-2 sm:grid-cols-[10rem_1fr_auto]"
							key={row.language}
						>
							<Select
								value={row.language}
								onValueChange={(language) => {
									const nextRows = [...rows];
									nextRows[index] = {
										...row,
										language: language ?? row.language,
									};
									onRowsChange(nextRows);
								}}
							>
								<SelectTrigger className="w-full">
									<SelectValue placeholder="Sprache wählen" />
								</SelectTrigger>
								<SelectContent>
									{availableOptions.map((option) => (
										<SelectItem key={option.value} value={option.value}>
											{option.label}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
							{multiline ? (
								<Textarea
									required={required && index === 0}
									rows={3}
									value={row.value}
									onChange={(event) => {
										const nextRows = [...rows];
										nextRows[index] = { ...row, value: event.target.value };
										onRowsChange(nextRows);
									}}
								/>
							) : (
								<Input
									required={required && index === 0}
									value={row.value}
									onChange={(event) => {
										const nextRows = [...rows];
										nextRows[index] = { ...row, value: event.target.value };
										onRowsChange(nextRows);
									}}
								/>
							)}
							<Button
								disabled={!canRemove}
								size="icon"
								type="button"
								variant="ghost"
								onClick={() =>
									onRowsChange(rows.filter((_, rowIndex) => rowIndex !== index))
								}
							>
								<Trash2 className="size-4" />
							</Button>
						</div>
					);
				})}
				<Button
					className="w-fit"
					disabled={!nextLanguage}
					size="sm"
					type="button"
					variant="outline"
					onClick={() =>
						nextLanguage &&
						onRowsChange([...rows, { language: nextLanguage, value: "" }])
					}
				>
					<Plus className="size-4" />
					Übersetzung
				</Button>
			</div>
		</Field>
	);
}
