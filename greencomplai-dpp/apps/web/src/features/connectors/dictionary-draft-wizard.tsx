import type { DataValueType, Visibility } from "@dpp/schemas";
import { useQuery } from "@tanstack/react-query";
import { BookPlus, Loader2 } from "lucide-react";
import { useState } from "react";
import { Badge } from "#/components/ui/badge";
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
import { Field, FieldLabel } from "#/components/ui/field";
import { Input } from "#/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "#/components/ui/select";
import { ApiError } from "#/features/api/client";
import {
	type DictionaryEntryCategory,
	dictionaryRepositoryCategories,
	listDictionaryRepositories,
	label as translated,
	valueTypeLabels,
	valueTypes,
	visibilityLabels,
	visibilityOptions,
} from "#/features/catalog/catalog-api";

import {
	type DictionaryDraft,
	type DictionaryDraftEntry,
	useCreateConnectorDictionary,
} from "./connectors-api";

export type DictionaryCreated = {
	// Every entry the wizard asked for, whether it was written now or the
	// dictionary already held it. The mapping treats both the same - which is the
	// point: running this a second time against the same dictionary has to leave
	// the fields assigned, not empty.
	placements: {
		collection: { id: string; label: string } | null;
		dictionaryReference: string;
		sourceField: string;
	}[];
	// Which dictionary the entries landed in. Copy-on-write may have moved them
	// into a fresh version , so this is the version that was written to and
	// not necessarily the one the form named.
	repositoryKey: string;
	repositoryVersion: string;
};

// Building the vocabulary a record kind needs, from the record kind itself.
//
// The mapping below this asks which dictionary entry a field follows. On the
// first import of an asset type there is nothing to ask about - the dictionary
// is empty, every field falls back to a provenance attribute, and the way out
// used to be: leave, build a vocabulary by hand from the field list you just
// saw, come back.
//
// The source system already holds what an entry needs. SIMPL keeps an asset
// type's custom fields as a JSON Schema: name, description, type, unit, and
// sometimes a closed value list. Reading that is a translation, not an
// invention.
//
// Which is why every entry is shown, editable, and confirmed before anything
// is written - and why what gets confirmed is a **dictionary**. Whether the
// passport carries the field stays the mapping's decision, made afterwards,
// per field.

type EntryState = {
	entryKey: string;
	name: string;
	required: boolean;
	// Only what the user decided themselves. The default depends on the target
	// dictionary, which is chosen after this state is built and can be changed
	// again - storing the default here would freeze the answer to a question
	// that had not been asked yet.
	selected?: boolean | undefined;
	unit: string;
	valueType: DataValueType;
	visibility: Visibility;
};

export function DictionaryDraftWizard({
	connectorKey,
	draft,
	onCreated,
	sourceType,
}: {
	connectorKey: string;
	draft: DictionaryDraft;
	// What now exists, per source field, plus the category the entries were
	// filed under. The mapping applies both straight away: having just created
	// an entry for a field, being made to search for it in a list would be a
	// joke at the user's expense.
	onCreated: (result: DictionaryCreated) => void;
	sourceType: { key: string; label: string };
}) {
	const [open, setOpen] = useState(false);

	return (
		<Dialog onOpenChange={setOpen} open={open}>
			<DialogTrigger
				render={
					<Button size="sm" variant="outline">
						<BookPlus className="size-3.5" />
						Wörterbuch aus dieser Datensatzart erstellen
					</Button>
				}
			/>
			{/* Remounted per opening: a wizard someone left halfway through
			    should start over, not resume in a state they have forgotten. */}
			{open ? (
				<WizardBody
					connectorKey={connectorKey}
					draft={draft}
					onCreated={onCreated}
					onDone={() => setOpen(false)}
					sourceType={sourceType}
				/>
			) : null}
		</Dialog>
	);
}

