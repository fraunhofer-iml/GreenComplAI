import type {
	ConnectorDictionaryDraft,
	ConnectorDictionaryDraftEntry,
	ConnectorDictionaryResponse,
	ConnectorFieldDecision,
	ConnectorMappedField,
	ConnectorPreviewResponse,
	ConnectorResponse,
	CreateConnectorDictionaryInput,
	ExternalProductResponse,
	ImportedProductResponse,
} from "@dpp/schemas";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { apiRequest } from "#/features/api/client";
import {
	type DictionaryEntry,
	dictionaryEntryCategory,
	label,
	listDictionaryEntriesByRepository,
	listDictionaryRepositories,
} from "#/features/catalog/catalog-api";

export type Connector = ConnectorResponse;
export type ExternalProduct = ExternalProductResponse;
export type ImportedProduct = ImportedProductResponse;
export type ConnectorPreview = ConnectorPreviewResponse;
export type MappedField = ConnectorMappedField;
export type FieldDecision = ConnectorFieldDecision;
export type DictionaryDraft = ConnectorDictionaryDraft;
export type DictionaryDraftEntry = ConnectorDictionaryDraftEntry;

// A dictionary entry as the field mapping needs it: the reference a data
// element names it by, plus the parent category and visibility it brings
// along itself. Both are the right default - the entry knows better where it
// belongs than the import could guess.
export type DictionaryTarget = {
	categoryId: string;
	categoryLabel: string;
	label: string;
	reference: string;
	// The dictionary's name, for reading; its key, for deciding. A passport is
	// validated against exactly one dictionary, so which one an entry belongs to
	// is not decoration - it is what says whether the entry may be used here.
	repository: string;
	repositoryKey: string;
	unit?: string | undefined;
	visibility: "public" | "controlled";
};

export function useDictionaryTargets(enabled: boolean) {
	return useQuery({
		queryKey: ["catalog", "dictionary-targets"],
		enabled,
		queryFn: async (): Promise<DictionaryTarget[]> => {
			const repositories = await listDictionaryRepositories();
			const perRepository = await Promise.all(
				repositories.map(async (repository) => ({
					repository,
					entries: await listDictionaryEntriesByRepository(
						repository.repositoryKey,
					),
				})),
			);

			return perRepository.flatMap(({ entries, repository }) =>
				entries.map((entry) =>
					toTarget(entry, label(repository.name), repository.repositoryKey),
				),
			);
		},
	});
}

function toTarget(
	entry: DictionaryEntry,
	repository: string,
	repositoryKey: string,
): DictionaryTarget {
	const category = dictionaryEntryCategory(entry);

	return {
		categoryId: category.id,
		categoryLabel: category.label,
		label: label(entry.name),
		// Resolved against `canonicalUri`, `entryKey`, or `externalId` - the
		// canonical URI is the most stable of the three.
		reference: entry.canonicalUri ?? entry.entryKey,
		repository,
		repositoryKey,
		unit: entry.unit ?? undefined,
		visibility: entry.visibility,
	};
}

const connectorsKey = ["connectors"];

export function useConnectors(enabled: boolean) {
	return useQuery({
		queryKey: connectorsKey,
		queryFn: async () =>
			(await apiRequest<{ connectors: Connector[] }>("/v1/connectors"))
				.connectors,
		enabled,
	});
}

export function useInstallConnector() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async (input: {
			key: string;
			values: Record<string, string>;
		}) =>
			apiRequest(`/v1/connectors/${encodeURIComponent(input.key)}`, {
				method: "PUT",
				body: { values: input.values },
			}),
		onSuccess: () => {
			void queryClient.invalidateQueries({ queryKey: connectorsKey });
		},
	});
}

export function useSetConnectorStatus() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async (input: { key: string; status: "active" | "disabled" }) =>
			apiRequest(`/v1/connectors/${encodeURIComponent(input.key)}/status`, {
				method: "PUT",
				body: { status: input.status },
			}),
		onSuccess: () => {
			void queryClient.invalidateQueries({ queryKey: connectorsKey });
		},
	});
}

