import { createFileRoute } from "@tanstack/react-router";

import { ConnectorImportPage } from "#/features/connectors/connector-import-page";
import { requireAuthSession } from "#/lib/auth-functions";

// The record's identifier is in the path, not in component state: this screen
// carries a mapping someone spends real time on, and it has to survive a reload
// and be worth sending to a colleague.
export const Route = createFileRoute(
	"/connectors/$connectorKey/import/$externalId",
)({
	beforeLoad: async ({ context, location }) => {
		const session = await requireAuthSession(
			context.queryClient,
			location.href,
		);
		return { user: session.user };
	},
	component: ConnectorImportRoute,
});

function ConnectorImportRoute() {
	const { connectorKey, externalId } = Route.useParams();

	return (
		<ConnectorImportPage connectorKey={connectorKey} externalId={externalId} />
	);
}
