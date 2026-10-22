import { createFileRoute } from "@tanstack/react-router";

import { DppDetailView } from "#/features/dpp/dpp-detail";
import { requireAuthSession } from "#/lib/auth-functions";

export const Route = createFileRoute("/dpps/$dppId/")({
	beforeLoad: async ({ context, location }) => {
		const session = await requireAuthSession(
			context.queryClient,
			location.href,
		);
		return { user: session.user };
	},
	component: DppRoute,
});

function DppRoute() {
	const { dppId } = Route.useParams();

	return <DppDetailView dppId={dppId} />;
}
