import { Outlet } from "@tanstack/react-router";
import type { ReactNode } from "react";

import { Badge } from "#/components/ui/badge";
import { AppNavbar } from "#/features/navigation/app-navbar";

export function CatalogLayout() {
	return (
		<div className="min-h-screen bg-background">
			<AppNavbar />
			<main className="mx-auto grid w-full max-w-7xl gap-6 px-4 py-6 sm:px-6 lg:px-8">
				<Outlet />
			</main>
		</div>
	);
}

export function CatalogPage({
	actions,
	children,
	description,
	title,
}: {
	actions?: ReactNode;
	children: ReactNode;
	// What sits under the title. The section blurb is right for a list; under
	// the name of one record it says nothing about the record.
	description?: ReactNode;
	title: string;
}) {
	return (
		<div className="grid gap-6">
			<section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
				<div className="grid justify-items-start gap-2">
					<Badge
						className="rounded px-1.5 font-mono text-[10.5px] font-bold tracking-wide uppercase"
						variant="secondary"
					>
						Catalog
					</Badge>
					<h1 className="text-[22px] font-bold tracking-tight text-foreground">
						{title}
					</h1>
					<div className="max-w-2xl text-[13px] text-muted-foreground">
						{description ?? (
							<p>
								Stammdaten, Wörterbücher und semantische Definitionen für
								digitale Produktpässe.
							</p>
						)}
					</div>
				</div>
				{actions}
			</section>
			{children}
		</div>
	);
}

export const CatalogShell = CatalogPage;

export function jsonValue(value: unknown) {
	if (value === null || value === undefined || value === "") return "";
	if (typeof value === "string") return value;
	return JSON.stringify(value, null, 2);
}

export function parseJsonField(value: string) {
	if (!value.trim()) return undefined;
	return JSON.parse(value);
}
