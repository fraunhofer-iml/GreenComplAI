import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useBlocker } from "@tanstack/react-router";
import {
	AlertTriangle,
	CheckCircle2,
	ChevronDown,
	FileText,
	FolderPlus,
	Info,
	List,
	Plus,
	Save,
	Trash2,
	Type,
	X,
} from "lucide-react";
import { useId, useMemo, useState } from "react";

import { Alert, AlertDescription, AlertTitle } from "#/components/ui/alert";
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
	label,
	listEconomicOperators,
	listFacilities,
	listProducts,
} from "#/features/catalog/catalog-api";
import { AppNavbar } from "#/features/navigation/app-navbar";
import { useActiveOrganizationId } from "#/features/organization/organization-store";
import type { OrganizationRole } from "#/features/organization/organizations-api";

import {
	buildCollectionDrafts,
	buildDictionaryDrafts,
	type DictionaryFieldDraft,
	DictionaryFieldEditor,
	DictionaryFormSection,
	dictionaryFieldElement,
	dictionaryFieldFilled,
	entriesCoveredByCollections,
	groupDictionaryDrafts,
	resolveLinkedDictionary,
	validateDictionaryField,
} from "./components/dictionary-form";
import { DictionaryUpgradeCard } from "./components/dictionary-upgrade-card";
import {
	defaultPolicyForRole,
	ElementEditor,
} from "./components/element-editor";
import { PolicyPicker, roleLabels } from "./components/policy-picker";
import { RelationshipEditor } from "./components/relationship-editor";
import { type DppSnapshotPatch, patchDpp } from "./dpp-edit-api";
import type {
	DataElement,
	DictionaryEntry,
	DppSnapshot,
	DppViewPayload,
	ElementPolicy,
	TranslatableString,
	Visibility,
} from "./dpp-view";
import { indexDictionaryEntries, statusLabel } from "./dpp-view";

// Value for "no facility" in the select; an empty value would count as unset
// and leave the placeholder showing.
const NO_FACILITY = "__none__";

// The editor works on uid-wrapped drafts so list items keep a stable React
// identity while their elementId is being typed.
type ElementDraft = { element: DataElement; uid: string };

type CollectionDraft = {
	// Elements without a dictionary entry - they stay in the free-form editor.
	dataElements: ElementDraft[];
	// Elements **with** an entry: a typed field named from the dictionary, in
	// the same shape as the category cards' fields.
	dictionaryFields: DictionaryFieldDraft[];
	dictionaryReference?: string;
	elementId: string;
	name?: TranslatableString;
	policy?: ElementPolicy;
	publicEligible?: boolean;
	uid: string;
	visibility: Visibility;
};

type CoreDraft = {
	dppSchemaVersion: string;
	economicOperatorId: string;
	facilityId: string;
	granularity: string;
	productId: string;
};

type EditorState = {
	collections: CollectionDraft[];
	core: CoreDraft;
	// Custom elements only – elements matching a dictionary entry of the linked
	// repository live in dictionaryFields instead.
	dataElements: ElementDraft[];
	dictionaryFields: DictionaryFieldDraft[];
};

type Banner = { kind: "error" | "success"; text: string };

const makeUid = () => crypto.randomUUID();

// The collection's name as the passport carries it. The element id is the
// last resort - the same rule as for elements themselves.
function collectionLabel(collection: CollectionDraft): string {
	return (
		collection.name?.de ??
		collection.name?.en ??
		collection.elementId ??
		"Neue Sammlung"
	);
}

function toElementDrafts(elements: DataElement[]): ElementDraft[] {
	return structuredClone(elements).map((element) => ({
		element,
		uid: makeUid(),
	}));
}

function snapshotToState(
	dpp: DppSnapshot,
	entries: DictionaryEntry[],
	role: OrganizationRole,
): EditorState {
	// Collections count too: a data point already stored there must not get a
	// second, empty field in the form.
	const { customElements, drafts } = buildDictionaryDrafts(
		entries,
		dpp.dataElements,
		role,
		dpp.collections,
	);
	return {
		collections: dpp.collections.map((collection) => {
			const split = buildCollectionDrafts(
				entries,
				collection.dataElements,
				role,
			);
			return {
				dataElements: toElementDrafts(split.customElements),
				dictionaryFields: split.drafts,
				dictionaryReference: collection.dictionaryReference,
				elementId: collection.elementId,
				name: structuredClone(collection.name),
				policy: structuredClone(collection.policy),
				publicEligible: collection.publicEligible,
				uid: makeUid(),
				visibility: collection.visibility,
			};
		}),
		core: {
			dppSchemaVersion: dpp.dppSchemaVersion,
			economicOperatorId: dpp.economicOperatorId,
			facilityId: dpp.facilityId ?? "",
			granularity: dpp.granularity,
			productId: dpp.productId,
		},
		dataElements: toElementDrafts(customElements),
		dictionaryFields: drafts,
	};
}

function newElement(
	kind: DataElement["kind"],
	role: OrganizationRole,
): DataElement {
	const base = {
		elementId: "",
		policy: defaultPolicyForRole(role),
		visibility: "controlled" as Visibility,
	};
	if (kind === "single") {
		return { ...base, kind: "single", value: "", valueDataType: "string" };
	}
	if (kind === "multi") {
		return {
			...base,
			kind: "multi",
			valueList: [
				{
					elementId: `wert-${crypto.randomUUID().slice(0, 8)}`,
					value: "",
					valueDataType: "string",
				},
			],
		};
	}
	return {
		...base,
		blobObjectId: "",
		contentType: "",
		filename: "",
		kind: "document",
	};
}

