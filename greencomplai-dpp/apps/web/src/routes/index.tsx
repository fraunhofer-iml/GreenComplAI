import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";

import { buttonVariants } from "#/components/ui/button";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
	return (
		<main className="flex min-h-screen flex-col items-center justify-center gap-8 bg-background px-6 text-foreground">
			<h1 className="max-w-3xl text-center text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
				Herzlich Willkommen bei GreenComplai DPP.
			</h1>
			<Link className={buttonVariants({ size: "lg" })} to="/dashboard">
				Zum Dashboard
				<ArrowRight className="size-4" />
			</Link>
		</main>
	);
}
