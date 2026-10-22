import type { DataValueType, Visibility } from "@dpp/schemas";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { useState } from "react";

import { Button, buttonVariants } from "#/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "#/components/ui/card";
import { Checkbox } from "#/components/ui/checkbox";
import {
	Field,
	FieldContent,
	FieldGroup,
	FieldLabel,
} from "#/components/ui/field";
import { Input } from "#/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "#/components/ui/select";
import {
	type DictionaryEntry,
	type DictionaryEntryCategory,
	type DictionaryRepository,
	dictionaryEntryCategory,
	dictionaryRepositoryCategories,
	getDictionaryEntry,
	getDictionaryRepository,
	label,
	listDictionaryEntriesByRepository,
	patchDictionaryEntry,
	valueTypeLabels,
	valueTypes,
	visibilityLabels,
	visibilityOptions,
} from "#/features/catalog/catalog-api";
import { CatalogPage } from "#/features/catalog/catalog-layout";
import {
	optionalRowsToTranslatableString,
	rowsToTranslatableString,
	TranslationFields,
	type TranslationRow,
	translatableStringToRows,
} from "#/features/catalog/translation-fields";

export const Route = createFileRoute(
	"/catalog/dictionaries/$dictionaryKey/entries/$entryKey",
)({
	component: DictionaryEntryDetailPage,
});

const defaultCategory: DictionaryEntryCategory = {
	description: "Einträge ohne explizite Überkategorie.",
	id: "uncategorized",
	label: "Default",
};
type EntryFormState = {
	categoryId: string;
	description: TranslationRow[];
	name: TranslationRow[];
	required: boolean;
	standardReference: string;
	unit: string;
	valueType: DataValueType;
	visibility: Visibility;
};

function DictionaryEntryDetailPage() {
	const { dictionaryKey, entryKey } = Route.useParams();
	const client = useQueryClient();
	const entryQuery = useQuery({
		queryKey: ["catalog", "dictionary-entries", entryKey],
		queryFn: () => getDictionaryEntry(dictionaryKey, entryKey),
	});
	const repositoryQuery = useQuery({
		queryKey: ["catalog", "dictionary-repositories", dictionaryKey],
		queryFn: () => getDictionaryRepository(dictionaryKey),
	});
	const repositoryEntries = useQuery({
		queryKey: ["catalog", "dictionary-repositories", dictionaryKey, "entries"],
		queryFn: () => listDictionaryEntriesByRepository(dictionaryKey),
	});
	const entry = entryQuery.data;
	const repository = repositoryQuery.data;
	const categories = collectAvailableCategories(
		repository,
		repositoryEntries.data ?? [],
		entry,
	);
	const mutation = useMutation({
		mutationFn: (body: Partial<DictionaryEntry>) =>
			patchDictionaryEntry(dictionaryKey, entryKey, body),
		onSuccess: async () => {
			await client.invalidateQueries({
				queryKey: [
					"catalog",
					"dictionary-repositories",
					dictionaryKey,
					"entries",
				],
			});
			await client.invalidateQueries({
				queryKey: ["catalog", "dictionary-entries", entryKey],
			});
		},
	});

	return (
		<CatalogPage
			actions={
				<Link
					className={buttonVariants({ variant: "outline" })}
					params={{ dictionaryKey }}
					to="/catalog/dictionaries/$dictionaryKey"
				>
					<ArrowLeft className="size-4" />
					Dictionary
				</Link>
			}
			title={entry ? label(entry.name) : entryKey}
		>
			<Card>
				<CardHeader>
					<div>
						<CardTitle>
							{entry
								? `${label(entry.name)} bearbeiten`
								: "Dictionary-Eintrag bearbeiten"}
						</CardTitle>
						<CardDescription>
							Semantische Definition, Sichtbarkeit und Kategorie-Zuordnung des
							Eintrags.
						</CardDescription>
					</div>
				</CardHeader>
				<CardContent>
					{entry ? (
						<DictionaryEntryForm
							categories={categories}
							entry={entry}
							onSubmit={(value) => mutation.mutate(value)}
						/>
					) : (
						<p>Eintrag wird geladen...</p>
					)}
				</CardContent>
			</Card>
		</CatalogPage>
	);
}

