import { ChevronDown, Lock, ShieldAlert } from "lucide-react";
import { useId, useMemo } from "react";
import { Badge } from "#/components/ui/badge";
import { Button } from "#/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "#/components/ui/card";
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from "#/components/ui/collapsible";
import { FieldDescription, FieldLabel } from "#/components/ui/field";
import { Input } from "#/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "#/components/ui/select";
import { Switch } from "#/components/ui/switch";
import { Textarea } from "#/components/ui/textarea";
import { FileUploadField } from "#/features/blobs/file-upload-field";
import {
	type DictionaryEntryCategory,
	dictionaryEntryCategory,
	dictionaryRepositoryCategories,
	label,
} from "#/features/catalog/catalog-api";
import type { OrganizationRole } from "#/features/organization/organizations-api";

import type {
	DataElement,
	DictionaryEntry,
	DictionaryRepository,
	DppSnapshot,
	DppViewPayload,
	ElementPolicy,
	Visibility,
} from "../dpp-view";
import { defaultPolicyForRole } from "./element-editor";
import { PolicyPicker } from "./policy-picker";

// One editable form field derived from a dictionary entry of the linked
// repository. `raw` holds the value as string for all value types except
// documents, which use the blob reference triple.
export type DictionaryFieldDraft = {
	blobObjectId: string;
	contentType: string;
	entry: DictionaryEntry;
	// elementId of the stored element this draft was prefilled from. Policy and
	// visibility of such elements may only be changed by admins (server-side
	// rule), so the access controls are locked for other roles.
	existedPath?: string;
	filename: string;
	policy?: ElementPolicy;
	publicEligible?: boolean;
	raw: string;
	uid: string;
	visibility: Visibility;
};

// A DPP is linked to a dictionary repository via
// dppSchemaVersion = "{repositoryKey}/{version}". Falls back to a key-only
// match if the version does not match any repository.
export function resolveLinkedDictionary(payload: DppViewPayload): {
	entries: DictionaryEntry[];
	repository: DictionaryRepository | undefined;
} {
	const [repositoryKey, version] = payload.dpp.dppSchemaVersion.split("/");
	const repositories = payload.dictionaryRepositories;
	const repository = repositoryKey
		? (repositories.find(
				(candidate) =>
					candidate.repositoryKey === repositoryKey &&
					candidate.version === version,
			) ??
			repositories.find(
				(candidate) => candidate.repositoryKey === repositoryKey,
			))
		: undefined;

	if (!repository) return { entries: [], repository: undefined };
	return {
		entries: payload.dictionaryEntries.filter(
			(entry) => entry.repositoryId === repository.id,
		),
		repository,
	};
}

// Which dictionary entries are already carried by an element **inside a
// collection**.
//
// A passport can hold the same datapoint in a collection instead of at the
// top level. Without this check the form would build a second, empty field
// for it - the value sat in the collection, the field next to it was empty,
// and it looked like the value had been lost. Filling that empty field then
// duplicated the datapoint in the passport.
export function entriesCoveredByCollections(
	entries: DictionaryEntry[],
	collections: DppSnapshot["collections"],
): DictionaryEntry[] {
	const references = new Set<string>();
	for (const collection of collections) {
		for (const element of collection.dataElements) {
			references.add(element.dictionaryReference ?? element.elementId);
		}
	}

	return entries.filter(
		(entry) =>
			references.has(entry.entryKey) ||
			Boolean(entry.canonicalUri && references.has(entry.canonicalUri)),
	);
}

// Partitions the stored data elements into dictionary-driven fields (matched
// via dictionaryReference/elementId against entryKey or canonicalUri) and the
// remaining custom elements for the generic editor.
//
// Entries whose value lives in a collection get **no** field: it is
// maintained there, and an empty duplicate next to it would be misleading.
// They are returned as `inCollections` so the UI can say where they went
// instead of silently omitting them.
export function buildDictionaryDrafts(
	entries: DictionaryEntry[],
	elements: DataElement[],
	role: OrganizationRole,
	collections: DppSnapshot["collections"] = [],
): {
	customElements: DataElement[];
	drafts: DictionaryFieldDraft[];
	inCollections: DictionaryEntry[];
} {
	const remaining = [...elements];
	const covered = new Set(
		entriesCoveredByCollections(entries, collections).map(
			(entry) => entry.entryKey,
		),
	);
	const inCollections: DictionaryEntry[] = [];

	const drafts = entries.flatMap((entry) => {
		const references = new Set<string>([entry.entryKey]);
		if (entry.canonicalUri) references.add(entry.canonicalUri);
		const wantedKind = entry.valueType === "document" ? "document" : "single";
		const index = remaining.findIndex(
			(element) =>
				element.kind === wantedKind &&
				references.has(element.dictionaryReference ?? element.elementId),
		);
		const element = index >= 0 ? remaining[index] : undefined;

		// No element at the top level, but one in a collection: that is where it
		// belongs and where it gets edited.
		if (!element && covered.has(entry.entryKey)) {
			inCollections.push(entry);
			return [];
		}

		if (index >= 0) remaining.splice(index, 1);

		return [draftFor(entry, element, role)];
	});

	return { customElements: remaining, drafts, inCollections };
}

