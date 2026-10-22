import { createFileRoute } from "@tanstack/react-router";

import { usePublicDppByProductId } from "#/features/public/public-api";
import { PublicDppScreen } from "#/features/public/public-dpp-view";

export const Route = createFileRoute("/p/$productId")({
	component: PublicProductRoute,
});

function PublicProductRoute() {
	const { productId } = Route.useParams();
	return <PublicDppScreen query={usePublicDppByProductId(productId)} />;
}