function DictionaryEntryForm({
	categories,
	entry,
	onSubmit,
}: {
	categories: DictionaryEntryCategory[];
	entry: DictionaryEntry;
	onSubmit: (value: Partial<DictionaryEntry>) => void;
}) {
	const [form, setForm] = useState<EntryFormState>(() => ({
		categoryId: dictionaryEntryCategory(entry).id,
		description: translatableStringToRows(entry.description),
		name: translatableStringToRows(entry.name),
		required: entry.required,
		standardReference: entry.standardReference ?? "",
		unit: entry.unit ?? "",
		valueType: entry.valueType,
		visibility: entry.visibility,
	}));
	const categoryLabel = (categoryId: string | null | undefined) =>
		categories.find((category) => category.id === categoryId)?.label ??
		categoryId ??
		"";
	const visibilityLabel = (visibility: Visibility | null | undefined) =>
		visibility ? visibilityLabels[visibility] : "";

	return (
		<form
			onSubmit={(event) => {
				event.preventDefault();
				const category = categories.find(
					(candidate) => candidate.id === form.categoryId,
				);
				const metadata = {
					...(entry.metadata ?? {}),
					...(category && category.id !== defaultCategory.id
						? { category: categoryToMetadata(category) }
						: {}),
				};
				if (!category || category.id === defaultCategory.id) {
					delete metadata.category;
				}

				onSubmit({
					description: optionalRowsToTranslatableString(form.description),
					metadata,
					name: rowsToTranslatableString(form.name),
					required: form.required,
					standardReference: form.standardReference.trim() || undefined,
					unit: form.unit.trim() || undefined,
					valueType: form.valueType,
					visibility: form.visibility,
				});
			}}
		>
			<FieldGroup>
				<div className="grid gap-4 md:grid-cols-2">
					<Field>
						<FieldLabel>Eintrag-Key</FieldLabel>
						<Input disabled value={entry.entryKey} />
					</Field>
					<Field>
						<FieldLabel>Werttyp</FieldLabel>
						<Select
							value={form.valueType}
							onValueChange={(valueType) =>
								setForm({
									...form,
									valueType:
										(valueType as DataValueType | null) ?? form.valueType,
								})
							}
						>
							<SelectTrigger className="w-full">
								<SelectValue placeholder="Werttyp wählen" />
							</SelectTrigger>
							<SelectContent>
								{valueTypes.map((valueType) => (
									<SelectItem key={valueType} value={valueType}>
										{valueTypeLabels[valueType]}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</Field>
					<Field>
						<FieldLabel>Sichtbarkeit</FieldLabel>
						<Select
							value={form.visibility}
							onValueChange={(visibility) =>
								setForm({
									...form,
									visibility:
										(visibility as Visibility | null) ?? form.visibility,
								})
							}
						>
							<SelectTrigger className="w-full">
								<SelectValue placeholder="Sichtbarkeit wählen">
									{visibilityLabel}
								</SelectValue>
							</SelectTrigger>
							<SelectContent>
								{visibilityOptions.map((visibility) => (
									<SelectItem key={visibility.value} value={visibility.value}>
										{visibility.label}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</Field>
					<Field>
						<FieldLabel>Überkategorie</FieldLabel>
						<Select
							value={form.categoryId}
							onValueChange={(categoryId) =>
								setForm({
									...form,
									categoryId: categoryId ?? defaultCategory.id,
								})
							}
						>
							<SelectTrigger className="w-full">
								<SelectValue placeholder="Überkategorie wählen">
									{categoryLabel}
								</SelectValue>
							</SelectTrigger>
							<SelectContent>
								{categories.map((category) => (
									<SelectItem key={category.id} value={category.id}>
										{category.label}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</Field>
					<Field>
						<FieldLabel>Einheit</FieldLabel>
						<Input
							value={form.unit}
							onChange={(event) =>
								setForm({ ...form, unit: event.target.value })
							}
						/>
					</Field>
				</div>
				<Field>
					<FieldLabel>Standardreferenz</FieldLabel>
					<Input
						value={form.standardReference}
						onChange={(event) =>
							setForm({ ...form, standardReference: event.target.value })
						}
					/>
				</Field>
				<TranslationFields
					label="Name"
					required
					rows={form.name}
					onRowsChange={(name) => setForm({ ...form, name })}
				/>
				<TranslationFields
					label="Beschreibung"
					multiline
					rows={form.description}
					onRowsChange={(description) => setForm({ ...form, description })}
				/>
				<Field orientation="horizontal">
					<Checkbox
						checked={form.required}
						onCheckedChange={(checked) =>
							setForm({ ...form, required: checked === true })
						}
					/>
					<FieldContent>
						<FieldLabel>Pflichtfeld</FieldLabel>
					</FieldContent>
				</Field>
				<Button type="submit">Speichern</Button>
			</FieldGroup>
		</form>
	);
}

function collectAvailableCategories(
	repository: DictionaryRepository | undefined,
	repositoryEntries: DictionaryEntry[],
	entry: DictionaryEntry | undefined,
) {
	const categories = new Map<string, DictionaryEntryCategory>();

	categories.set(defaultCategory.id, defaultCategory);
	for (const category of dictionaryRepositoryCategories(repository)) {
		categories.set(category.id, category);
	}
	for (const repositoryEntry of repositoryEntries) {
		const category = dictionaryEntryCategory(repositoryEntry);
		categories.set(category.id, category);
	}
	if (entry) {
		const category = dictionaryEntryCategory(entry);
		categories.set(category.id, category);
	}

	return [...categories.values()];
}

function categoryToMetadata(category: DictionaryEntryCategory) {
	return {
		description: category.description,
		id: category.id,
		name: { de: category.label, en: category.label },
	};
}
