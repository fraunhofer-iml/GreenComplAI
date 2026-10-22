import type { PublicDppResponse } from "@dpp/schemas";
import { useQuery } from "@tanstack/react-query";

import { publicRequest } from "#/features/api/client";

// The anonymous response is its own, narrower shape than the workspace one
// (no internal display metadata, no timestamps) - hence derived from its own
// schema rather than the DPP view's.
export type PublicDppPayload = PublicDppResponse;

const fetchPublic = (path: string) => publicRequest<PublicDppPayload>(path);

export function usePublicDppById(dppId: string) {
	return useQuery({
		queryKey: ["public-dpp", dppId],
		queryFn: () => fetchPublic(`/public/dpps/${encodeURIComponent(dppId)}`),
		retry: false,
	});
}

export function usePublicDppByProductId(productId: string) {
	return useQuery({
		queryKey: ["public-product", productId],
		queryFn: () =>
			fetchPublic(`/public/dpps?productId=${encodeURIComponent(productId)}`),
		retry: false,
	});
}
