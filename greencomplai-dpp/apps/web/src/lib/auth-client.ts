import { twoFactorClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

import { resolveApiOrigin } from "#/lib/api-origin";

export const authClient = createAuthClient({
	baseURL: resolveApiOrigin(),
	fetchOptions: {
		credentials: "include",
	},
	plugins: [twoFactorClient()],
});
