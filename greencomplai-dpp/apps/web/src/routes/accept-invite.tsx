import { createFileRoute } from "@tanstack/react-router";

import { AcceptInvitePage } from "#/features/organization/accept-invite-page";
import { requireAuthSession } from "#/lib/auth-functions";

export type AcceptInviteSearch = { token?: string };

// Declared rather than inferred inline: `beforeLoad` receives the validated
// search, so inferring both at once makes them depend on each other and collapses
// the search type to `{}`.
function validateSearch(search: Record<string, unknown>): AcceptInviteSearch {
	return { token: typeof search.token === "string" ? search.token : undefined };
}

export const Route = createFileRoute("/accept-invite")({
	// Accepting requires knowing who accepts. An anonymous visitor is sent to
	// login and comes back to the full href — token included, so the link still
	// works for someone who was not signed in when they clicked it.
	beforeLoad: async ({ context, location }) => {
		await requireAuthSession(context.queryClient, location.href);
	},
	component: AcceptInviteScreen,
	validateSearch,
});

function AcceptInviteScreen() {
	const { token } = Route.useSearch();
	return <AcceptInvitePage token={token} />;
}