function validateState(state: EditorState): string[] {
	const errors: string[] = [];
	if (!state.core.productId.trim())
		errors.push("Produkt-ID darf nicht leer sein.");
	if (!state.core.granularity.trim())
		errors.push("Granularität darf nicht leer sein.");
	if (!state.core.dppSchemaVersion.trim())
		errors.push("Schema-Version darf nicht leer sein.");
	if (!state.core.economicOperatorId.trim())
		errors.push("Wirtschaftsakteur darf nicht leer sein.");

	const checkElement = (element: DataElement, context: string) => {
		if (!element.elementId.trim()) errors.push(`${context}: Element-ID fehlt.`);
		if (element.kind === "multi" && element.valueList.length === 0) {
			errors.push(`${context}: Werteliste braucht mindestens einen Eintrag.`);
		}
		if (element.kind === "document") {
			if (!element.blobObjectId.trim())
				errors.push(`${context}: Blob-Objekt-ID fehlt.`);
			if (!element.filename.trim()) errors.push(`${context}: Dateiname fehlt.`);
			if (!element.contentType.trim())
				errors.push(`${context}: Content-Type fehlt.`);
		}
	};

	state.dataElements.forEach((draft, index) => {
		checkElement(
			draft.element,
			`Element „${draft.element.elementId || `#${index + 1}`}“`,
		);
	});
	state.collections.forEach((collection, index) => {
		const label = `Collection „${collection.elementId || `#${index + 1}`}“`;
		if (!collection.elementId.trim())
			errors.push(`${label}: Element-ID fehlt.`);
		// What gets saved is the sum of filled dictionary fields and free
		// elements. Counting only `dataElements` would make a collection whose
		// fields all come from the dictionary look empty.
		const filledFields = collection.dictionaryFields.filter(
			dictionaryFieldFilled,
		).length;
		if (collection.dataElements.length + filledFields === 0) {
			errors.push(`${label}: braucht mindestens ein ausgefülltes Feld.`);
		}
		collection.dataElements.forEach((draft, elementIndex) => {
			checkElement(
				draft.element,
				`${label} → „${draft.element.elementId || `#${elementIndex + 1}`}“`,
			);
		});
	});

	return errors;
}

// Multi-value entries need a non-empty elementId server-side; backfill any the
// user did not (and cannot) set.
function normalizeElement(element: DataElement): DataElement {
	if (element.kind !== "multi") return element;
	return {
		...element,
		valueList: element.valueList.map((entry, index) =>
			entry.elementId.trim()
				? entry
				: { ...entry, elementId: `${element.elementId}-${index + 1}` },
		),
	};
}

// The server merges the snapshot flat over the stored one, so collections and
// dataElements are always sent as complete arrays. facilityId is sent as ""
// (not omitted) so clearing the field actually clears it on the server.
function buildSnapshotPatch(state: EditorState): DppSnapshotPatch {
	// Filled dictionary fields become single/document elements; empty optional
	// fields are omitted entirely (element removed on save).
	const dictionaryElements = state.dictionaryFields
		.map((draft) => dictionaryFieldElement(draft))
		.filter((element): element is DataElement => element !== undefined);

	return {
		collections: state.collections.map((collection) => ({
			// Dictionary fields first, then what has no entry: the same order the
			// collection displays them in.
			dataElements: [
				...collection.dictionaryFields
					.map((draft) => dictionaryFieldElement(draft))
					.filter((element): element is DataElement => element !== undefined),
				...collection.dataElements.map((draft) =>
					normalizeElement(draft.element),
				),
			],
			dictionaryReference: collection.dictionaryReference,
			elementId: collection.elementId.trim(),
			kind: "collection" as const,
			name: collection.name,
			policy: collection.policy,
			publicEligible: collection.publicEligible,
			visibility: collection.visibility,
		})),
		dataElements: [
			...dictionaryElements,
			...state.dataElements.map((draft) => normalizeElement(draft.element)),
		],
		dppSchemaVersion: state.core.dppSchemaVersion.trim(),
		economicOperatorId: state.core.economicOperatorId.trim(),
		facilityId: state.core.facilityId.trim(),
		granularity: state.core.granularity.trim(),
		productId: state.core.productId.trim(),
	};
}

// Maps the 403 DPP_ELEMENT_WRITE_FORBIDDEN message ("Role X may not write a,
// b; may not change the access policy of c") to element paths so the errors
// can be rendered next to the offending elements instead of generically.
function extractElementErrors(message: string): Record<string, string> {
	const map: Record<string, string> = {};
	const assign = (regex: RegExp, text: string) => {
		const match = regex.exec(message);
		const group = match?.[1];
		if (!group) return;
		for (const path of group
			.split(",")
			.map((part) => part.trim())
			.filter(Boolean)) {
			map[path] = text;
		}
	};
	assign(
		/may not write ([^;]+)/,
		"Keine Schreibberechtigung für dieses Element (403): Ihre Rolle ist nicht in den writeRoles der gespeicherten Policy.",
	);
	assign(
		/may not change the access policy of ([^;]+)/,
		"Sichtbarkeits- und Policy-Änderungen an bestehenden Elementen sind Admins vorbehalten (403).",
	);
	return map;
}