function draftFor(
	entry: DictionaryEntry,
	element: DataElement | undefined,
	role: OrganizationRole,
): DictionaryFieldDraft {
	const visibility = element?.visibility ?? entry.visibility;
	// freshly created controlled fields get own role + admin as default
	// policy, so a non-admin editor does not save an element they can no
	// longer write (fail-closed 403). Prefilled elements keep their stored
	// policy untouched.
	const policy = element
		? structuredClone(element.policy)
		: visibility === "controlled"
			? defaultPolicyForRole(role)
			: undefined;

	return {
		blobObjectId: element?.kind === "document" ? element.blobObjectId : "",
		contentType: element?.kind === "document" ? element.contentType : "",
		entry,
		existedPath: element?.elementId,
		filename: element?.kind === "document" ? element.filename : "",
		policy,
		publicEligible: element?.publicEligible,
		raw:
			element?.kind === "single"
				? rawFromValue(element.value, entry.valueType)
				: "",
		uid: crypto.randomUUID(),
		visibility,
	} satisfies DictionaryFieldDraft;
}

// Same as above but for the elements **of a collection** - with one key
// difference: this iterates over the existing elements, not the dictionary
// entries. A collection should show the fields it carries, in its own order;
// iterating over the entries would put every dictionary datapoint into every
// collection.
export function buildCollectionDrafts(
	entries: DictionaryEntry[],
	elements: DataElement[],
	role: OrganizationRole,
): { customElements: DataElement[]; drafts: DictionaryFieldDraft[] } {
	const index = new Map<string, DictionaryEntry>();
	for (const entry of entries) {
		for (const reference of [entry.entryKey, entry.canonicalUri]) {
			if (reference) index.set(reference, entry);
		}
	}

	const customElements: DataElement[] = [];
	const drafts: DictionaryFieldDraft[] = [];

	for (const element of elements) {
		const entry = index.get(element.dictionaryReference ?? element.elementId);
		const wantedKind = entry?.valueType === "document" ? "document" : "single";
		// An entry whose kind does not match the stored element (document vs.
		// single value, say) does not work as a field - the element stays in the
		// generic editor, where it can be edited unchanged.
		if (!entry || element.kind !== wantedKind) {
			customElements.push(element);
			continue;
		}
		drafts.push(draftFor(entry, element, role));
	}

	return { customElements, drafts };
}

// Element path under which the server addresses this field (relevant for the
// 403 error mapping and the admin-only policy lock).
export function dictionaryFieldPath(draft: DictionaryFieldDraft): string {
	return draft.existedPath ?? draft.entry.entryKey;
}

function rawFromValue(value: unknown, valueType: string): string {
	if (value === null || value === undefined) return "";
	if (valueType === "boolean") {
		if (value === true) return "true";
		if (value === false) return "false";
		return String(value);
	}
	if (valueType === "object" || valueType === "array") {
		return typeof value === "string" ? value : JSON.stringify(value, null, 2);
	}
	if (valueType === "date") return String(value).slice(0, 10);
	if (valueType === "datetime") return String(value).slice(0, 16);
	return String(value);
}

function coerceDictionaryValue(raw: string, valueType: string): unknown {
	const trimmed = raw.trim();
	if (valueType === "number") return Number(trimmed);
	if (valueType === "boolean") return trimmed === "true";
	if (valueType === "object" || valueType === "array") {
		try {
			return JSON.parse(trimmed);
		} catch {
			return raw;
		}
	}
	return trimmed;
}

// Builds the data element for a filled dictionary field; empty optional
// fields yield `undefined` and are omitted from the snapshot entirely.
export function dictionaryFieldElement(
	draft: DictionaryFieldDraft,
): DataElement | undefined {
	const { entry } = draft;
	const base = {
		dictionaryReference: entry.canonicalUri ?? entry.entryKey,
		elementId: dictionaryFieldPath(draft),
		name: entry.name,
		policy: draft.policy,
		publicEligible: draft.publicEligible,
		visibility: draft.visibility,
	};

	if (entry.valueType === "document") {
		if (!draft.blobObjectId.trim()) return undefined;
		return {
			...base,
			blobObjectId: draft.blobObjectId.trim(),
			contentType: draft.contentType.trim(),
			filename: draft.filename.trim(),
			kind: "document",
		};
	}

	if (!draft.raw.trim()) return undefined;
	return {
		...base,
		kind: "single",
		value: coerceDictionaryValue(draft.raw, entry.valueType),
		valueDataType: entry.valueType,
	};
}

