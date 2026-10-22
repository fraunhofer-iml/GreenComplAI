import type {
	DataElement,
	DataElementCollection,
	DppRelationshipResponse,
	DppStatus,
	DppViewResponse,
	ElementPolicy,
	EntryDisplayMetadata,
	DppSnapshot as SchemaDppSnapshot,
	TranslatableString,
	Visibility,
} from "@dpp/schemas";
import { useQuery } from "@tanstack/react-query";

import { apiRequest } from "#/features/api/client";
import { publicBlobDownloadUrl } from "#/features/blobs/blobs-api";
import { getActiveOrganizationId } from "#/features/organization/organization-store";

// The wire shapes come from the API's response schemas. What follows below
// (Resolved*, SummaryFact) are UI shapes - they have no counterpart in the
// API and therefore stay here.
export type {
	DataElement,
	DppStatus,
	ElementPolicy,
	EntryDisplayMetadata,
	TranslatableString,
	Visibility,
};
export type DppCollection = DataElementCollection;
export type DppSnapshot = SchemaDppSnapshot;
export type DppRelationship = DppRelationshipResponse;
export type DppViewPayload = DppViewResponse;
// Entry and repository in the shape the view response carries them - not
// described twice, but derived from the list they live in.
export type DictionaryEntry = DppViewResponse["dictionaryEntries"][number];
export type DictionaryRepository =
	DppViewResponse["dictionaryRepositories"][number];

export type ResolvedElement = {
	blobObjectId?: string;
	display?: EntryDisplayMetadata | null;
	id: string;
	kind: DataElement["kind"];
	label: string;
	required: boolean;
	unit?: string | null;
	value: string;
	url?: string;
	valueType: string;
	visibility: Visibility;
};

export type ResolvedCollection = {
	elements: ResolvedElement[];
	id: string;
	name: string;
	visibility: Visibility;
};

export type ResolvedMetricGroup = {
	elements: ResolvedElement[];
	id: string;
	order: number;
	title: string;
};

export type SummaryFact = {
	id: "operator" | "facility" | "granularity" | "schema" | "updated";
	kind: "operator" | "facility" | "granularity" | "schema" | "updated";
	label: string;
	value: string;
};

export async function fetchDppView(dppId: string): Promise<DppViewPayload> {
	const payload = await apiRequest<{ view: DppViewPayload }>(
		`/dpps/${encodeURIComponent(dppId)}/view`,
	);
	return payload.view;
}

export function useDppView(dppId: string) {
	return useQuery({
		queryKey: ["dpp-view", getActiveOrganizationId(), dppId],
		queryFn: () => fetchDppView(dppId),
	});
}

// Which download endpoint the resolved document links target: the tenant-scoped
// one for the authenticated workspace, the anonymous one for the public viewer.
export type ResolveScope = "organization" | "public";

type ResolvableDppPayload = Pick<
	DppViewPayload,
	"dictionaryEntries" | "dictionaryRepositories" | "dpp" | "relationships"
>;

// An element points at a dictionary entry via `dictionaryReference` (falling
// back to its element id). This index is needed in several places - view and
// editor alike - so it lives here instead of being duplicated three times.
export function indexDictionaryEntries(
	entries: DictionaryEntry[],
): Map<string, DictionaryEntry> {
	return new Map(
		entries.flatMap((entry) => {
			const references = [
				entry.canonicalUri,
				entry.entryKey,
				entry.externalId,
			].filter(Boolean) as string[];
			return references.map((reference) => [reference, entry] as const);
		}),
	);
}

export function dictionaryEntryForElement(
	element: Pick<DataElement, "dictionaryReference" | "elementId">,
	index: Map<string, DictionaryEntry>,
): DictionaryEntry | undefined {
	return index.get(element.dictionaryReference ?? element.elementId);
}

// An element's display label. The dictionary name takes precedence over one
// stored on the element: the dictionary is the maintained source, an element
// name is the exception. The element id is the last resort - a technical
// identifier beats a blank line.
export function elementLabel(
	element: Pick<DataElement, "dictionaryReference" | "elementId" | "name">,
	index: Map<string, DictionaryEntry>,
): string {
	const entry = dictionaryEntryForElement(element, index);
	return (
		entry?.name.de ??
		entry?.name.en ??
		element.name?.de ??
		element.name?.en ??
		element.elementId
	);
}

