import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
	ArrowRight,
	BookOpen,
	ClipboardCheck,
	Database,
	Package,
} from "lucide-react";

import { Skeleton } from "#/components/ui/skeleton";
import { CreateDppDialog } from "#/features/dashboard/create-dpp-dialog";
import { type DppListItem, listDpps } from "#/features/dashboard/dashboard-api";
import { DppVersionStatus } from "#/features/dpp/components/dpp-status-pills";
import { AppNavbar } from "#/features/navigation/app-navbar";
import { useActiveOrganizationId } from "#/features/organization/organization-store";
import { useOrganizations } from "#/features/organization/organizations-api";
import { requireAuthSession } from "#/lib/auth-functions";

export const Route = createFileRoute("/dashboard")({
	beforeLoad: async ({ context, location }) => {
		const session = await requireAuthSession(
			context.queryClient,
			location.href,
		);
		return { user: session.user };
	},
	component: Dashboard,
});

function Dashboard() {
	const overview = useQuery({
		queryKey: ["dashboard", "overview"],
		queryFn: () => listDpps({ limit: 6, offset: 0 }),
	});
	const reviews = useQuery({
		queryKey: ["dashboard", "reviews"],
		queryFn: () => listDpps({ limit: 5, offset: 0, status: "review" }),
	});
	const { data: organizations } = useOrganizations();
	const activeId = useActiveOrganizationId();
	const activeOrg =
		organizations?.find((org) => org.id === activeId) ?? organizations?.[0];

	const counts = overview.data?.statusCounts;
	const total = counts
		? counts.draft + counts.review + counts.published + counts.archived
		: undefined;

	return (
		<div className="min-h-screen bg-background">
			<AppNavbar />
			<main className="mx-auto w-full max-w-[1400px] px-4 py-7 sm:px-6 lg:px-8">
				<div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
					<div>
						<h1 className="text-[22px] font-bold tracking-tight">Übersicht</h1>
						<p className="mt-1 text-[13px] text-muted-foreground">
							{new Intl.DateTimeFormat("de-DE", { dateStyle: "full" }).format(
								new Date(),
							)}
							{activeOrg ? ` · ${activeOrg.name}` : ""}
						</p>
					</div>
					<CreateDppDialog />
				</div>

				<section className="mt-6 grid gap-3.5 sm:grid-cols-2 xl:grid-cols-4">
					<StatTile
						hero
						label="Veröffentlichte Pässe"
						value={counts?.published}
						detail={
							total !== undefined ? `von ${total} im Register` : undefined
						}
					/>
					<StatTile
						label="Entwürfe"
						value={counts?.draft}
						detail="In Bearbeitung"
					/>
					<StatTile
						label="In Prüfung"
						value={counts?.review}
						detail="Warten auf Freigabe"
					/>
					<StatTile
						label="Archiviert"
						value={counts?.archived}
						detail="Nicht mehr aktiv"
					/>
				</section>

				<div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
					<RecentCard
						dpps={overview.data?.dpps ?? []}
						loading={overview.isLoading}
					/>
					<div className="grid gap-4">
						<ReviewCard
							dpps={reviews.data?.dpps ?? []}
							loading={reviews.isLoading}
						/>
						<QuickActions />
					</div>
				</div>
			</main>
		</div>
	);
}

function StatTile({
	detail,
	hero = false,
	label,
	value,
}: {
	detail?: string;
	hero?: boolean;
	label: string;
	value: number | undefined;
}) {
	return (
		<div
			className={
				hero
					? "dark rounded-xl border bg-card p-5 text-card-foreground"
					: "rounded-xl border bg-card p-5"
			}
		>
			<div className="text-xs font-medium text-muted-foreground">{label}</div>
			<div
				className={
					hero
						? "mt-1.5 text-4xl font-bold text-primary"
						: "mt-1.5 text-3xl font-bold"
				}
			>
				{value ?? "–"}
			</div>
			{detail ? (
				<div className="mt-2.5 border-t pt-2.5 text-xs text-muted-foreground">
					{detail}
				</div>
			) : null}
		</div>
	);
}