// Field-level validation on save: required fields, number parsing and
// complete document references. Returns the message or undefined.
export function validateDictionaryField(
	draft: DictionaryFieldDraft,
): string | undefined {
	const { entry } = draft;

	if (entry.valueType === "document") {
		const parts = [draft.blobObjectId, draft.filename, draft.contentType].map(
			(part) => part.trim(),
		);
		if (!parts.some(Boolean)) {
			return entry.required
				? "Pflichtfeld – bitte eine Dokument-Referenz angeben."
				: undefined;
		}
		if (!parts.every(Boolean)) {
			return "Blob-Objekt-ID, Dateiname und Content-Type werden zusammen benötigt.";
		}
		return undefined;
	}

	const raw = draft.raw.trim();
	if (!raw) {
		return entry.required ? "Pflichtfeld – bitte ausfüllen." : undefined;
	}
	if (entry.valueType === "number" && !Number.isFinite(Number(raw))) {
		return "Ungültige Zahl.";
	}
	return undefined;
}

export type DictionaryDraftGroup = {
	category: DictionaryEntryCategory;
	drafts: DictionaryFieldDraft[];
};

// True once the field carries a value that would be saved (used for the
// "filled/total" counters in section navigation and card headers).
export function dictionaryFieldFilled(draft: DictionaryFieldDraft): boolean {
	return draft.entry.valueType === "document"
		? draft.blobObjectId.trim() !== ""
		: draft.raw.trim() !== "";
}

// Groups drafts by entry category, ordered by the repository's category list
// and the entries' display order. Shared between the form and the editor's
// section navigation.
export function groupDictionaryDrafts(
	drafts: DictionaryFieldDraft[],
	repository: DictionaryRepository | undefined,
): DictionaryDraftGroup[] {
	const map = new Map<string, DictionaryDraftGroup>();
	for (const draft of drafts) {
		const category = dictionaryEntryCategory(draft.entry);
		const group = map.get(category.id) ?? { category, drafts: [] };
		group.drafts.push(draft);
		map.set(category.id, group);
	}

	const categoryOrder = new Map(
		dictionaryRepositoryCategories(repository).map(
			(category, index) => [category.id, index] as const,
		),
	);
	const entryOrder = (entry: DictionaryEntry) =>
		entry.metadata?.internalDisplay?.order ?? Number.MAX_SAFE_INTEGER;

	return [...map.values()]
		.map((group) => ({
			...group,
			drafts: [...group.drafts].sort(
				(left, right) =>
					entryOrder(left.entry) - entryOrder(right.entry) ||
					left.entry.entryKey.localeCompare(right.entry.entryKey),
			),
		}))
		.sort(
			(left, right) =>
				(categoryOrder.get(left.category.id) ?? Number.MAX_SAFE_INTEGER) -
					(categoryOrder.get(right.category.id) ?? Number.MAX_SAFE_INTEGER) ||
				left.category.label.localeCompare(right.category.label),
		);
}

