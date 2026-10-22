import type { OrganizationResponse, OrganizationRole } from "@dpp/schemas";
import { queryOptions, useQuery } from "@tanstack/react-query";

import { apiRequest } from "#/features/api/client";

// The shape comes from the API's response schema rather than a hand-maintained
// copy: a copy still compiles even once it describes an API that no longer
// exists.
export type { OrganizationRole };
export type Organization = OrganizationResponse;

// Lists the organizations the authenticated user is an active member of. This
// endpoint requires auth but not a tenant context, so it works before any
// organization is selected (no chicken-and-egg with x-organization-id).
export async function fetchOrganizations(): Promise<Organization[]> {
	const payload = await apiRequest<{ organizations: Organization[] }>(
		"/organizations",
	);
	return payload.organizations;
}

// Exported as options rather than only as a hook so the route guard can prime
// the same cache entry the switcher reads, instead of fetching the list twice.
export const organizationsQueryOptions = queryOptions({
	queryFn: fetchOrganizations,
	queryKey: ["organizations"] as const,
	staleTime: 5 * 60 * 1000,
});

export function useOrganizations() {
	return useQuery(organizationsQueryOptions);
}
