import { createFileRoute } from "@tanstack/react-router";

import { DppListView } from "#/features/dpp/dpp-list-view";
import { requireAuthSession } from "#/lib/auth-functions";

export const Route = createFileRoute("/dpps/")({
	beforeLoad: async ({ context, location }) => {
		const session = await requireAuthSession(
			context.queryClient,
			location.href,
		);
		return { user: session.user };
	},
	component: DppListView,
});
