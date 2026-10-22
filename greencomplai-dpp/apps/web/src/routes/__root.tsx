import type { QueryClient } from "@tanstack/react-query";
import {
	createRootRouteWithContext,
	HeadContent,
	Link,
	Scripts,
} from "@tanstack/react-router";
import { ArrowLeft, CircuitBoard } from "lucide-react";
import { lazy, Suspense } from "react";
import { buttonVariants } from "#/components/ui/button";
import { Card, CardContent } from "#/components/ui/card";
import { apiOriginForDocument } from "#/lib/api-origin";
import { getLocale } from "#/paraglide/runtime";
import appCss from "../styles.css?url";

// `import.meta.env.DEV` is a build-time constant, so in a production build this
// is `null` and the dynamic import below is dropped from the bundle entirely.
const Devtools = import.meta.env.DEV
	? lazy(() => import("#/integrations/devtools"))
	: null;

interface MyRouterContext {
	queryClient: QueryClient;
}

export const Route = createRootRouteWithContext<MyRouterContext>()({
	beforeLoad: async () => {
		// Other redirect strategies are possible; see
		// https://github.com/TanStack/router/tree/main/examples/react/i18n-paraglide#offline-redirect
		if (typeof document !== "undefined") {
			document.documentElement.setAttribute("lang", getLocale());
		}
	},

	head: () => ({
		meta: [
			{
				charSet: "utf-8",
			},
			{
				name: "viewport",
				content: "width=device-width, initial-scale=1",
			},
			{
				title: "Greencomplai DPP",
			},
		],
		links: [
			{
				rel: "stylesheet",
				href: appCss,
			},
		],
	}),
	notFoundComponent: NotFound,
	shellComponent: RootDocument,
});

function NotFound() {
	return (
		<main className="min-h-screen bg-background">
			<section className="mx-auto grid min-h-screen w-full max-w-3xl place-items-center px-4 py-6">
				<Card className="w-full">
					<CardContent className="grid gap-6 p-6">
						<div className="flex items-center justify-between gap-4 border-b pb-4">
							<span className="flex items-center gap-2 font-medium">
								<CircuitBoard className="size-4" />
								Greencomplai DPP
							</span>
							<span className="text-sm text-muted-foreground">
								404 / Route nicht gefunden
							</span>
						</div>

						<div>
							<CircuitBoard className="mb-4 size-8 text-muted-foreground" />
							<strong>Diese DPP-Route existiert nicht.</strong>
							<p className="mt-2 text-sm text-muted-foreground">
								Prüfe die URL oder kehre zur Startseite zurück.
							</p>
							<Link to="/" className={buttonVariants({ className: "mt-4" })}>
								<ArrowLeft className="size-4" />
								Zur Startseite
							</Link>
						</div>
					</CardContent>
				</Card>
			</section>
		</main>
	);
}

function RootDocument({ children }: { children: React.ReactNode }) {
	const apiOrigin = apiOriginForDocument();

	return (
		<html lang={getLocale()}>
			<head>
				{apiOrigin ? (
					// Run before client modules read the origin during import.
					<script
						dangerouslySetInnerHTML={{
							__html: `globalThis.__DPP_API_ORIGIN__=${JSON.stringify(apiOrigin)}`,
						}}
					/>
				) : null}
				<HeadContent />
			</head>
			<body>
				{children}
				{Devtools ? (
					<Suspense fallback={null}>
						<Devtools />
					</Suspense>
				) : null}
				<Scripts />
			</body>
		</html>
	);
}