export function resolveDpp(
	payload: ResolvableDppPayload,
	scope: ResolveScope = "organization",
) {
	const entriesByReference = indexDictionaryEntries(payload.dictionaryEntries);

	const resolveElement = (element: DataElement): ResolvedElement => {
		const reference = element.dictionaryReference ?? element.elementId;
		const entry = entriesByReference.get(reference);

		return {
			display: entry?.metadata?.internalDisplay ?? null,
			id: element.elementId,
			kind: element.kind,
			label: elementLabel(element, entriesByReference),
			required: entry?.required ?? false,
			unit: entry?.unit,
			value: formatValue(element),
			// Only the anonymous view gets a ready-made URL. Behind login the id
			// suffices: the browser can't attach the organization header to a
			// plain link, so the file is fetched in two steps instead.
			blobObjectId:
				element.kind === "document"
					? (element.blobObjectId ?? undefined)
					: undefined,
			url: documentUrl(element, scope),
			valueType: entry?.valueType ?? element.kind,
			visibility: element.visibility,
		};
	};

	const core = payload.dpp.dataElements.map(resolveElement);
	const collections = payload.dpp.collections.map((collection) => ({
		elements: collection.dataElements.map(resolveElement),
		id: collection.elementId,
		name: collection.name?.de ?? collection.name?.en ?? collection.elementId,
		visibility: collection.visibility,
	}));
	const allElements = [
		...core,
		...collections.flatMap((collection) => collection.elements),
	];
	const metricGroups = resolveMetricGroups(allElements);
	const summaryFacts = resolveSummaryFacts(payload.dpp);

	return {
		allElements,
		collections,
		controlledCount: allElements.filter(
			(element) => element.visibility === "controlled",
		).length,
		core,
		dpp: payload.dpp,
		metricGroups,
		publicCount: allElements.filter(
			(element) => element.visibility === "public",
		).length,
		relationships: payload.relationships,
		repository: payload.dictionaryRepositories[0],
		summaryFacts,
		totalCount: allElements.length,
	};
}

function resolveSummaryFacts(dpp: DppSnapshot): SummaryFact[] {
	const facts: SummaryFact[] = [
		{
			id: "schema",
			kind: "schema",
			label: "Schema",
			value: dpp.dppSchemaVersion,
		} satisfies SummaryFact,
		{
			id: "updated",
			kind: "updated",
			label: "Aktualisiert",
			value: formatDate(dpp.lastUpdate, "long"),
		} satisfies SummaryFact,
	];

	if (dpp.granularity) {
		facts.unshift({
			id: "granularity",
			kind: "granularity",
			label: "Granularität",
			value: dpp.granularity,
		});
	}
	if (dpp.facilityId) {
		facts.unshift({
			id: "facility",
			kind: "facility",
			label: "Facility",
			value: dpp.facilityId,
		});
	}
	if (dpp.economicOperatorId) {
		facts.unshift({
			id: "operator",
			kind: "operator",
			label: "Wirtschaftsakteur",
			value: dpp.economicOperatorId,
		});
	}

	return facts;
}

function resolveMetricGroups(
	elements: ResolvedElement[],
): ResolvedMetricGroup[] {
	const groups = new Map<string, ResolvedMetricGroup>();

	for (const element of elements) {
		if (element.display?.presentation !== "metric") continue;

		const id = element.display.groupId ?? element.id;
		const existing = groups.get(id);
		const group =
			existing ??
			({
				elements: [],
				id,
				order: element.display.order ?? Number.MAX_SAFE_INTEGER,
				title: element.display.group?.de ?? element.display.group?.en ?? id,
			} satisfies ResolvedMetricGroup);

		group.order = Math.min(
			group.order,
			element.display.order ?? Number.MAX_SAFE_INTEGER,
		);
		group.elements.push(element);
		groups.set(id, group);
	}

	return [...groups.values()]
		.map((group) => ({
			...group,
			elements: group.elements.sort(
				(left, right) =>
					(left.display?.order ?? Number.MAX_SAFE_INTEGER) -
					(right.display?.order ?? Number.MAX_SAFE_INTEGER),
			),
		}))
		.sort((left, right) => left.order - right.order);
}

export function formatDate(value: string, style: "short" | "long" = "short") {
	return new Intl.DateTimeFormat("de-DE", {
		day: "2-digit",
		month: style === "long" ? "long" : "2-digit",
		year: "numeric",
	}).format(new Date(value));
}

export function formatValue(element: DataElement): string {
	if (element.kind === "document") return element.filename;
	if (element.kind === "multi")
		return element.valueList.map((value) => String(value.value)).join(", ");
	if (typeof element.value === "number") {
		return new Intl.NumberFormat("de-DE", { maximumFractionDigits: 2 }).format(
			element.value,
		);
	}
	if (typeof element.value === "boolean") return element.value ? "Ja" : "Nein";
	return String(element.value);
}

// Only the public view gets a direct address: the anonymous endpoint needs no
// header and resolves only for published files anyway. Behind login there is
// no linkable URL - there `openBlobDownload` fetches the presigned URL via
// the id.
export function documentUrl(
	element: DataElement,
	scope: ResolveScope = "organization",
): string | undefined {
	if (element.kind !== "document" || !element.blobObjectId) return undefined;
	if (scope !== "public") return undefined;

	return publicBlobDownloadUrl(element.blobObjectId);
}

export function statusLabel(status: string) {
	const labels: Record<string, string> = {
		archived: "Archiviert",
		draft: "Entwurf",
		published: "Veröffentlicht",
		review: "Prüfung",
	};

	return labels[status] ?? status;
}
