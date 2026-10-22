import { TanStackDevtools } from "@tanstack/react-devtools";
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools";

import TanStackQueryDevtools from "./tanstack-query/devtools";

// Every devtools import lives in this module so the root route can reach it
// through a single dynamic import behind `import.meta.env.DEV`. Imported
// statically, the panels ship to production, and @tanstack/devtools brings its
// Solid runtime along: in the production build that landed in a chunk cycle
// where a base class was still undefined at evaluation time, the client bundle
// threw before hydrating, and the whole app rendered as dead server-side markup.
export default function Devtools() {
	return (
		<TanStackDevtools
			config={{
				position: "bottom-right",
			}}
			plugins={[
				{
					name: "Tanstack Router",
					render: <TanStackRouterDevtoolsPanel />,
				},
				TanStackQueryDevtools,
			]}
		/>
	);
}
