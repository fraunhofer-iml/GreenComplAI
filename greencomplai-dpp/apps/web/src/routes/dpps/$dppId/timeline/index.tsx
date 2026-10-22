import { createFileRoute } from "@tanstack/react-router";

import { DppTimeline } from "#/features/dpp/dpp-timeline";
import { requireAuthSession } from "#/lib/auth-functions";

export const Route = createFileRoute("/dpps/$dppId/timeline/")({
	beforeLoad: async ({ context, location }) => {
		const session = await requireAuthSession(
			context.queryClient,
			location.href,
		);
		return { user: session.user };
	},
	component: TimelineRoute,
});

function TimelineRoute() {
	const { dppId } = Route.useParams();
	return <DppTimeline dppId={dppId} />;
}
