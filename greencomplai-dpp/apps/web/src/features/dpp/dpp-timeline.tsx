import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import {
	Archive,
	ArrowLeft,
	CheckCircle2,
	History,
	Link2,
	Pencil,
	Plus,
	RotateCcw,
} from "lucide-react";
import type { ReactNode } from "react";
import { useState } from "react";

import { Badge } from "#/components/ui/badge";
import { buttonVariants } from "#/components/ui/button";
import { Card, CardContent } from "#/components/ui/card";
import { Skeleton } from "#/components/ui/skeleton";
import { ApiError } from "#/features/api/client";
import { AppNavbar } from "#/features/navigation/app-navbar";
import { useActiveOrganizationId } from "#/features/organization/organization-store";
import { useOrganizations } from "#/features/organization/organizations-api";

import { restoreDppVersion } from "./dpp-edit-api";
import {
	type DppVersion,
	type TimelineEntry,
	useDppTimeline,
	useDppVersions,
} from "./dpp-timeline-api";
import type { DppStatus } from "./dpp-view";
import { statusLabel, useDppView } from "./dpp-view";

export function DppTimeline({ dppId }: { dppId: string }) {
	const view = useDppView(dppId);
	const timeline = useDppTimeline(dppId);
	const versions = useDppVersions(dppId);
	const activeOrganizationId = useActiveOrganizationId();
	const organizations = useOrganizations();

	const role = organizations.data?.find(
		(organization) => organization.id === activeOrganizationId,
	)?.role;
	const dpp = view.data?.dpp;
	const canRestore =
		dpp?.status === "draft" && (role === "admin" || role === "editor");
	const days = groupByDay(timeline.data ?? []);

	return (
		<div className="min-h-screen bg-background">
			<AppNavbar />
			<main className="mx-auto grid w-full max-w-[1400px] gap-4 px-4 py-6 sm:px-6 lg:px-8">
				<nav className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
					<Link className="hover:text-primary" to="/dashboard">
						Übersicht
					</Link>
					<span aria-hidden>/</span>
					<Link
						className="hover:text-primary"
						params={{ dppId }}
						to="/dpps/$dppId"
					>
						{dpp?.productId ?? "Produktpass"}
					</Link>
					<span aria-hidden>/</span>
					<span className="font-medium text-foreground">Verlauf</span>
				</nav>

				<Card>
					<CardContent className="flex flex-wrap items-center gap-4 p-4">
						<span className="flex size-11 items-center justify-center rounded-lg bg-muted text-muted-foreground">
							<History className="size-5" />
						</span>
						<div className="min-w-0">
							<div className="flex items-center gap-2.5">
								<h1 className="text-lg font-bold text-foreground">
									Verlauf · {dpp?.productId ?? ""}
								</h1>
								{dpp ? (
									<Badge variant="secondary">{statusLabel(dpp.status)}</Badge>
								) : null}
							</div>
							<p className="mt-0.5 font-mono text-xs text-muted-foreground">
								{(timeline.data ?? []).length} Änderungen ·{" "}
								{(versions.data ?? []).length} Versionen
							</p>
						</div>
						<Link
							className={buttonVariants({
								className: "ml-auto",
								size: "sm",
								variant: "outline",
							})}
							params={{ dppId }}
							to="/dpps/$dppId"
						>
							<ArrowLeft className="size-4" />
							Zum Produktpass
						</Link>
					</CardContent>
				</Card>

				<div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_300px] lg:items-start">
					<Card>
						<CardContent className="p-5">
							<h2 className="mb-4 text-sm font-semibold">Änderungen</h2>
							{timeline.isLoading ? (
								<div className="grid gap-3">
									<Skeleton className="h-12 w-full" />
									<Skeleton className="h-12 w-full" />
								</div>
							) : days.length === 0 ? (
								<p className="text-sm text-muted-foreground">
									Noch keine Änderungen.
								</p>
							) : (
								days.map((day) => (
									<div key={day.date} className="mb-1">
										<div className="my-3 flex items-center gap-2.5">
											<span className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
												{day.date}
											</span>
											<div className="h-px flex-1 bg-border" />
										</div>
										{day.events.map((event, index) => (
											<TimelineRow
												key={event.id}
												entry={event}
												last={index === day.events.length - 1}
											/>
										))}
									</div>
								))
							)}
						</CardContent>
					</Card>

					<VersionsRail
						canRestore={canRestore}
						dppId={dppId}
						loading={versions.isLoading}
						versions={versions.data ?? []}
					/>
				</div>
			</main>
		</div>
	);
}

