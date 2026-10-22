import { createFileRoute } from "@tanstack/react-router";

import { TeamPage } from "#/features/organization/team-page";
import { requireAuthSession } from "#/lib/auth-functions";

export const Route = createFileRoute("/team")({
	beforeLoad: async ({ context, location }) => {
		const session = await requireAuthSession(
			context.queryClient,
			location.href,
		);
		return { user: session.user };
	},
	component: TeamPage,
});
