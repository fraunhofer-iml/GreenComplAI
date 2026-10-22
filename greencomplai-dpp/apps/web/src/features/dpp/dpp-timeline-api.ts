import type {
	DppFieldDiffResponse,
	DppTimelineEntryResponse,
	DppVersionResponse,
} from "@dpp/schemas";
import { useQuery } from "@tanstack/react-query";

import { apiRequest } from "#/features/api/client";
import { getActiveOrganizationId } from "#/features/organization/organization-store";

// Derive types and the kind union from shared response schemas.
export type DppVersion = DppVersionResponse;
export type FieldDiff = DppFieldDiffResponse;
export type TimelineEntry = DppTimelineEntryResponse;
export type TimelineEntryKind = TimelineEntry["kind"];

export function useDppTimeline(dppId: string) {
	return useQuery({
		queryKey: ["dpp-timeline", getActiveOrganizationId(), dppId],
		queryFn: async () =>
			(
				await apiRequest<{ entries: TimelineEntry[] }>(
					`/dpps/${encodeURIComponent(dppId)}/timeline`,
				)
			).entries,
	});
}

export function useDppVersions(dppId: string) {
	return useQuery({
		queryKey: ["dpp-versions", getActiveOrganizationId(), dppId],
		queryFn: async () =>
			(
				await apiRequest<{ versions: DppVersion[] }>(
					`/dpps/${encodeURIComponent(dppId)}/versions`,
				)
			).versions,
	});
}