// Dictionary-driven form area: one card per entry category, typed field per
// entry, plus a collapsible access section (visibility + policy) per field.
export function DictionaryFormSection({
	activeRole,
	drafts,
	errors,
	inCollections,
	isAdmin,
	onChangeDraft,
	originalPaths,
	repository,
	serverErrors,
}: {
	activeRole: OrganizationRole;
	drafts: DictionaryFieldDraft[];
	errors: Record<string, string>;
	inCollections: DictionaryEntry[];
	isAdmin: boolean;
	onChangeDraft: (
		uid: string,
		updater: (draft: DictionaryFieldDraft) => DictionaryFieldDraft,
	) => void;
	originalPaths: Set<string>;
	repository: DictionaryRepository | undefined;
	serverErrors: Record<string, string>;
}) {
	const groups = useMemo<DictionaryDraftGroup[]>(
		() => groupDictionaryDrafts(drafts, repository),
		[drafts, repository],
	);

	return (
		<div className="grid gap-6">
			{/* They are not missing, they live elsewhere - without this note a
			    dictionary with far more entries than visible fields looks like data loss. */}
			{inCollections.length > 0 ? (
				<p className="text-[13px] text-muted-foreground">
					{inCollections.length === 1
						? "Ein weiterer Datenpunkt dieses Wörterbuchs wird in den Sammlungen weiter unten gepflegt und erscheint deshalb nicht noch einmal als eigenes Feld."
						: `${inCollections.length} weitere Datenpunkte dieses Wörterbuchs werden in den Sammlungen weiter unten gepflegt und erscheinen deshalb nicht noch einmal als eigene Felder.`}
				</p>
			) : null}

			{groups.map((group) => (
				<Card
					className="scroll-mt-28"
					id={`dict-${group.category.id}`}
					key={group.category.id}
				>
					<CardHeader>
						<div className="flex flex-wrap items-baseline justify-between gap-2">
							<CardTitle>{group.category.label}</CardTitle>
							<span className="font-mono text-[11px] text-muted-foreground">
								{group.drafts.filter(dictionaryFieldFilled).length}/
								{group.drafts.length} Felder
							</span>
						</div>
						{group.category.description ? (
							<CardDescription>{group.category.description}</CardDescription>
						) : null}
					</CardHeader>
					<CardContent className="grid items-start gap-4 sm:grid-cols-2">
						{group.drafts.map((draft) => (
							<DictionaryFieldEditor
								activeRole={activeRole}
								draft={draft}
								error={
									errors[draft.entry.entryKey] ??
									serverErrors[dictionaryFieldPath(draft)]
								}
								key={draft.uid}
								onChange={(updater) => onChangeDraft(draft.uid, updater)}
								policyLocked={
									!isAdmin &&
									draft.existedPath !== undefined &&
									originalPaths.has(draft.existedPath)
								}
							/>
						))}
					</CardContent>
				</Card>
			))}
		</div>
	);
}

const wideValueTypes = new Set(["array", "document", "object"]);

function hasPolicyRoles(policy: ElementPolicy | undefined): boolean {
	return Boolean(
		policy && (policy.readRoles.length > 0 || policy.writeRoles.length > 0),
	);
}

export function DictionaryFieldEditor({
	activeRole,
	draft,
	error,
	onChange,
	policyLocked,
}: {
	activeRole: OrganizationRole;
	draft: DictionaryFieldDraft;
	error?: string;
	onChange: (
		updater: (draft: DictionaryFieldDraft) => DictionaryFieldDraft,
	) => void;
	policyLocked: boolean;
}) {
	const inputId = useId();
	const { entry } = draft;
	const controlledWithoutPolicy =
		draft.visibility === "controlled" && !hasPolicyRoles(draft.policy);

	const changeVisibility = (visibility: Visibility) => {
		onChange((previous) => ({
			...previous,
			policy:
				visibility === "controlled" && !previous.policy
					? defaultPolicyForRole(activeRole)
					: previous.policy,
			visibility,
		}));
	};

	const containerClass = wideValueTypes.has(entry.valueType)
		? "grid content-start gap-2 rounded-lg border bg-card p-4 sm:col-span-2"
		: "grid content-start gap-2 rounded-lg border bg-card p-4";

	return (
		<div className={containerClass}>
			<div className="flex flex-wrap items-baseline gap-2">
				<FieldLabel htmlFor={inputId}>
					{label(entry.name)}
					{entry.required ? (
						<span aria-hidden className="text-destructive">
							*
						</span>
					) : null}
				</FieldLabel>
				<span className="font-mono text-[10px] text-muted-foreground">
					{entry.entryKey}
				</span>
				<Badge className="ml-auto" variant="outline">
					{draft.visibility === "public" ? "Public" : "Controlled"}
				</Badge>
			</div>

			<ValueControl draft={draft} inputId={inputId} onChange={onChange} />

			{error ? (
				<p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
					{error}
				</p>
			) : null}

			<Collapsible>
				<CollapsibleTrigger
					render={
						<Button
							className="group w-fit"
							size="xs"
							type="button"
							variant="ghost"
						/>
					}
				>
					<Lock className="size-3.5" />
					Zugriff
					<ChevronDown className="size-3.5 transition-transform group-data-[panel-open]:rotate-180" />
				</CollapsibleTrigger>
				<CollapsibleContent className="grid gap-2 pt-2">
					<div className="flex items-center gap-2">
						<span className="text-xs font-medium text-muted-foreground">
							Sichtbarkeit
						</span>
						<Select
							items={{ controlled: "Controlled", public: "Public" }}
							onValueChange={(value) =>
								changeVisibility(value === "public" ? "public" : "controlled")
							}
							value={draft.visibility}
						>
							<SelectTrigger disabled={policyLocked} size="sm">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="controlled">Controlled</SelectItem>
								<SelectItem value="public">Public</SelectItem>
							</SelectContent>
						</Select>
					</div>
					{draft.visibility === "controlled" ? (
						<PolicyPicker
							disabled={policyLocked}
							onChange={(policy) =>
								onChange((previous) => ({ ...previous, policy }))
							}
							policy={draft.policy}
						/>
					) : null}
					{policyLocked ? (
						<p className="text-xs text-muted-foreground">
							Sichtbarkeit und Policy bestehender Elemente können nur Admins
							ändern.
						</p>
					) : null}
				</CollapsibleContent>
			</Collapsible>

			{controlledWithoutPolicy ? (
				<p className="flex items-start gap-1.5 text-xs text-amber-600 dark:text-amber-500">
					<ShieldAlert className="mt-0.5 size-3.5 shrink-0" />
					Ohne Policy ist dieses Controlled-Feld nach dem Speichern nur für
					Admins les- und schreibbar (fail-closed).
				</p>
			) : null}
		</div>
	);
}

