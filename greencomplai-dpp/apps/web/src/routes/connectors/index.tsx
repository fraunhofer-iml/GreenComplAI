import { createFileRoute } from "@tanstack/react-router";

import { ConnectorsPage } from "#/features/connectors/connectors-page";
import { requireAuthSession } from "#/lib/auth-functions";

export const Route = createFileRoute("/connectors/")({
	beforeLoad: async ({ context, location }) => {
		const session = await requireAuthSession(
			context.queryClient,
			location.href,
		);
		return { user: session.user };
	},
	component: ConnectorsPage,
});