function WizardBody({
	connectorKey,
	draft,
	onCreated,
	onDone,
	sourceType,
}: {
	connectorKey: string;
	draft: DictionaryDraft;
	onCreated: (result: DictionaryCreated) => void;
	onDone: () => void;
	sourceType: { key: string; label: string };
}) {
	const repositories = useQuery({
		queryKey: ["catalog", "dictionary-repositories"],
		queryFn: listDictionaryRepositories,
	});
	const create = useCreateConnectorDictionary();

	const [step, setStep] = useState<1 | 2>(1);
	const [mode, setMode] = useState<"new" | "existing">("new");
	const [repository, setRepository] = useState(draft.repository);
	const [existingKey, setExistingKey] = useState("");
	const [categoryId, setCategoryId] = useState("");
	const [entries, setEntries] = useState<Record<string, EntryState>>(() =>
		Object.fromEntries(
			draft.entries.map((entry) => [entry.sourceField, initialState(entry)]),
		),
	);

	const patch = (sourceField: string, next: Partial<EntryState>) =>
		setEntries((current) => ({
			...current,
			[sourceField]: { ...current[sourceField]!, ...next },
		}));

	// The categories the target dictionary declares. A new dictionary declares
	// none yet, so there the choice is only "Default" - and that is correct: a
	// category is created in the catalogue, not on the way past.
	const categories: DictionaryEntryCategory[] =
		mode === "existing"
			? dictionaryRepositoryCategories(
					repositories.data?.find(
						(entry) => entry.repositoryKey === existingKey,
					),
				)
			: [];
	const category = categories.find((entry) => entry.id === categoryId);

	// Which dictionary the entries are headed for - `null` while a new one is
	// being created, because a dictionary that does not exist yet describes
	// nothing.
	const targetKey = mode === "existing" ? existingKey : null;
	const isSelected = (entry: DictionaryDraftEntry) =>
		entries[entry.sourceField]?.selected ?? defaultSelected(entry, targetKey);

	const selected = draft.entries.filter(isSelected);
	const duplicateKeys = findDuplicateKeys(selected, entries);

	const targetReady =
		mode === "new"
			? Boolean(
					repository.name.trim() &&
						repository.repositoryKey.trim() &&
						repository.namespaceUri.trim() &&
						repository.version.trim(),
				)
			: Boolean(existingKey);

	const submit = () => {
		create.mutate(
			{
				category: category ? { id: category.id, label: category.label } : null,
				entries: selected.map((entry) => {
					const state = entries[entry.sourceField]!;

					return {
						allowedValues: entry.allowedValues ?? null,
						description: entry.description ?? null,
						entryKey: state.entryKey.trim(),
						name: state.name.trim(),
						required: state.required,
						sourceField: entry.sourceField,
						unit: state.unit.trim() || null,
						valueType: state.valueType,
						visibility: state.visibility,
					};
				}),
				key: connectorKey,
				sourceType,
				target:
					mode === "new"
						? {
								mode: "new" as const,
								name: repository.name.trim(),
								namespaceUri: repository.namespaceUri.trim(),
								repositoryKey: repository.repositoryKey.trim(),
								version: repository.version.trim(),
							}
						: { mode: "existing" as const, repositoryKey: existingKey },
			},
			{
				onSuccess: (result) => {
					onCreated({
						placements: [...result.created, ...result.existing],
						repositoryKey: result.repositoryKey,
						repositoryVersion: result.repositoryVersion,
					});
					onDone();
				},
			},
		);
	};

	return (
		// A column, not the default grid: the middle section has to take whatever
		// height is left over so that header and footer stay put. As a grid the
		// three rows added up past the dialog's own maximum and the footer fell off
		// the bottom edge.
		<DialogContent className="flex max-h-[85dvh] flex-col gap-0 overflow-hidden p-0 sm:max-w-3xl">
			<DialogHeader className="shrink-0 border-b px-5 py-4">
				<DialogTitle className="text-[15px]">
					{step === 1 ? "Wohin die Einträge gehören" : "Die Einträge prüfen"}
				</DialogTitle>
				<DialogDescription className="text-[12.5px]">
					{step === 1
						? `Schritt 1 von 2. Die Felder der Datensatzart „${sourceType.label}" werden zu Wörterbucheinträgen; ein Wörterbuch muss dafür nicht vorher bestehen.`
						: "Schritt 2 von 2. Was aus dem Fremdsystem gelesen wurde, vor dem Anlegen. Alles ist änderbar, nichts ist bisher geschrieben."}
				</DialogDescription>
			</DialogHeader>

			{/* `min-h-0` is what lets this shrink at all - a flex child defaults to
			    its content's height and would push the footer out instead of
			    scrolling. */}
			<div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
				{step === 1 ? (
					<TargetStep
						categories={categories}
						categoryId={categoryId}
						existingKey={existingKey}
						mode={mode}
						onCategoryId={setCategoryId}
						onExistingKey={setExistingKey}
						onMode={setMode}
						onRepository={(next) =>
							setRepository((current) => ({ ...current, ...next }))
						}
						repositories={(repositories.data ?? []).map((entry) => ({
							key: entry.repositoryKey,
							label: `${translated(entry.name)} · ${entry.version}`,
						}))}
						repositoriesPending={repositories.isPending}
						repository={repository}
					/>
				) : (
					<div className="grid gap-2">
						{draft.entries.map((entry) => (
							<DraftRow
								entry={entry}
								inTarget={entry.existing?.repositoryKey === targetKey}
								key={entry.sourceField}
								onPatch={(next) => patch(entry.sourceField, next)}
								selected={isSelected(entry)}
								state={entries[entry.sourceField]!}
							/>
						))}
					</div>
				)}
			</div>

			{/* `m-0` undoes the negative margins the footer carries for the dialog's
			    default padding, which this one does not have. */}
			<DialogFooter className="m-0 shrink-0 flex-row items-center justify-between gap-3 border-t px-5 py-3">
				<div className="min-w-0 flex-1 text-[12px] text-muted-foreground">
					{create.error instanceof ApiError ? (
						<span className="text-destructive">{create.error.message}</span>
					) : create.error ? (
						<span className="text-destructive">
							Die Anfrage ist fehlgeschlagen.
						</span>
					) : duplicateKeys.length > 0 ? (
						<span className="text-destructive">
							Zwei Einträge tragen dieselbe Kennung: {duplicateKeys.join(", ")}
						</span>
					) : step === 2 ? (
						`${selected.length} von ${draft.entries.length} Feldern werden angelegt`
					) : null}
				</div>

				{step === 1 ? (
					<Button
						disabled={!targetReady}
						onClick={() => setStep(2)}
						size="sm"
						type="button"
					>
						Weiter
					</Button>
				) : (
					<div className="flex shrink-0 gap-2">
						<Button
							onClick={() => setStep(1)}
							size="sm"
							type="button"
							variant="ghost"
						>
							Zurück
						</Button>
						<Button
							disabled={
								create.isPending ||
								selected.length === 0 ||
								duplicateKeys.length > 0
							}
							onClick={submit}
							size="sm"
							type="button"
						>
							{create.isPending ? (
								<Loader2 className="size-3.5 animate-spin" />
							) : null}
							{selected.length === 1
								? "1 Eintrag anlegen"
								: `${selected.length} Einträge anlegen`}
						</Button>
					</div>
				)}
			</DialogFooter>
		</DialogContent>
	);
}