function ValueControl({
	draft,
	inputId,
	onChange,
}: {
	draft: DictionaryFieldDraft;
	inputId: string;
	onChange: (
		updater: (draft: DictionaryFieldDraft) => DictionaryFieldDraft,
	) => void;
}) {
	const { entry } = draft;
	const setRaw = (raw: string) =>
		onChange((previous) => ({ ...previous, raw }));
	const allowedValues = (entry.allowedValues ?? [])
		.map((value) => String(value))
		.filter((value) => value.length > 0);

	if (entry.valueType === "document") {
		return (
			<FileUploadField
				onChange={(file) =>
					onChange((previous) => ({
						...previous,
						blobObjectId: file?.blobObjectId ?? "",
						filename: file?.filename ?? "",
						contentType: file?.contentType ?? "",
					}))
				}
				value={
					draft.blobObjectId
						? {
								blobObjectId: draft.blobObjectId,
								contentType: draft.contentType,
								filename: draft.filename,
							}
						: undefined
				}
			/>
		);
	}

	if (entry.valueType === "boolean") {
		const checked = draft.raw === "true";
		return (
			<div className="flex items-center gap-2 py-1">
				<Switch
					checked={checked}
					id={inputId}
					onCheckedChange={(next) => setRaw(next ? "true" : "false")}
				/>
				<span className="text-sm text-muted-foreground">
					{draft.raw === "" ? "Nicht gesetzt" : checked ? "Ja" : "Nein"}
				</span>
			</div>
		);
	}

	if (entry.valueType === "number") {
		return (
			<div className="flex items-center gap-2">
				<Input
					id={inputId}
					inputMode="decimal"
					onChange={(event) => setRaw(event.target.value)}
					type="number"
					value={draft.raw}
				/>
				{entry.unit ? (
					<span className="shrink-0 text-sm text-muted-foreground">
						{entry.unit}
					</span>
				) : null}
			</div>
		);
	}

	if (entry.valueType === "date" || entry.valueType === "datetime") {
		return (
			<Input
				id={inputId}
				onChange={(event) => setRaw(event.target.value)}
				type={entry.valueType === "date" ? "date" : "datetime-local"}
				value={draft.raw}
			/>
		);
	}

	if (entry.valueType === "object" || entry.valueType === "array") {
		return (
			<div className="grid gap-1">
				<Textarea
					className="font-mono text-xs"
					id={inputId}
					onChange={(event) => setRaw(event.target.value)}
					placeholder={entry.valueType === "array" ? "[ … ]" : "{ … }"}
					rows={4}
					value={draft.raw}
				/>
				<FieldDescription>
					JSON-Eingabe; ungültiges JSON wird als Text gespeichert.
				</FieldDescription>
			</div>
		);
	}

	// string / enum (and unknown value types as fallback)
	if (allowedValues.length > 0) {
		return (
			<div className="flex items-center gap-2">
				<Select
					onValueChange={(value) =>
						setRaw(typeof value === "string" ? value : "")
					}
					value={draft.raw}
				>
					<SelectTrigger className="w-full" id={inputId}>
						<SelectValue placeholder="Wert wählen" />
					</SelectTrigger>
					<SelectContent>
						{allowedValues.map((value) => (
							<SelectItem key={value} value={value}>
								{value}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
				{draft.raw !== "" && !entry.required ? (
					<Button
						onClick={() => setRaw("")}
						size="xs"
						type="button"
						variant="ghost"
					>
						Leeren
					</Button>
				) : null}
			</div>
		);
	}

	return (
		<Input
			id={inputId}
			onChange={(event) => setRaw(event.target.value)}
			value={draft.raw}
		/>
	);
}