function RecentCard({
	dpps,
	loading,
}: {
	dpps: DppListItem[];
	loading: boolean;
}) {
	return (
		<div className="overflow-hidden rounded-xl border bg-card">
			<div className="flex items-center justify-between border-b px-5 py-3.5">
				<h2 className="text-[15px] font-bold">Zuletzt geändert</h2>
				<Link
					className="flex items-center gap-1 text-xs font-medium text-primary hover:underline"
					to="/dpps"
				>
					Alle anzeigen
					<ArrowRight className="size-3.5" />
				</Link>
			</div>
			{loading ? (
				<div className="grid gap-2 p-5">
					<Skeleton className="h-10 w-full" />
					<Skeleton className="h-10 w-full" />
				</div>
			) : dpps.length === 0 ? (
				<p className="p-5 text-sm text-muted-foreground">
					Noch keine Produktpässe.
				</p>
			) : (
				<ul className="divide-y">
					{dpps.map((dpp) => (
						<li key={dpp.digitalProductPassportId}>
							<Link
								className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-muted/40"
								params={{ dppId: dpp.publicId }}
								to="/dpps/$dppId"
							>
								<span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
									<Package className="size-4" />
								</span>
								<div className="min-w-0 flex-1">
									<div className="truncate text-[13.5px] font-semibold">
										{dpp.productId}
									</div>
									<div className="truncate font-mono text-[11px] text-muted-foreground">
										{dpp.digitalProductPassportId}
									</div>
								</div>
								<DppVersionStatus
									publishedVersionLabel={dpp.publishedVersionLabel}
									status={dpp.status}
									versionLabel={dpp.versionLabel}
								/>
								<span className="hidden w-24 text-right text-[12px] text-muted-foreground sm:block">
									{new Date(dpp.lastUpdate).toLocaleDateString("de-DE")}
								</span>
							</Link>
						</li>
					))}
				</ul>
			)}
		</div>
	);
}

function ReviewCard({
	dpps,
	loading,
}: {
	dpps: DppListItem[];
	loading: boolean;
}) {
	return (
		<div className="overflow-hidden rounded-xl border bg-card">
			<div className="flex items-center gap-2 border-b px-5 py-3.5">
				<ClipboardCheck className="size-4 text-muted-foreground" />
				<h2 className="text-[15px] font-bold">Ausstehende Reviews</h2>
			</div>
			{loading ? (
				<div className="p-5">
					<Skeleton className="h-10 w-full" />
				</div>
			) : dpps.length === 0 ? (
				<p className="p-5 text-sm text-muted-foreground">
					Keine offenen Reviews.
				</p>
			) : (
				<ul className="divide-y">
					{dpps.map((dpp) => (
						<li key={dpp.digitalProductPassportId}>
							<Link
								className="flex items-center gap-3 px-5 py-2.5 transition-colors hover:bg-muted/40"
								params={{ dppId: dpp.publicId }}
								to="/dpps/$dppId"
							>
								<div className="min-w-0 flex-1 truncate text-[13px] font-medium">
									{dpp.productId}
								</div>
								<span className="shrink-0 text-[11px] text-muted-foreground">
									{new Date(dpp.lastUpdate).toLocaleDateString("de-DE")}
								</span>
							</Link>
						</li>
					))}
				</ul>
			)}
		</div>
	);
}

function QuickActions() {
	return (
		<div className="rounded-xl border bg-card p-4">
			<h2 className="mb-3 text-[15px] font-bold">Schnellzugriffe</h2>
			<div className="grid gap-2">
				<QuickLink
					icon={<Package className="size-4" />}
					label="Alle Produktpässe"
					to="/dpps"
				/>
				<QuickLink
					icon={<Database className="size-4" />}
					label="Produkte"
					to="/catalog/products"
				/>
				<QuickLink
					icon={<Database className="size-4" />}
					label="Standorte"
					to="/catalog/facilities"
				/>
				<QuickLink
					icon={<Database className="size-4" />}
					label="Wirtschaftsakteure"
					to="/catalog/operators"
				/>
				<QuickLink
					icon={<BookOpen className="size-4" />}
					label="Dictionaries"
					to="/catalog/dictionaries"
				/>
			</div>
		</div>
	);
}

function QuickLink({
	icon,
	label,
	to,
}: {
	icon: React.ReactNode;
	label: string;
	to:
		| "/dpps"
		| "/catalog/products"
		| "/catalog/facilities"
		| "/catalog/operators"
		| "/catalog/dictionaries";
}) {
	return (
		<Link
			className="flex items-center gap-2.5 rounded-lg border px-3 py-2.5 text-[13px] font-medium transition-colors hover:bg-muted/50"
			to={to}
		>
			<span className="text-muted-foreground">{icon}</span>
			{label}
			<ArrowRight className="ml-auto size-3.5 text-muted-foreground" />
		</Link>
	);
}
