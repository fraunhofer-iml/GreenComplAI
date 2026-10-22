import { createFileRoute } from "@tanstack/react-router";

import { ConnectorSettingsPage } from "#/features/connectors/connector-settings-page";
import { requireAuthSession } from "#/lib/auth-functions";

export const Route = createFileRoute("/connectors/$connectorKey/")({
	beforeLoad: async ({ context, location }) => {
		const session = await requireAuthSession(
			context.queryClient,
			location.href,
		);
		return { user: session.user };
	},
	component: ConnectorSettingsRoute,
});

function ConnectorSettingsRoute() {
	const { connectorKey } = Route.useParams();

	return <ConnectorSettingsPage connectorKey={connectorKey} />;
}