function TargetStep({
	categories,
	categoryId,
	existingKey,
	mode,
	onCategoryId,
	onExistingKey,
	onMode,
	onRepository,
	repositories,
	repositoriesPending,
	repository,
}: {
	categories: DictionaryEntryCategory[];
	categoryId: string;
	existingKey: string;
	mode: "new" | "existing";
	onCategoryId: (value: string) => void;
	onExistingKey: (value: string) => void;
	onMode: (value: "new" | "existing") => void;
	onRepository: (next: Partial<DictionaryDraft["repository"]>) => void;
	repositories: { key: string; label: string }[];
	repositoriesPending: boolean;
	repository: DictionaryDraft["repository"];
}) {
	return (
		<div className="grid gap-3">
			<Choice
				checked={mode === "new"}
				description="Kennung, Namensraum und Version sind vorbelegt und bleiben änderbar. Das Wörterbuch entsteht als Entwurf."
				onSelect={() => onMode("new")}
				title="Neues Wörterbuch anlegen"
			>
				<div className="mt-3 grid gap-3 sm:grid-cols-2">
					<Field>
						<FieldLabel htmlFor="draft-name">Name</FieldLabel>
						<Input
							className="h-8"
							id="draft-name"
							onChange={(event) => onRepository({ name: event.target.value })}
							value={repository.name}
						/>
					</Field>
					<Field>
						<FieldLabel htmlFor="draft-key">Kennung</FieldLabel>
						<Input
							className="h-8 font-mono text-[12px]"
							id="draft-key"
							onChange={(event) =>
								onRepository({ repositoryKey: event.target.value })
							}
							value={repository.repositoryKey}
						/>
					</Field>
					<Field className="sm:col-span-2">
						<FieldLabel htmlFor="draft-namespace">Namensraum</FieldLabel>
						<Input
							className="h-8 font-mono text-[12px]"
							id="draft-namespace"
							onChange={(event) =>
								onRepository({ namespaceUri: event.target.value })
							}
							value={repository.namespaceUri}
						/>
						{/* The URI is what a passport later cites as the source of its
						    data elements - it identifies the vocabulary, it does not
						    have to be reachable. */}
						<p className="text-[11px] text-muted-foreground">
							Die dauerhafte Kennung des Wörterbuchs. Jeder Eintrag hängt
							darunter; veröffentlichte Pässe zitieren sie.
						</p>
					</Field>
					<Field>
						<FieldLabel htmlFor="draft-version">Version</FieldLabel>
						<Input
							className="h-8 font-mono text-[12px]"
							id="draft-version"
							onChange={(event) =>
								onRepository({ version: event.target.value })
							}
							value={repository.version}
						/>
					</Field>
				</div>
			</Choice>

			<Choice
				checked={mode === "existing"}
				description={
					repositories.length === 0 && !repositoriesPending
						? "Es gibt noch kein Wörterbuch in dieser Organisation."
						: "Die Einträge kommen in ein bestehendes Wörterbuch. Ist dessen Version bereits von einem veröffentlichten Pass belegt, entsteht dabei die nächste Version."
				}
				disabled={repositories.length === 0}
				onSelect={() => onMode("existing")}
				title="In ein bestehendes Wörterbuch übernehmen"
			>
				<div className="mt-3">
					<Select
						items={Object.fromEntries(
							repositories.map((entry) => [entry.key, entry.label]),
						)}
						onValueChange={(value) => onExistingKey(value ?? "")}
						value={existingKey}
					>
						<SelectTrigger aria-label="Wörterbuch" className="h-8">
							<SelectValue
								placeholder={
									repositoriesPending ? "Wird geladen …" : "Wörterbuch wählen"
								}
							/>
						</SelectTrigger>
						<SelectContent>
							{repositories.map((entry) => (
								<SelectItem key={entry.key} value={entry.key}>
									{entry.label}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>
			</Choice>

			{/* Only categories the dictionary already declares. A heading is a
			    statement about what the fields are *about*, and the source
			    system's record kind is not that - it says where they came from.
			    New headings are created in the catalogue, at the dictionary. */}
			<Field className="mt-1">
				<FieldLabel htmlFor="draft-category">Überkategorie</FieldLabel>
				<Select
					disabled={categories.length === 0}
					items={Object.fromEntries(
						categories.map((entry) => [entry.id, entry.label]),
					)}
					onValueChange={(value) => onCategoryId(value ?? "")}
					value={categoryId}
				>
					<SelectTrigger className="h-8" id="draft-category">
						<SelectValue placeholder="Default — ohne Überkategorie" />
					</SelectTrigger>
					<SelectContent>
						{categories.map((entry) => (
							<SelectItem key={entry.id} value={entry.id}>
								{entry.label}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
				<p className="text-[11px] text-muted-foreground">
					{categories.length === 0
						? "Dieses Wörterbuch führt noch keine Überkategorien. Die Einträge landen unter „Default“ und lassen sich im Katalog einsortieren."
						: "Ohne Auswahl landen die Einträge unter „Default“."}
				</p>
			</Field>
		</div>
	);
}

function Choice({
	checked,
	children,
	description,
	disabled = false,
	onSelect,
	title,
}: {
	checked: boolean;
	children: React.ReactNode;
	description: string;
	disabled?: boolean;
	onSelect: () => void;
	title: string;
}) {
	return (
		<div
			className={`rounded-md border p-3 ${checked ? "border-primary bg-background" : "bg-muted/30"} ${disabled ? "opacity-60" : ""}`}
		>
			<button
				className="flex w-full items-start gap-2.5 text-left"
				disabled={disabled}
				onClick={onSelect}
				type="button"
			>
				<span
					aria-hidden
					className={`mt-0.5 size-3.5 shrink-0 rounded-full border ${checked ? "border-[4px] border-primary" : ""}`}
				/>
				<span className="min-w-0">
					<span className="block text-[13px] font-medium">{title}</span>
					<span className="mt-0.5 block text-[11.5px] text-muted-foreground">
						{description}
					</span>
				</span>
			</button>
			{checked && !disabled ? children : null}
		</div>
	);
}

function DraftRow({
	entry,
	inTarget,
	onPatch,
	selected,
	state,
}: {
	entry: DictionaryDraftEntry;
	// Whether the entry the draft matched sits in the dictionary being written
	// to. Only then is it a reason to leave this field out.
	inTarget: boolean;
	onPatch: (next: Partial<EntryState>) => void;
	selected: boolean;
	state: EntryState;
}) {
	return (
		<div className="rounded-md border bg-background p-3">
			<div className="flex items-start gap-2.5">
				<Checkbox
					aria-label={`${entry.name} anlegen`}
					checked={selected}
					className="mt-0.5"
					onCheckedChange={(value) => onPatch({ selected: value === true })}
				/>
				<div className="min-w-0 flex-1">
					<div className="flex flex-wrap items-baseline gap-2">
						<span className="text-[13px] font-medium">{entry.name}</span>
						<span className="font-mono text-[11px] text-muted-foreground">
							{entry.sourceField}
						</span>
						{entry.inferredValueType ? (
							// The source system said nothing about the type; this one was
							// read off a single value. Saying so is what makes it
							// correctable.
							<Badge className="text-[10px]" variant="secondary">
								Typ geraten
							</Badge>
						) : null}
					</div>

					{entry.description ? (
						<p className="mt-1 text-[11.5px] text-muted-foreground">
							{entry.description}
						</p>
					) : null}

					{entry.existing && inTarget ? (
						<p className="mt-1.5 text-[11.5px] text-amber-600 dark:text-amber-400">
							In diesem Wörterbuch steht bereits „{entry.existing.label}“,
							vermutlich dasselbe Feld. Deshalb nicht vorausgewählt.
						</p>
					) : entry.existing ? (
						// A similar entry elsewhere is worth saying - two dictionaries
						// describing the same field is a thing to notice - but it is not a
						// reason to leave the field out of this one.
						<p className="mt-1.5 text-[11.5px] text-muted-foreground">
							„{entry.existing.label}“ im Wörterbuch{" "}
							<span className="font-mono">{entry.existing.repositoryKey}</span>{" "}
							beschreibt vermutlich dasselbe Feld.
						</p>
					) : null}

					{selected ? (
						<div className="mt-2.5 grid gap-2 sm:grid-cols-4">
							<Field className="sm:col-span-2">
								<FieldLabel htmlFor={`name-${entry.sourceField}`}>
									Name
								</FieldLabel>
								<Input
									className="h-8"
									id={`name-${entry.sourceField}`}
									onChange={(event) => onPatch({ name: event.target.value })}
									value={state.name}
								/>
							</Field>
							<Field className="sm:col-span-2">
								<FieldLabel htmlFor={`key-${entry.sourceField}`}>
									Kennung
								</FieldLabel>
								<Input
									className="h-8 font-mono text-[12px]"
									id={`key-${entry.sourceField}`}
									onChange={(event) =>
										onPatch({ entryKey: event.target.value })
									}
									value={state.entryKey}
								/>
							</Field>
							<Field>
								<FieldLabel htmlFor={`type-${entry.sourceField}`}>
									Datentyp
								</FieldLabel>
								<Select
									items={valueTypeLabels}
									onValueChange={(value) =>
										onPatch({ valueType: value as DataValueType })
									}
									value={state.valueType}
								>
									<SelectTrigger
										className="h-8"
										id={`type-${entry.sourceField}`}
									>
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										{valueTypes.map((type) => (
											<SelectItem key={type} value={type}>
												{valueTypeLabels[type]}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</Field>
							<Field>
								<FieldLabel htmlFor={`unit-${entry.sourceField}`}>
									Einheit
								</FieldLabel>
								<Input
									className="h-8"
									id={`unit-${entry.sourceField}`}
									onChange={(event) => onPatch({ unit: event.target.value })}
									placeholder="—"
									value={state.unit}
								/>
							</Field>
							<Field>
								<FieldLabel htmlFor={`visibility-${entry.sourceField}`}>
									Sichtbarkeit
								</FieldLabel>
								<Select
									items={visibilityLabels}
									onValueChange={(value) =>
										onPatch({ visibility: value as Visibility })
									}
									value={state.visibility}
								>
									<SelectTrigger
										className="h-8"
										id={`visibility-${entry.sourceField}`}
									>
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										{visibilityOptions.map((option) => (
											<SelectItem key={option.value} value={option.value}>
												{option.label}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</Field>
							<Field className="justify-end">
								<label
									className="flex items-center gap-2 text-[12.5px]"
									htmlFor={`required-${entry.sourceField}`}
								>
									<Checkbox
										checked={state.required}
										id={`required-${entry.sourceField}`}
										onCheckedChange={(value) =>
											onPatch({ required: value === true })
										}
									/>
									Pflichtfeld
								</label>
							</Field>
						</div>
					) : null}
				</div>
			</div>
		</div>
	);
}

function initialState(entry: DictionaryDraftEntry): EntryState {
	return {
		entryKey: entry.entryKey,
		name: entry.name,
		// Nothing is required by default: a required entry retroactively
		// invalidates every passport that does not carry it, and that is not a
		// side effect of an import.
		required: false,
		unit: entry.unit ?? "",
		valueType: entry.valueType,
		visibility: entry.visibility,
	};
}

// Whether a field is checked as long as nobody has said otherwise.
//
// Off only for a field the **target** dictionary already describes - creating
// it a second time there is how one vocabulary becomes two. This used to ask
// merely whether the tenant held a matching entry anywhere, which is a
// different question: importing a record whose fields another dictionary
// already describes then produced a new dictionary with everything left out
// except the handful of fields nothing had matched.
export function defaultSelected(
	entry: DictionaryDraftEntry,
	targetKey: string | null,
): boolean {
	return !(entry.existing && entry.existing.repositoryKey === targetKey);
}

// Two entries under one key would hit the dictionary's unique index, and the
// server would report it as a skip after having created the other one. Saying
// it here costs a comparison and saves the half-applied result.
function findDuplicateKeys(
	selected: readonly DictionaryDraftEntry[],
	entries: Record<string, EntryState>,
): string[] {
	const seen = new Set<string>();
	const duplicates = new Set<string>();

	for (const entry of selected) {
		const key = entries[entry.sourceField]?.entryKey.trim() ?? "";
		if (seen.has(key)) duplicates.add(key);
		seen.add(key);
	}

	return [...duplicates];
}
