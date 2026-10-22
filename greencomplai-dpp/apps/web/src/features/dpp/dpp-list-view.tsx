import type { DppStatus } from "@dpp/schemas";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight, Package, Search } from "lucide-react";
import { useState } from "react";

import { Button } from "#/components/ui/button";
import {
	Empty,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle,
} from "#/components/ui/empty";
import { Input } from "#/components/ui/input";
import { Skeleton } from "#/components/ui/skeleton";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "#/components/ui/table";
import { CreateDppDialog } from "#/features/dashboard/create-dpp-dialog";
import { type DppListItem, listDpps } from "#/features/dashboard/dashboard-api";
import { AppNavbar } from "#/features/navigation/app-navbar";
import { DppVersionStatus } from "./components/dpp-status-pills";

// "" is the "all" filter - a choice of the UI, not a status from the API.
// So it lives here as its own value alongside the schema's status values,
// rather than being output as a fifth status.
const statusFilters: { label: string; value: DppStatus | "" }[] = [
	{ label: "Alle", value: "" },
	{ label: "Entwurf", value: "draft" },
	{ label: "In Prüfung", value: "review" },
	{ label: "Veröffentlicht", value: "published" },
	{ label: "Archiviert", value: "archived" },
];

export function DppListView() {
	const [search, setSearch] = useState("");
	const [status, setStatus] = useState<DppStatus | "">("");
	const [offset, setOffset] = useState(0);
	const limit = 25;
	const dpps = useQuery({
		queryKey: ["dpp-list", search, status, offset],
		queryFn: () =>
			listDpps({ limit, offset, search, status: status || undefined }),
	});
	const result = dpps.data;
	const counts = result?.statusCounts;
	const registerTotal = counts
		? counts.draft + counts.review + counts.published + counts.archived
		: undefined;

	return (
		<div className="min-h-screen bg-background">
			<AppNavbar />
			<main className="mx-auto w-full max-w-[1400px] px-4 py-7 sm:px-6 lg:px-8">
				<div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
					<div>
						<h1 className="text-[22px] font-bold tracking-tight">
							Produktpässe
						</h1>
						<p className="mt-1 text-[13px] text-muted-foreground">
							{registerTotal !== undefined
								? `${registerTotal} Pässe im Register`
								: "Alle digitalen Produktpässe dieser Organisation"}
						</p>
					</div>
					<CreateDppDialog />
				</div>

				<section className="mt-5 overflow-hidden rounded-xl border bg-card">
					<div className="flex flex-wrap items-center gap-3 border-b px-5 py-3.5">
						<div className="flex flex-wrap items-center gap-1.5">
							{statusFilters.map((filter) => {
								const active = status === filter.value;
								const count =
									filter.value === "" ? registerTotal : counts?.[filter.value];
								return (
									<button
										className={
											active
												? "rounded-full bg-foreground px-3 py-1 text-xs font-semibold text-background"
												: "rounded-full border px-3 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
										}
										key={filter.value}
										onClick={() => {
											setOffset(0);
											setStatus(filter.value);
										}}
										type="button"
									>
										{filter.label}
										{count !== undefined ? ` · ${count}` : ""}
									</button>
								);
							})}
						</div>
						<div className="relative ml-auto w-full sm:w-[260px]">
							<Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
							<Input
								className="pl-9"
								placeholder="DPP, Produkt, Akteur, Facility …"
								value={search}
								onChange={(event) => {
									setOffset(0);
									setSearch(event.target.value);
								}}
							/>
						</div>
					</div>
					<DppTable dpps={result?.dpps ?? []} loading={dpps.isLoading} />
					<div className="flex items-center justify-between border-t px-5 py-3">
						<span className="font-mono text-xs text-muted-foreground">
							{offset + 1}–{Math.min(offset + limit, result?.total ?? 0)} von{" "}
							{result?.total ?? 0}
						</span>
						<div className="flex gap-2">
							<Button
								disabled={offset === 0}
								size="sm"
								variant="outline"
								onClick={() => setOffset(Math.max(0, offset - limit))}
							>
								<ChevronLeft className="size-4" />
								Zurück
							</Button>
							<Button
								disabled={!result || offset + limit >= result.total}
								size="sm"
								variant="outline"
								onClick={() => setOffset(offset + limit)}
							>
								Weiter
								<ChevronRight className="size-4" />
							</Button>
						</div>
					</div>
				</section>
			</main>
		</div>
	);
}

function DppTable({
	dpps,
	loading,
}: {
	dpps: DppListItem[];
	loading: boolean;
}) {
	if (loading) {
		return (
			<div className="grid gap-2 p-5">
				<Skeleton className="h-10 w-full" />
				<Skeleton className="h-10 w-full" />
				<Skeleton className="h-10 w-full" />
			</div>
		);
	}

	if (dpps.length === 0) {
		return (
			<div className="p-5">
				<Empty className="border border-dashed border-border">
					<EmptyHeader>
						<EmptyMedia variant="icon">
							<Search className="size-5" />
						</EmptyMedia>
						<EmptyTitle>Keine DPPs gefunden</EmptyTitle>
						<EmptyDescription>
							Ändere die Suche oder lege einen neuen Produktpass an.
						</EmptyDescription>
					</EmptyHeader>
				</Empty>
			</div>
		);
	}

	const headClassName =
		"px-5 text-[11px] font-semibold uppercase tracking-[0.04em] text-muted-foreground";

	return (
		<Table>
			<TableHeader>
				<TableRow className="hover:bg-transparent">
					<TableHead className={headClassName}>Produkt</TableHead>
					<TableHead className={headClassName}>Status</TableHead>
					<TableHead className={headClassName}>Schema</TableHead>
					<TableHead className={headClassName}>Granularität</TableHead>
					<TableHead className={headClassName}>Zuletzt geändert</TableHead>
				</TableRow>
			</TableHeader>
			<TableBody>
				{dpps.map((dpp) => (
					<TableRow key={dpp.digitalProductPassportId}>
						<TableCell className="px-5 py-3">
							<div className="flex items-center gap-3">
								<span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
									<Package className="size-4" />
								</span>
								<div className="min-w-0">
									<Link
										className="block max-w-[320px] truncate text-[13.5px] font-semibold transition-colors hover:text-primary"
										params={{ dppId: dpp.publicId }}
										to="/dpps/$dppId"
									>
										{dpp.productId}
									</Link>
									<div className="max-w-[320px] truncate font-mono text-[11.5px] text-muted-foreground">
										{dpp.digitalProductPassportId}
									</div>
								</div>
							</div>
						</TableCell>
						<TableCell className="px-5">
							<DppVersionStatus
								publishedVersionLabel={dpp.publishedVersionLabel}
								status={dpp.status}
								versionLabel={dpp.versionLabel}
							/>
						</TableCell>
						<TableCell className="px-5">
							<span className="font-mono text-xs text-muted-foreground">
								{dpp.dppSchemaVersion}
							</span>
						</TableCell>
						<TableCell className="px-5 text-[12.5px] text-muted-foreground">
							{dpp.granularity}
						</TableCell>
						<TableCell className="px-5 text-[12.5px] text-muted-foreground">
							{new Date(dpp.lastUpdate).toLocaleDateString("de-DE")}
						</TableCell>
					</TableRow>
				))}
			</TableBody>
		</Table>
	);
}