function TimelineRow({ entry, last }: { entry: TimelineEntry; last: boolean }) {
	const meta = entryMeta(entry);

	return (
		<div className="flex gap-3.5">
			<div className="flex w-6.5 flex-none flex-col items-center">
				<span className="flex size-6.5 items-center justify-center rounded-full bg-secondary text-secondary-foreground [&_svg]:size-3.5">
					{meta.icon}
				</span>
				{!last ? <span className="min-h-3.5 w-0.5 flex-1 bg-border" /> : null}
			</div>
			<div className="min-w-0 flex-1 pb-4">
				<div className="flex flex-wrap items-center gap-2">
					<span className="text-sm font-semibold text-foreground">
						{meta.title}
					</span>
					{entry.statusFrom && entry.statusTo ? (
						<span className="flex items-center gap-1.5 rounded-md bg-muted px-2 py-0.5 text-[11px] font-medium">
							<span className="text-muted-foreground">
								{statusLabel(entry.statusFrom)}
							</span>
							<span className="text-muted-foreground">→</span>
							<span className="text-primary">
								{statusLabel(entry.statusTo)}
							</span>
						</span>
					) : null}
				</div>

				{entry.fieldDiffs.length > 0 ? (
					<div className="mt-2 grid gap-1.5">
						{/* Allow both grid shrinkage and wrapping so long values cannot widen the column. */}
						{entry.fieldDiffs.map((diff) => (
							<div key={diff.path} className="grid min-w-0 gap-1">
								<span className="min-w-0 wrap-anywhere text-[11px] font-medium text-muted-foreground">
									{diff.label}
								</span>
								<div className="flex min-w-0 flex-wrap items-center gap-2 rounded-md border bg-muted/40 px-2.5 py-1.5">
									<span className="min-w-0 wrap-anywhere font-mono text-xs text-destructive line-through">
										{diff.oldValue ?? "—"}
									</span>
									<span className="text-muted-foreground">→</span>
									<span className="min-w-0 wrap-anywhere font-mono text-xs font-semibold text-primary">
										{diff.newValue ?? "—"}
									</span>
								</div>
							</div>
						))}
					</div>
				) : null}

				<div className="mt-1.5 text-[11.5px] text-muted-foreground">
					{entry.actor} · {formatTime(entry.at)}
				</div>
			</div>
		</div>
	);
}

function VersionsRail({
	versions,
	loading,
	canRestore,
	dppId,
}: {
	versions: DppVersion[];
	loading: boolean;
	canRestore: boolean;
	dppId: string;
}) {
	const queryClient = useQueryClient();
	const [error, setError] = useState<string>();
	const restore = useMutation({
		mutationFn: (versionNumber: number) =>
			restoreDppVersion(dppId, versionNumber),
		onSuccess: async () => {
			setError(undefined);
			await Promise.all([
				queryClient.invalidateQueries({ queryKey: ["dpp-view"] }),
				queryClient.invalidateQueries({ queryKey: ["dpp-versions"] }),
				queryClient.invalidateQueries({ queryKey: ["dpp-timeline"] }),
			]);
		},
		onError: (err) => {
			setError(
				err instanceof ApiError
					? err.message
					: "Wiederherstellen fehlgeschlagen",
			);
		},
	});

	const latest = versions[0]?.versionNumber;

	return (
		<div className="flex flex-col gap-4 lg:sticky lg:top-4">
			<div className="dark rounded-xl bg-card p-4 text-card-foreground">
				<div className="text-sm font-bold">Versionen</div>
				{loading ? (
					<Skeleton className="mt-3 h-24 w-full" />
				) : (
					<div className="mt-3 flex flex-col gap-1">
						{versions.map((version) => {
							const isLatest = version.versionNumber === latest;
							return (
								<div
									key={version.versionNumber}
									className="flex items-center gap-2.5 rounded-md px-2 py-1.5"
								>
									<span
										className={`w-9 font-mono text-xs font-semibold ${
											isLatest ? "text-primary" : "text-muted-foreground"
										}`}
									>
										v{version.versionNumber}
									</span>
									<span className="flex-1 truncate text-xs text-muted-foreground">
										{formatDay(version.createdAt)}
										{isLatest ? " · live" : ""}
									</span>
									{canRestore && !isLatest ? (
										<button
											className="flex-none text-muted-foreground hover:text-foreground [&_svg]:size-3.5"
											disabled={restore.isPending}
											onClick={() => {
												if (
													window.confirm(
														`Version v${version.versionNumber} in den Entwurf wiederherstellen?`,
													)
												) {
													restore.mutate(version.versionNumber);
												}
											}}
											title="In den Entwurf wiederherstellen"
											type="button"
										>
											<RotateCcw />
										</button>
									) : null}
								</div>
							);
						})}
					</div>
				)}
				<p className="mt-3 border-t border-white/10 pt-3 text-[11.5px] leading-relaxed text-muted-foreground">
					Jede Veröffentlichung erzeugt eine unveränderliche Version.
					Wiederherstellen ist nur im Entwurf möglich.
				</p>
			</div>
			{error ? <p className="text-sm text-destructive">{error}</p> : null}
		</div>
	);
}

type EntryMeta = { icon: ReactNode; title: string };

export function entryMeta(entry: TimelineEntry): EntryMeta {
	switch (entry.kind) {
		case "created":
			return { icon: <Plus />, title: "Produktpass erstellt" };
		case "status":
			return {
				icon: entry.statusTo === "published" ? <CheckCircle2 /> : <Archive />,
				title: "Status geändert",
			};
		case "relationship-added":
			return { icon: <Link2 />, title: "Beziehung hinzugefügt" };
		case "relationship-removed":
			return { icon: <Link2 />, title: "Beziehung entfernt" };
		default:
			return { icon: <Pencil />, title: "Daten geändert" };
	}
}

export function groupByDay(
	entries: TimelineEntry[],
): Array<{ date: string; events: TimelineEntry[] }> {
	const groups: Array<{ date: string; events: TimelineEntry[] }> = [];
	for (const entry of entries) {
		const date = formatDay(entry.at);
		const existing = groups.find((group) => group.date === date);
		if (existing) existing.events.push(entry);
		else groups.push({ date, events: [entry] });
	}
	return groups;
}

function formatDay(iso: string): string {
	return new Date(iso).toLocaleDateString("de-DE", {
		day: "2-digit",
		month: "long",
		year: "numeric",
	});
}

function formatTime(iso: string): string {
	return new Date(iso).toLocaleTimeString("de-DE", {
		hour: "2-digit",
		minute: "2-digit",
	});
}

// Re-exported for the compact activity card on the detail page.
export type { DppStatus };
