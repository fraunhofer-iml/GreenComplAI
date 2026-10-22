import type {
	DppListItemResponse,
	DppListResponse,
	DppStatus,
} from "@dpp/schemas";

import { apiRequest, buildQuery } from "#/features/api/client";

// Derived from the response schemas. The query type stays separate below:
// it describes what the UI sends, and `DppListQueryInput` is the input side
// of the same schema - with defaults that only the server applies.
export type DppListItem = DppListItemResponse;
export type DppListResult = DppListResponse;
export type DppListQuery = {
	limit?: number;
	offset?: number;
	// Repeatable on the server; one value is what the UI needs so far.
	productId?: string;
	search?: string;
	// Which values are allowed is the schema's call; that the filter may be
	// omitted is a question for the UI.
	status?: DppStatus;
};

export async function listDpps(query: DppListQuery) {
	return (
		await apiRequest<{ result: DppListResult }>(
			`/dpps${buildQuery({
				limit: query.limit,
				offset: query.offset,
				productId: query.productId,
				search: query.search,
				status: query.status,
			})}`,
		)
	).result;
}

export async function createDppDraft(body: {
	dppSchemaVersion: string;
	economicOperatorId: string;
	facilityId?: string;
	granularity: string;
	productId: string;
}) {
	return apiRequest<{
		dpp: { digitalProductPassportId: string };
		publicId: string;
	}>("/dpps", {
		body: { ...body, collections: [], dataElements: [] },
		method: "POST",
	});
}
