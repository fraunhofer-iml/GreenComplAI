import type { DataValueType, Visibility } from "@dpp/schemas";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";

import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
} from "#/components/ui/alert-dialog";
import { Button } from "#/components/ui/button";
import { Checkbox } from "#/components/ui/checkbox";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "#/components/ui/dialog";
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
import { Textarea } from "#/components/ui/textarea";
import {
	createDictionaryEntry,
	type DictionaryEntryCategory,
	type DictionaryRepository,
	dictionaryRepositoryCategories,
	patchDictionaryRepository,
	valueTypeLabels,
	valueTypes,
	visibilityOptions,
} from "./catalog-api";
import {
	optionalRowsToTranslatableString,
	rowsToTranslatableString,
	TranslationFields,
	type TranslationRow,
} from "./translation-fields";

type CategoryFormState = {
	description: string;
	id: string;
	name: string;
};

type EntryFormState = {
	categoryId: string;
	description: TranslationRow[];
	entryKey: string;
	name: TranslationRow[];
	required: boolean;
	unit: string;
	valueType: DataValueType;
	visibility: Visibility;
};

export function RepositoryCreateActions({
	repository,
}: {
	repository: DictionaryRepository;
}) {
	return (
		<div className="flex flex-wrap gap-2">
			<CreateCategoryDialog repository={repository} />
		</div>
	);
}