export function useUninstallConnector() {
	const queryClient = useQueryClient();
	return useMutation({
		// The response is 204 with no body - `apiRequest` would fail parsing
		// it, so this checks the status code directly instead.
		mutationFn: async (key: string) => {
			await apiRequest<unknown>(`/v1/connectors/${encodeURIComponent(key)}`, {
				method: "DELETE",
			}).catch((error: unknown) => {
				// An empty body is not an error; anything else is.
				if (error instanceof SyntaxError) return;
				throw error;
			});
		},
		onSuccess: () => {
			void queryClient.invalidateQueries({ queryKey: connectorsKey });
		},
	});
}

export function useTestConnector() {
	return useMutation({
		mutationFn: async (key: string) =>
			apiRequest<{ connection: { ok: true } }>(
				`/v1/connectors/${encodeURIComponent(key)}/test`,
				{ method: "POST" },
			),
	});
}

function previewPath(key: string, externalId: string) {
	return `/v1/connectors/${encodeURIComponent(key)}/products/${encodeURIComponent(externalId)}`;
}

export function previewQueryKey(key: string, externalId: string) {
	return ["connectors", key, "preview", externalId];
}

// Lookup is deliberately a mutation, not a query: it happens when someone
// presses "Search", not when a page appears. As a query, every keystroke in
// the id field would trigger a call to the external system - at a quota of
// three requests per second that is not a small rudeness.
//
// The result is written into the query cache all the same, under the key the
// import screen reads. Opening that screen after a lookup then costs nothing:
// the answer is already here, and asking the ERP a second time for a record
// somebody is currently looking at spends someone else's quota to learn what
// we know.
export function useLookupExternalProduct() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async (input: { key: string; externalId: string }) =>
			apiRequest<ConnectorPreview>(previewPath(input.key, input.externalId)),
		onSuccess: (preview, input) => {
			queryClient.setQueryData(
				previewQueryKey(input.key, input.externalId),
				preview,
			);
		},
	});
}

// The same lookup, for a screen that is addressed by the identifier rather than
// reaching it through a button. The import screen lives at a URL that names the
// record, so it has to be able to answer a reload or a shared link on its own.
//
// `staleTime` is not a performance trick here: without it, every remount would
// go back to the external system for a record the user is in the middle of
// mapping, and a mapping form that reloads its own basis underneath the person
// filling it in is worse than a stale one.
export function usePreviewExternalProduct(key: string, externalId: string) {
	return useQuery({
		queryKey: previewQueryKey(key, externalId),
		queryFn: async () =>
			apiRequest<ConnectorPreview>(previewPath(key, externalId)),
		enabled: Boolean(key && externalId),
		staleTime: 5 * 60 * 1000,
		retry: false,
	});
}

export type ImportRequest = {
	dpp?:
		| {
				dppSchemaVersion: string;
				economicOperatorId: string;
				facilityId?: string;
				granularity: string;
		  }
		| undefined;
	externalId: string;
	fields: FieldDecision[];
	key: string;
};

export function useImportExternalProduct() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async ({ key, ...body }: ImportRequest) =>
			(
				await apiRequest<{ product: ImportedProduct }>(
					`/v1/connectors/${encodeURIComponent(key)}/import`,
					{ method: "POST", body },
				)
			).product,
		onSuccess: () => {
			void queryClient.invalidateQueries({ queryKey: ["catalog", "products"] });
			void queryClient.invalidateQueries({ queryKey: ["dpps"] });
		},
	});
}

// Creating the dictionary a record kind's fields were drafted into.
//
// Its own call, not part of the import: a dictionary is the precondition for
// a mapping, and the mapping is what the import needs. Bundled into one
// request, a passport that fails would take the vocabulary with it.
//
// Every dictionary query is invalidated afterwards - the catalogue now holds
// entries that were not there a moment ago, and the mapping's target list is
// built from exactly those.
export function useCreateConnectorDictionary() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async ({
			key,
			...body
		}: CreateConnectorDictionaryInput & { key: string }) =>
			(
				await apiRequest<{ dictionary: ConnectorDictionaryResponse }>(
					`/v1/connectors/${encodeURIComponent(key)}/dictionary`,
					{ method: "POST", body },
				)
			).dictionary,
		onSuccess: () => {
			void queryClient.invalidateQueries({
				queryKey: ["catalog", "dictionary-targets"],
			});
			void queryClient.invalidateQueries({
				queryKey: ["catalog", "dictionary-repositories"],
			});
		},
	});
}
