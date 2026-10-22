import { createFileRoute } from "@tanstack/react-router";

import { usePublicDppById } from "#/features/public/public-api";
import { PublicDppScreen } from "#/features/public/public-dpp-view";

export const Route = createFileRoute("/dpp/$dppId")({
	component: PublicDppRoute,
});

function PublicDppRoute() {
	const { dppId } = Route.useParams();
	return <PublicDppScreen query={usePublicDppById(dppId)} />;
}