function CreateCategoryDialog({
	repository,
}: {
	repository: DictionaryRepository;
}) {
	const [open, setOpen] = useState(false);
	const [form, setForm] = useState<CategoryFormState>({
		description: "",
		id: "",
		name: "",
	});
	const client = useQueryClient();
	const mutation = useMutation({
		mutationFn: async () => {
			const categories = dictionaryRepositoryCategories(repository);
			const id = slugify(form.id || form.name);
			const metadata = {
				...(repository.metadata ?? {}),
				categories: [
					...categories
						.filter((category) => category.id !== id)
						.map(categoryToMetadata),
					{
						description: form.description.trim(),
						id,
						name: { de: form.name.trim(), en: form.name.trim() },
					},
				],
			};

			return patchDictionaryRepository(repository.repositoryKey, { metadata });
		},
		onSuccess: async () => {
			await client.invalidateQueries({
				queryKey: ["catalog", "dictionary-repositories"],
			});
			setForm({ description: "", id: "", name: "" });
			setOpen(false);
		},
	});

	return (
		<Dialog onOpenChange={setOpen} open={open}>
			<DialogTrigger render={<Button variant="outline" />}>
				<Plus className="size-4" />
				Überkategorie
			</DialogTrigger>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Überkategorie anlegen</DialogTitle>
					<DialogDescription>
						Die Überkategorie wird im Dictionary-Metadatenbereich gespeichert
						und kann Einträge gruppieren.
					</DialogDescription>
				</DialogHeader>
				<form
					onSubmit={(event) => {
						event.preventDefault();
						mutation.mutate();
					}}
				>
					<FieldGroup>
						<Field>
							<FieldLabel>Name</FieldLabel>
							<Input
								required
								value={form.name}
								onChange={(event) =>
									setForm({ ...form, name: event.target.value })
								}
							/>
						</Field>
						<Field>
							<FieldLabel>ID</FieldLabel>
							<Input
								placeholder="Wird aus dem Namen erzeugt"
								value={form.id}
								onChange={(event) =>
									setForm({ ...form, id: event.target.value })
								}
							/>
						</Field>
						<Field>
							<FieldLabel>Beschreibung</FieldLabel>
							<Textarea
								rows={3}
								value={form.description}
								onChange={(event) =>
									setForm({ ...form, description: event.target.value })
								}
							/>
						</Field>
					</FieldGroup>
					<DialogFooter>
						<Button disabled={mutation.isPending} type="submit">
							Anlegen
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}

export function EditCategoryDialog({
	category,
	repository,
}: {
	category: DictionaryEntryCategory;
	repository: DictionaryRepository;
}) {
	const [open, setOpen] = useState(false);
	const [form, setForm] = useState<CategoryFormState>({
		description: category.description,
		id: category.id,
		name: category.label,
	});
	const client = useQueryClient();
	const mutation = useMutation({
		mutationFn: async () => {
			const categories = dictionaryRepositoryCategories(repository);
			const metadata = {
				...(repository.metadata ?? {}),
				categories: [
					...categories
						.filter((candidate) => candidate.id !== category.id)
						.map(categoryToMetadata),
					{
						description: form.description.trim(),
						id: category.id,
						name: { de: form.name.trim(), en: form.name.trim() },
					},
				],
			};

			return patchDictionaryRepository(repository.repositoryKey, { metadata });
		},
		onSuccess: async () => {
			await client.invalidateQueries({
				queryKey: ["catalog", "dictionary-repositories"],
			});
			setOpen(false);
		},
	});

	return (
		<Dialog
			onOpenChange={(nextOpen) => {
				setOpen(nextOpen);
				if (nextOpen) {
					setForm({
						description: category.description,
						id: category.id,
						name: category.label,
					});
				}
			}}
			open={open}
		>
			<DialogTrigger render={<Button size="sm" variant="ghost" />}>
				<Pencil className="size-4" />
				Bearbeiten
			</DialogTrigger>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Überkategorie bearbeiten</DialogTitle>
					<DialogDescription>
						Die ID bleibt stabil, damit bestehende Einträge weiterhin korrekt
						zugeordnet bleiben.
					</DialogDescription>
				</DialogHeader>
				<form
					onSubmit={(event) => {
						event.preventDefault();
						mutation.mutate();
					}}
				>
					<FieldGroup>
						<Field>
							<FieldLabel>ID</FieldLabel>
							<Input disabled value={form.id} />
						</Field>
						<Field>
							<FieldLabel>Name</FieldLabel>
							<Input
								required
								value={form.name}
								onChange={(event) =>
									setForm({ ...form, name: event.target.value })
								}
							/>
						</Field>
						<Field>
							<FieldLabel>Beschreibung</FieldLabel>
							<Textarea
								rows={3}
								value={form.description}
								onChange={(event) =>
									setForm({ ...form, description: event.target.value })
								}
							/>
						</Field>
					</FieldGroup>
					<DialogFooter>
						<Button disabled={mutation.isPending} type="submit">
							Speichern
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}

export function DeleteCategoryDialog({
	category,
	entryCount,
	repository,
}: {
	category: DictionaryEntryCategory;
	entryCount: number;
	repository: DictionaryRepository;
}) {
	const client = useQueryClient();
	const mutation = useMutation({
		mutationFn: async () => {
			const categories = dictionaryRepositoryCategories(repository);
			const metadata = {
				...(repository.metadata ?? {}),
				categories: categories
					.filter((candidate) => candidate.id !== category.id)
					.map(categoryToMetadata),
			};

			return patchDictionaryRepository(repository.repositoryKey, { metadata });
		},
		onSuccess: async () => {
			await client.invalidateQueries({
				queryKey: ["catalog", "dictionary-repositories"],
			});
		},
	});
	const hasEntries = entryCount > 0;

	return (
		<AlertDialog>
			<AlertDialogTrigger render={<Button size="sm" variant="ghost" />}>
				<Trash2 className="size-4" />
				Löschen
			</AlertDialogTrigger>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>Überkategorie löschen</AlertDialogTitle>
					<AlertDialogDescription>
						{hasEntries
							? `Diese Überkategorie enthält noch ${entryCount} Einträge. Ordne diese Einträge zuerst einer anderen Kategorie zu oder lösche sie, bevor die Überkategorie entfernt werden kann.`
							: `Die Überkategorie „${category.label}“ wird aus den Dictionary-Metadaten entfernt.`}
					</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel>Abbrechen</AlertDialogCancel>
					{hasEntries ? null : (
						<AlertDialogAction
							disabled={mutation.isPending}
							onClick={() => mutation.mutate()}
						>
							Löschen
						</AlertDialogAction>
					)}
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}

export function CreateEntryDialog({
	categories,
	initialCategoryId = "default",
	repository,
}: {
	categories: DictionaryEntryCategory[];
	initialCategoryId?: string;
	repository: DictionaryRepository;
}) {
	const [open, setOpen] = useState(false);
	const defaultForm = (): EntryFormState => ({
		categoryId: initialCategoryId,
		description: [{ language: "de", value: "" }],
		entryKey: "",
		name: [{ language: "de", value: "" }],
		required: false,
		unit: "",
		valueType: "string",
		visibility: "controlled",
	});
	const [form, setForm] = useState<EntryFormState>({
		...defaultForm(),
	});
	const categoryLabel = (categoryId: string | null | undefined) =>
		categoryId === "default"
			? "Default"
			: (categories.find((category) => category.id === categoryId)?.label ??
				categoryId ??
				"");
	const visibilityLabel = (visibility: string | null | undefined) =>
		visibilityOptions.find((option) => option.value === visibility)?.label ??
		visibility ??
		"";
	const client = useQueryClient();
	const mutation = useMutation({
		mutationFn: () => {
			const category = categories.find(
				(candidate) => candidate.id === form.categoryId,
			);
			return createDictionaryEntry(repository.repositoryKey, {
				description: optionalRowsToTranslatableString(form.description),
				entryKey: form.entryKey.trim(),
				metadata: category
					? {
							category: categoryToMetadata(category),
						}
					: undefined,
				name: rowsToTranslatableString(form.name),
				required: form.required,
				unit: form.unit.trim() || undefined,
				valueType: form.valueType,
				version: repository.version,
				visibility: form.visibility,
			});
		},
		onSuccess: async () => {
			await client.invalidateQueries({
				queryKey: ["catalog", "dictionary-entries"],
			});
			await client.invalidateQueries({
				queryKey: [
					"catalog",
					"dictionary-repositories",
					repository.repositoryKey,
					"entries",
				],
			});
			setForm(defaultForm());
			setOpen(false);
		},
	});

	return (
		<Dialog
			onOpenChange={(nextOpen) => {
				setOpen(nextOpen);
				if (nextOpen) setForm(defaultForm());
			}}
			open={open}
		>
			<DialogTrigger render={<Button size="sm" variant="outline" />}>
				<Plus className="size-4" />
				Eintrag
			</DialogTrigger>
			<DialogContent className="sm:max-w-2xl">
				<DialogHeader>
					<DialogTitle>Dictionary-Eintrag anlegen</DialogTitle>
					<DialogDescription>
						Einträge können einer Überkategorie zugeordnet werden oder in der
						Default-Gruppe bleiben.
					</DialogDescription>
				</DialogHeader>
				<form
					onSubmit={(event) => {
						event.preventDefault();
						mutation.mutate();
					}}
				>
					<FieldGroup>
						<div className="grid gap-4 md:grid-cols-2">
							<Field>
								<FieldLabel>Eintrag-Key</FieldLabel>
								<Input
									required
									value={form.entryKey}
									onChange={(event) =>
										setForm({ ...form, entryKey: event.target.value })
									}
								/>
							</Field>
							<Field>
								<FieldLabel>Werttyp</FieldLabel>
								<Select
									value={form.valueType}
									onValueChange={(valueType) =>
										setForm({
											...form,
											valueType:
												(valueType as DataValueType | null) ?? "string",
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
												(visibility as Visibility | null) ?? "controlled",
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
											<SelectItem
												key={visibility.value}
												value={visibility.value}
											>
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
										setForm({ ...form, categoryId: categoryId ?? "default" })
									}
								>
									<SelectTrigger className="w-full">
										<SelectValue placeholder="Überkategorie wählen">
											{categoryLabel}
										</SelectValue>
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="default">Default</SelectItem>
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
					</FieldGroup>
					<DialogFooter>
						<Button disabled={mutation.isPending} type="submit">
							Anlegen
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}

function categoryToMetadata(category: {
	description?: string;
	id: string;
	label: string;
}) {
	return {
		description: category.description ?? "",
		id: category.id,
		name: { de: category.label, en: category.label },
	};
}

function slugify(value: string) {
	return (
		value
			.trim()
			.toLowerCase()
			.replace(/ä/g, "ae")
			.replace(/ö/g, "oe")
			.replace(/ü/g, "ue")
			.replace(/ß/g, "ss")
			.replace(/[^a-z0-9]+/g, "-")
			.replace(/^-|-$/g, "") || `category-${Date.now()}`
	);
}
