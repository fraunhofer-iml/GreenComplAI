import { createFileRoute } from "@tanstack/react-router";

import { CatalogLayout } from "#/features/catalog/catalog-layout";
import { requireAuthSession } from "#/lib/auth-functions";

export const Route = createFileRoute("/catalog")({
	beforeLoad: async ({ context, location }) => {
		const session = await requireAuthSession(
			context.queryClient,
			location.href,
		);
		return { user: session.user };
	},
	component: CatalogLayout,
});