export function DppEditor({
	dppId,
	onExit,
	payload,
	role,
}: {
	dppId: string;
	onExit: () => void;
	payload: DppViewPayload;
	role: OrganizationRole;
}) {
	const queryClient = useQueryClient();
	const organizationId = useActiveOrganizationId();
	// Dictionary linkage via dppSchemaVersion = "{repositoryKey}/{version}";
	// based on the stored snapshot, so mid-edit changes of the schema field
	// only take effect after saving and reloading.
	const linkedDictionary = useMemo(
		() => resolveLinkedDictionary(payload),
		[payload],
	);
	// Built once, used everywhere: view and editor resolve display names by the
	// same rule.
	const dictionaryIndex = useMemo(
		() => indexDictionaryEntries(linkedDictionary.entries),
		[linkedDictionary],
	);

	// Dictionary entries whose value is maintained in a collection. They do not
	// get their own field, but the UI states where they are.
	const entriesInCollections = useMemo(
		() =>
			entriesCoveredByCollections(
				resolveLinkedDictionary(payload).entries,
				payload.dpp.collections,
			),
		[payload],
	);
	const [state, setState] = useState<EditorState>(() =>
		snapshotToState(
			payload.dpp,
			resolveLinkedDictionary(payload).entries,
			role,
		),
	);
	const [dirty, setDirty] = useState(false);
	// How many fields the dictionary contributes to this passport - top level
	// **and** collections.
	const dictionaryFieldCount =
		state.dictionaryFields.length +
		state.collections.reduce(
			(total, collection) => total + collection.dictionaryFields.length,
			0,
		);

	const [banner, setBanner] = useState<Banner | null>(null);
	const [validationErrors, setValidationErrors] = useState<string[]>([]);
	const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
	const [dictionaryErrors, setDictionaryErrors] = useState<
		Record<string, string>
	>({});

	const isAdmin = role === "admin";

	// Element paths of the stored snapshot: policy/visibility of these may only
	// be changed by admins (server-enforced), so lock the controls for others.
	const originalPaths = useMemo(() => {
		const paths = new Set<string>();
		for (const element of payload.dpp.dataElements)
			paths.add(element.elementId);
		for (const collection of payload.dpp.collections) {
			paths.add(collection.elementId);
			for (const element of collection.dataElements) {
				paths.add(`${collection.elementId}/${element.elementId}`);
			}
		}
		return paths;
	}, [payload.dpp]);

	const operators = useQuery({
		queryKey: ["catalog", "operators"],
		queryFn: listEconomicOperators,
	});
	const products = useQuery({
		queryKey: ["catalog", "products"],
		queryFn: listProducts,
	});
	const facilities = useQuery({
		queryKey: ["catalog", "facilities"],
		queryFn: listFacilities,
	});
	const productListId = useId();

	// A facility already set but that the list does not (or no longer) know
	// stays selectable - otherwise the form would silently remove it on the
	// next save. Same pattern as for the economic operator below.
	const facilityOptions = useMemo(() => {
		const options = (facilities.data ?? []).map((facility) => ({
			label: `${facility.name} (${facility.facilityId})`,
			value: facility.facilityId,
		}));
		const current = state.core.facilityId;
		if (current && !options.some((option) => option.value === current)) {
			options.unshift({ label: current, value: current });
		}
		return options;
	}, [facilities.data, state.core.facilityId]);

	const operatorOptions = useMemo(() => {
		const options = (operators.data ?? []).map((operator) => ({
			label: `${operator.operatorId} / ${operator.legalName}`,
			value: operator.operatorId,
		}));
		const current = state.core.economicOperatorId;
		if (current && !options.some((option) => option.value === current)) {
			options.unshift({ label: current, value: current });
		}
		return options;
	}, [operators.data, state.core.economicOperatorId]);

	useBlocker({
		disabled: !dirty,
		enableBeforeUnload: () => dirty,
		shouldBlockFn: () =>
			!window.confirm(
				"Es gibt ungespeicherte Änderungen. Seite wirklich verlassen?",
			),
	});

	const update = (updater: (previous: EditorState) => EditorState) => {
		setState(updater);
		setDirty(true);
	};

	const saveMutation = useMutation({
		mutationFn: () => patchDpp(dppId, buildSnapshotPatch(state)),
		onSuccess: (dpp) => {
			setState(snapshotToState(dpp, linkedDictionary.entries, role));
			setDirty(false);
			setFieldErrors({});
			setValidationErrors([]);
			setDictionaryErrors({});
			setBanner({ kind: "success", text: "Änderungen gespeichert." });
			void queryClient.invalidateQueries({
				queryKey: ["dpp-view", organizationId, dppId],
			});
			void queryClient.invalidateQueries({ queryKey: ["dashboard", "dpps"] });
		},
		onError: (error: unknown) => {
			setValidationErrors([]);
			if (error instanceof ApiError) {
				if (error.code === "DPP_ELEMENT_WRITE_FORBIDDEN") {
					const elementErrors = extractElementErrors(error.message);
					setFieldErrors(elementErrors);
					setBanner({
						kind: "error",
						text:
							Object.keys(elementErrors).length > 0
								? "Speichern abgelehnt (403): Einzelne Elemente verletzen die Zugriffs-Policy – Details stehen an den markierten Elementen."
								: error.message,
					});
					return;
				}
				setFieldErrors({});
				if (error.code === "DPP_NOT_EDITABLE") {
					setBanner({
						kind: "error",
						text: "Dieser DPP ist nicht mehr im Entwurfsstatus (409) und kann nicht bearbeitet werden.",
					});
					return;
				}
				if (error.code === "DPP_CONCURRENT_MODIFICATION") {
					setBanner({
						kind: "error",
						text: "Der DPP wurde parallel geändert (409). Bitte die Ansicht neu laden und die Änderungen erneut anwenden.",
					});
					return;
				}
				setBanner({ kind: "error", text: error.message });
				return;
			}
			setFieldErrors({});
			setBanner({
				kind: "error",
				text: "Speichern fehlgeschlagen. Bitte erneut versuchen.",
			});
		},
	});

	const handleSave = () => {
		const errors = validateState(state);
		const dictErrors: Record<string, string> = {};
		for (const draft of state.dictionaryFields) {
			const message = validateDictionaryField(draft);
			if (message) dictErrors[draft.entry.entryKey] = message;
		}
		// Fields inside collections obey the same rules - otherwise an invalid
		// value there would flow into the passport unchecked.
		for (const collection of state.collections) {
			for (const draft of collection.dictionaryFields) {
				const message = validateDictionaryField(draft);
				if (message) dictErrors[draft.entry.entryKey] = message;
			}
		}
		const dictErrorCount = Object.keys(dictErrors).length;
		const allErrors =
			dictErrorCount > 0
				? [
						...errors,
						`Dictionary-Felder: ${dictErrorCount} ${dictErrorCount === 1 ? "Feld ist" : "Felder sind"} unvollständig oder ungültig – Details stehen an den markierten Feldern.`,
					]
				: errors;
		setValidationErrors(allErrors);
		setDictionaryErrors(dictErrors);
		if (allErrors.length > 0) {
			setBanner(null);
			return;
		}
		saveMutation.mutate();
	};

	const handleExit = () => {
		if (
			dirty &&
			!window.confirm(
				"Es gibt ungespeicherte Änderungen. Bearbeitung wirklich beenden?",
			)
		) {
			return;
		}
		onExit();
	};

	const addElement = (kind: DataElement["kind"], collectionUid?: string) => {
		const draft: ElementDraft = {
			element: newElement(kind, role),
			uid: makeUid(),
		};
		update((previous) =>
			collectionUid === undefined
				? { ...previous, dataElements: [...previous.dataElements, draft] }
				: {
						...previous,
						collections: previous.collections.map((collection) =>
							collection.uid === collectionUid
								? {
										...collection,
										dataElements: [...collection.dataElements, draft],
									}
								: collection,
						),
					},
		);
	};

	const updateCollection = (
		uid: string,
		updater: (collection: CollectionDraft) => CollectionDraft,
	) => {
		update((previous) => ({
			...previous,
			collections: previous.collections.map((collection) =>
				collection.uid === uid ? updater(collection) : collection,
			),
		}));
	};

	// Section anchors for the sticky navigation rail (purely presentational).
	const dictionaryGroups = useMemo(
		() =>
			groupDictionaryDrafts(
				state.dictionaryFields,
				linkedDictionary.repository,
			),
		[state.dictionaryFields, linkedDictionary.repository],
	);
	const navItems = [
		{
			count: undefined as string | undefined,
			id: "sec-stammdaten",
			label: "Stammdaten",
		},
		...dictionaryGroups.map((group) => ({
			count: `${group.drafts.filter(dictionaryFieldFilled).length}/${group.drafts.length}`,
			id: `dict-${group.category.id}`,
			label: group.category.label,
		})),
		...state.collections.map((collection) => ({
			count: `${collection.dictionaryFields.filter(dictionaryFieldFilled).length}/${collection.dictionaryFields.length + collection.dataElements.length}`,
			id: `coll-${collection.uid}`,
			label: collectionLabel(collection),
		})),
		{
			count: String(state.dataElements.length),
			id: "sec-weitere",
			label: "Weitere Felder",
		},
		{
			count: String(payload.relationships.length),
			id: "sec-beziehungen",
			label: "Beziehungen",
		},
	];

	return (
		<div className="min-h-screen bg-background">
			<AppNavbar />
			<main className="mx-auto grid w-full max-w-[1400px] gap-4 px-4 py-6 sm:px-6 lg:px-8">
				{/* Breadcrumb */}
				<div className="flex flex-wrap items-center gap-1.5 text-[12.5px] text-muted-foreground">
					<Link
						className="transition-colors hover:text-primary"
						to="/dashboard"
					>
						Übersicht
					</Link>
					<span aria-hidden>/</span>
					<span className="truncate">{payload.dpp.productId}</span>
					<span aria-hidden>/</span>
					<span className="font-semibold text-foreground">Bearbeiten</span>
				</div>

				{/* Editor header card: identity left, actions right.
				    Sticks to the top edge: in a form this long, "Save" would otherwise
				    only be reachable at the top of the page, and the unsaved-changes
				    notice would be out of view while typing. The surrounding strip is
				    opaque and reaches to the edges so nothing shows through next to
				    the rounded corners while scrolling. */}
				<div className="sticky top-0 z-30 -mx-4 bg-background px-4 py-2 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
					<section className="flex flex-wrap items-center gap-4 rounded-xl border bg-card px-5 py-4 shadow-sm">
						<div className="min-w-0 flex-1">
							<div className="flex flex-wrap items-center gap-2.5">
								<h1 className="text-lg font-bold tracking-tight">
									{state.core.productId || "Entwurf bearbeiten"}
								</h1>
								<span className="inline-flex rounded-full border px-2.5 py-1 text-[11.5px] font-semibold text-muted-foreground">
									{statusLabel(payload.dpp.status)}
								</span>
								{dirty ? (
									<Badge
										className="border-amber-500/50 text-amber-600 dark:text-amber-500"
										variant="outline"
									>
										Ungespeicherte Änderungen
									</Badge>
								) : null}
							</div>
							<p className="mt-1 truncate font-mono text-xs text-muted-foreground">
								{payload.dpp.digitalProductPassportId} ·{" "}
								{payload.dpp.dppSchemaVersion}
							</p>
						</div>
						<div className="flex flex-wrap items-center gap-2">
							<Button onClick={handleExit} type="button" variant="outline">
								<X className="size-4" />
								Bearbeitung beenden
							</Button>
							<Button
								disabled={saveMutation.isPending || !dirty}
								onClick={handleSave}
								type="button"
							>
								<Save className="size-4" />
								{saveMutation.isPending ? "Speichert …" : "Speichern"}
							</Button>
						</div>
					</section>
				</div>

				{banner ? (
					<Alert variant={banner.kind === "error" ? "destructive" : "default"}>
						{banner.kind === "error" ? (
							<AlertTriangle className="size-4" />
						) : (
							<CheckCircle2 className="size-4" />
						)}
						<AlertTitle>
							{banner.kind === "error" ? "Speichern fehlgeschlagen" : "Erfolg"}
						</AlertTitle>
						<AlertDescription>{banner.text}</AlertDescription>
					</Alert>
				) : null}

				{validationErrors.length > 0 ? (
					<Alert variant="destructive">
						<AlertTriangle className="size-4" />
						<AlertTitle>Eingaben unvollständig</AlertTitle>
						<AlertDescription>
							<ul className="list-disc pl-4">
								{validationErrors.map((error) => (
									<li key={error}>{error}</li>
								))}
							</ul>
						</AlertDescription>
					</Alert>
				) : null}

				{/* Layout: sticky section nav (xl) · form column · sticky info rail */}
				<div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_300px] xl:grid-cols-[230px_minmax(0,1fr)_300px]">
					<nav
						aria-label="Formularabschnitte"
						className="sticky top-28 hidden rounded-xl border bg-card p-2 xl:block"
					>
						{navItems.map((item) => (
							<a
								className="flex items-center justify-between gap-2 rounded-lg px-3 py-2 text-[13px] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
								href={`#${item.id}`}
								key={item.id}
							>
								<span className="truncate">{item.label}</span>
								{item.count !== undefined ? (
									<span className="shrink-0 font-mono text-[10.5px]">
										{item.count}
									</span>
								) : null}
							</a>
						))}
					</nav>

					<div className="grid min-w-0 gap-5">
						<Card className="scroll-mt-28" id="sec-stammdaten">
							<CardHeader>
								<CardTitle>Stammdaten</CardTitle>
								<CardDescription>
									Kernfelder des Produktpasses. Identität und Status werden
									serverseitig verwaltet und sind nicht editierbar.
								</CardDescription>
							</CardHeader>
							<CardContent className="grid gap-4 sm:grid-cols-2">
								<Field>
									<FieldLabel>Produkt-ID</FieldLabel>
									{/* Suggestions, not a constraint: a passport may carry a
									    product id for which there is no master data record. */}
									<Input
										list={productListId}
										onChange={(event) =>
											update((previous) => ({
												...previous,
												core: {
													...previous.core,
													productId: event.target.value,
												},
											}))
										}
										value={state.core.productId}
									/>
									<datalist id={productListId}>
										{(products.data ?? []).map((product) => (
											<option key={product.productId} value={product.productId}>
												{label(product.name)}
											</option>
										))}
									</datalist>
								</Field>
								<Field>
									<FieldLabel>Wirtschaftsakteur</FieldLabel>
									<Select
										onValueChange={(value) =>
											update((previous) => ({
												...previous,
												core: {
													...previous.core,
													economicOperatorId: value ?? "",
												},
											}))
										}
										value={state.core.economicOperatorId}
									>
										<SelectTrigger className="w-full">
											<SelectValue placeholder="Wirtschaftsakteur wählen" />
										</SelectTrigger>
										<SelectContent>
											{operatorOptions.map((option) => (
												<SelectItem key={option.value} value={option.value}>
													{option.label}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</Field>
								<Field>
									<FieldLabel>Granularität</FieldLabel>
									<Input
										onChange={(event) =>
											update((previous) => ({
												...previous,
												core: {
													...previous.core,
													granularity: event.target.value,
												},
											}))
										}
										value={state.core.granularity}
									/>
								</Field>
								<Field>
									<FieldLabel>Schema-Version</FieldLabel>
									<Input
										onChange={(event) =>
											update((previous) => ({
												...previous,
												core: {
													...previous.core,
													dppSchemaVersion: event.target.value,
												},
											}))
										}
										value={state.core.dppSchemaVersion}
									/>
								</Field>
								<Field>
									<FieldLabel>Standort (optional)</FieldLabel>
									{/* Selection instead of free text: a named facility must
									    exist (G21). */}
									<Select
										onValueChange={(value) =>
											update((previous) => ({
												...previous,
												core: {
													...previous.core,
													facilityId:
														!value || value === NO_FACILITY ? "" : value,
												},
											}))
										}
										value={state.core.facilityId || NO_FACILITY}
									>
										<SelectTrigger className="w-full">
											<SelectValue>
												{state.core.facilityId
													? (facilityOptions.find(
															(option) =>
																option.value === state.core.facilityId,
														)?.label ?? state.core.facilityId)
													: "Kein Standort"}
											</SelectValue>
										</SelectTrigger>
										<SelectContent>
											<SelectItem value={NO_FACILITY}>Kein Standort</SelectItem>
											{facilityOptions.map((option) => (
												<SelectItem key={option.value} value={option.value}>
													{option.label}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</Field>
							</CardContent>
						</Card>

						{/* Only present when there is actually something to fetch - the
						    card decides this itself and otherwise renders nothing. */}
						<DictionaryUpgradeCard
							currentVersion={
								linkedDictionary.repository?.version ??
								state.core.dppSchemaVersion
							}
							dppId={dppId}
							onApply={(dppSchemaVersion) =>
								update((previous) => ({
									...previous,
									core: { ...previous.core, dppSchemaVersion },
								}))
							}
						/>

						{linkedDictionary.repository ? (
							<DictionaryFormSection
								activeRole={role}
								drafts={state.dictionaryFields}
								inCollections={entriesInCollections}
								errors={dictionaryErrors}
								isAdmin={isAdmin}
								onChangeDraft={(uid, updater) =>
									update((previous) => ({
										...previous,
										dictionaryFields: previous.dictionaryFields.map((draft) =>
											draft.uid === uid ? updater(draft) : draft,
										),
									}))
								}
								originalPaths={originalPaths}
								repository={linkedDictionary.repository}
								serverErrors={fieldErrors}
							/>
						) : (
							<Alert>
								<Info className="size-4" />
								<AlertTitle>Kein Dictionary verknüpft</AlertTitle>
								<AlertDescription>
									Die Schema-Version „{state.core.dppSchemaVersion}“ passt zu
									keinem verfügbaren Dictionary-Repository. Es steht daher kein
									vordefiniertes Formular zur Verfügung – Felder können unten
									unter „Weitere Felder“ frei angelegt werden.
								</AlertDescription>
							</Alert>
						)}

						{/* The passport's collections - with the same typed fields as the
						    category cards, no longer in the raw editor. They sit in the
						    main flow and in the left navigation because they carry most
						    of the data here. */}
						{state.collections.map((collection) => (
							<CollectionEditor
								activeRole={role}
								collection={collection}
								dictionaryIndex={dictionaryIndex}
								fieldErrors={fieldErrors}
								key={collection.uid}
								onAddElement={(kind) => addElement(kind, collection.uid)}
								onChange={(updater) =>
									updateCollection(collection.uid, updater)
								}
								onRemove={() =>
									update((previous) => ({
										...previous,
										collections: previous.collections.filter(
											(entry) => entry.uid !== collection.uid,
										),
									}))
								}
								originalPaths={originalPaths}
							/>
						))}

						<div className="scroll-mt-28" id="sec-weitere">
							<Collapsible
								className="grid gap-6"
								defaultOpen={
									!linkedDictionary.repository ||
									state.dataElements.length + state.collections.length > 0
								}
							>
								<CollapsibleTrigger
									render={
										<Button
											className="group w-full justify-between"
											type="button"
											variant="outline"
										/>
									}
								>
									<span className="flex items-center gap-2">
										Weitere Felder
										<Badge variant="secondary">
											{state.dataElements.length + state.collections.length}
										</Badge>
									</span>
									<ChevronDown className="size-4 transition-transform group-data-[panel-open]:rotate-180" />
								</CollapsibleTrigger>
								<CollapsibleContent className="grid gap-6">
									<Card>
										<CardHeader>
											<CardTitle>Datenelemente</CardTitle>
											<CardDescription>
												Ad-hoc-Elemente ohne Zuordnung zu einem
												Dictionary-Eintrag des verknüpften Repositories:
												Einzelwerte, Wertelisten und Dokumentreferenzen.
											</CardDescription>
										</CardHeader>
										<CardContent className="grid gap-3">
											{state.dataElements.length === 0 ? (
												<p className="text-sm text-muted-foreground">
													Noch keine Datenelemente vorhanden.
												</p>
											) : null}
											{state.dataElements.map((draft) => (
												<ElementEditor
													activeRole={role}
													dictionaryEntries={dictionaryIndex}
													element={draft.element}
													key={draft.uid}
													onChange={(element) =>
														update((previous) => ({
															...previous,
															dataElements: previous.dataElements.map(
																(entry) =>
																	entry.uid === draft.uid
																		? { ...entry, element }
																		: entry,
															),
														}))
													}
													onRemove={() =>
														update((previous) => ({
															...previous,
															dataElements: previous.dataElements.filter(
																(entry) => entry.uid !== draft.uid,
															),
														}))
													}
													policyLocked={
														!isAdmin &&
														originalPaths.has(draft.element.elementId)
													}
													serverError={fieldErrors[draft.element.elementId]}
												/>
											))}
											<AddElementButtons onAdd={(kind) => addElement(kind)} />
										</CardContent>
									</Card>

									<div>
										<Button
											onClick={() =>
												update((previous) => ({
													...previous,
													collections: [
														...previous.collections,
														{
															dataElements: [],
															dictionaryFields: [],
															elementId: "",
															policy: defaultPolicyForRole(role),
															uid: makeUid(),
															visibility: "controlled",
														},
													],
												}))
											}
											size="sm"
											type="button"
											variant="outline"
										>
											<FolderPlus className="size-4" />
											Sammlung hinzufügen
										</Button>
									</div>
								</CollapsibleContent>
							</Collapsible>
						</div>

						<div className="scroll-mt-28" id="sec-beziehungen">
							<RelationshipEditor
								dppId={dppId}
								relationships={payload.relationships}
							/>
						</div>
					</div>

					{/* Info rail */}
					<aside className="grid gap-4 lg:sticky lg:top-28">
						{linkedDictionary.repository ? (
							<div className="rounded-xl border bg-card p-4">
								<h2 className="text-[13px] font-bold">Aus dem Dictionary</h2>
								<p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
									Die Feldstruktur dieses Passes folgt{" "}
									<b className="font-semibold text-foreground">
										{label(linkedDictionary.repository.name)}
									</b>
									.
								</p>
								<p className="mt-2 font-mono text-[11px] text-muted-foreground">
									{linkedDictionary.repository.repositoryKey}/
									{linkedDictionary.repository.version} ·{" "}
									{/* All fields from the dictionary, not only the top-level
									    ones: in this passport 24 of 29 sit in collections, and
									    "5 fields" would simply be wrong. */}
									{dictionaryFieldCount}{" "}
									{dictionaryFieldCount === 1 ? "Feld" : "Felder"}
								</p>
							</div>
						) : null}
						{!isAdmin ? (
							<div className="rounded-xl border bg-card p-4">
								<h2 className="flex items-center gap-1.5 text-[13px] font-bold">
									<Info className="size-3.5 text-muted-foreground" />
									Rolle „{roleLabels[role]}“
								</h2>
								<p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
									Elemente, die für Ihre Rolle nicht lesbar sind, erscheinen
									hier nicht. Sichtbarkeits- und Policy-Änderungen an
									bestehenden Elementen sind Admins vorbehalten.
								</p>
							</div>
						) : null}
						<div className="dark rounded-xl border bg-card p-4 text-card-foreground">
							<h2 className="text-[13px] font-semibold">Entwurf</h2>
							<p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
								Änderungen werden erst mit „Speichern“ in den Produktpass
								übernommen.
							</p>
						</div>
					</aside>
				</div>
			</main>
		</div>
	);
}

function CollectionEditor({
	activeRole,
	collection,
	dictionaryIndex,
	fieldErrors,
	onAddElement,
	onChange,
	onRemove,
	originalPaths,
}: {
	activeRole: OrganizationRole;
	collection: CollectionDraft;
	dictionaryIndex: Map<string, DictionaryEntry>;
	fieldErrors: Record<string, string>;
	onAddElement: (kind: DataElement["kind"]) => void;
	onChange: (updater: (collection: CollectionDraft) => CollectionDraft) => void;
	onRemove: () => void;
	originalPaths: Set<string>;
}) {
	const isAdmin = activeRole === "admin";
	const policyLocked = !isAdmin && originalPaths.has(collection.elementId);
	const collectionError = fieldErrors[collection.elementId];

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

	const filled = collection.dictionaryFields.filter(
		dictionaryFieldFilled,
	).length;
	const total =
		collection.dictionaryFields.length + collection.dataElements.length;

	return (
		<Card className="scroll-mt-28" id={`coll-${collection.uid}`}>
			<CardHeader>
				<div className="flex flex-wrap items-baseline justify-between gap-2">
					<CardTitle>{collectionLabel(collection)}</CardTitle>
					<div className="flex items-center gap-2">
						<Badge variant="outline">
							{collection.visibility === "public" ? "Public" : "Controlled"}
						</Badge>
						<span className="font-mono text-[11px] text-muted-foreground">
							{filled}/{total} Felder
						</span>
					</div>
				</div>
				{/* The technical identifier stays readable, but it is no longer the
				    heading. */}
				<CardDescription className="font-mono text-[11px]">
					{collection.elementId || "Neue Sammlung"}
				</CardDescription>
			</CardHeader>
			<CardContent className="grid gap-4">
				{collectionError ? (
					<p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
						{collectionError}
					</p>
				) : null}

				{/* The fields the dictionary knows: typed, named, with a unit - the
			    same presentation as in the category cards. */}
				{collection.dictionaryFields.length > 0 ? (
					<div className="grid items-start gap-4 sm:grid-cols-2">
						{collection.dictionaryFields.map((draft) => (
							<DictionaryFieldEditor
								activeRole={activeRole}
								draft={draft}
								error={
									fieldErrors[
										`${collection.elementId}/${draft.existedPath ?? draft.entry.entryKey}`
									]
								}
								key={draft.uid}
								onChange={(updater) =>
									onChange((previous) => ({
										...previous,
										dictionaryFields: previous.dictionaryFields.map((field) =>
											field.uid === draft.uid ? updater(field) : field,
										),
									}))
								}
								policyLocked={
									!isAdmin &&
									originalPaths.has(
										`${collection.elementId}/${draft.existedPath ?? draft.entry.entryKey}`,
									)
								}
							/>
						))}
					</div>
				) : null}

				<Collapsible>
					<CollapsibleTrigger className="flex items-center gap-1.5 text-[12px] text-muted-foreground hover:text-foreground">
						<ChevronDown className="size-3.5" />
						Einstellungen der Sammlung
					</CollapsibleTrigger>
					<CollapsibleContent className="grid gap-3 pt-3">
						<div className="grid gap-3 sm:grid-cols-3">
							<Field>
								<FieldLabel>Element-ID</FieldLabel>
								<Input
									onChange={(event) =>
										onChange((previous) => ({
											...previous,
											elementId: event.target.value,
										}))
									}
									placeholder="z. B. battery-data"
									value={collection.elementId}
								/>
							</Field>
							<Field>
								<FieldLabel>Name (de)</FieldLabel>
								<Input
									onChange={(event) =>
										onChange((previous) => ({
											...previous,
											name: event.target.value
												? { ...previous.name, de: event.target.value }
												: undefined,
										}))
									}
									value={collection.name?.de ?? ""}
								/>
							</Field>
							<Field>
								<FieldLabel>Sichtbarkeit</FieldLabel>
								<Select
									items={{ controlled: "Controlled", public: "Public" }}
									onValueChange={(value) =>
										changeVisibility(
											value === "public" ? "public" : "controlled",
										)
									}
									value={collection.visibility}
								>
									<SelectTrigger className="w-full" disabled={policyLocked}>
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="controlled">Controlled</SelectItem>
										<SelectItem value="public">Public</SelectItem>
									</SelectContent>
								</Select>
							</Field>
						</div>

						{collection.visibility === "controlled" ? (
							<PolicyPicker
								disabled={policyLocked}
								onChange={(policy) =>
									onChange((previous) => ({ ...previous, policy }))
								}
								policy={collection.policy}
							/>
						) : null}
						{collection.visibility === "controlled" &&
						!(
							collection.policy &&
							(collection.policy.readRoles.length > 0 ||
								collection.policy.writeRoles.length > 0)
						) ? (
							<p className="text-xs text-amber-600 dark:text-amber-500">
								Ohne Policy ist diese Controlled-Collection nur für Admins
								zugänglich (fail-closed).
							</p>
						) : null}
						{policyLocked ? (
							<p className="text-xs text-muted-foreground">
								Sichtbarkeit und Policy bestehender Sammlungen können nur Admins
								ändern.
							</p>
						) : null}

						<div>
							<Button
								aria-label="Sammlung entfernen"
								onClick={onRemove}
								size="sm"
								type="button"
								variant="ghost"
							>
								<Trash2 className="size-3.5" />
								Sammlung entfernen
							</Button>
						</div>
					</CollapsibleContent>
				</Collapsible>

				{/* Whatever the dictionary does not know stays in the free-form
			    editor - visible, but out of the way. */}
				<Collapsible defaultOpen={collection.dictionaryFields.length === 0}>
					<CollapsibleTrigger className="flex items-center gap-1.5 text-[12px] text-muted-foreground hover:text-foreground">
						<ChevronDown className="size-3.5" />
						Freie Felder dieser Sammlung ({collection.dataElements.length})
					</CollapsibleTrigger>
					<CollapsibleContent className="grid gap-3 pt-3">
						{collection.dataElements.map((draft) => (
							<ElementEditor
								activeRole={activeRole}
								dictionaryEntries={dictionaryIndex}
								element={draft.element}
								key={draft.uid}
								onChange={(element) =>
									onChange((previous) => ({
										...previous,
										dataElements: previous.dataElements.map((entry) =>
											entry.uid === draft.uid ? { ...entry, element } : entry,
										),
									}))
								}
								onRemove={() =>
									onChange((previous) => ({
										...previous,
										dataElements: previous.dataElements.filter(
											(entry) => entry.uid !== draft.uid,
										),
									}))
								}
								policyLocked={
									!isAdmin &&
									originalPaths.has(
										`${collection.elementId}/${draft.element.elementId}`,
									)
								}
								serverError={
									fieldErrors[
										`${collection.elementId}/${draft.element.elementId}`
									]
								}
							/>
						))}
						<AddElementButtons onAdd={onAddElement} />
					</CollapsibleContent>
				</Collapsible>
			</CardContent>
		</Card>
	);
}

function AddElementButtons({
	onAdd,
}: {
	onAdd: (kind: DataElement["kind"]) => void;
}) {
	return (
		<div className="flex flex-wrap gap-2">
			<Button
				onClick={() => onAdd("single")}
				size="sm"
				type="button"
				variant="outline"
			>
				<Plus className="size-3.5" />
				<Type className="size-3.5" />
				Einzelwert
			</Button>
			<Button
				onClick={() => onAdd("multi")}
				size="sm"
				type="button"
				variant="outline"
			>
				<Plus className="size-3.5" />
				<List className="size-3.5" />
				Werteliste
			</Button>
			<Button
				onClick={() => onAdd("document")}
				size="sm"
				type="button"
				variant="outline"
			>
				<Plus className="size-3.5" />
				<FileText className="size-3.5" />
				Dokument
			</Button>
		</div>
	);
}
