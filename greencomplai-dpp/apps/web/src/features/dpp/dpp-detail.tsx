import { Link } from "@tanstack/react-router";
import {
	AlertTriangle,
	CircuitBoard,
	ExternalLink,
	Lock,
	Package,
	Pencil,
} from "lucide-react";
import { useState } from "react";

import { Alert, AlertDescription, AlertTitle } from "#/components/ui/alert";
import { Button, buttonVariants } from "#/components/ui/button";
import { Card, CardContent } from "#/components/ui/card";
import { Skeleton } from "#/components/ui/skeleton";
import { AppNavbar } from "#/features/navigation/app-navbar";
import { useActiveOrganizationId } from "#/features/organization/organization-store";
import { useOrganizations } from "#/features/organization/organizations-api";
import { DictionaryUpgradeCard } from "./components/dictionary-upgrade-card";
import { DppActivityCard } from "./components/dpp-activity-card";
import { DppDynamicCards } from "./components/dpp-dynamic-cards";
import { DppRelationshipsCard } from "./components/dpp-relationships-card";
import { DppVersionStatus } from "./components/dpp-status-pills";
import { DppSummaryRail } from "./components/dpp-summary-rail";
import { DppEditor } from "./dpp-editor";
import { formatDate, resolveDpp, statusLabel, useDppView } from "./dpp-view";
import { DppWorkflowCard } from "./dpp-workflow";

export function DppDetailView({ dppId }: { dppId: string }) {
	const query = useDppView(dppId);
	const [editing, setEditing] = useState(false);
	const activeOrganizationId = useActiveOrganizationId();
	const organizations = useOrganizations();

	if (query.isLoading) return <TraceState title="Datenstrom wird aufgebaut" />;
	if (query.error || !query.data)
		return <TraceState error title="Traceability-Daten nicht erreichbar" />;

	const model = resolveDpp(query.data);
	const role = organizations.data?.find(
		(organization) => organization.id === activeOrganizationId,
	)?.role;
	const isDraft = model.dpp.status === "draft";
	const canEdit = isDraft && (role === "admin" || role === "editor");

	if (editing && canEdit && role) {
		return (
			<DppEditor
				dppId={dppId}
				onExit={() => setEditing(false)}
				payload={query.data}
				role={role}
			/>
		);
	}

	return (
		<div className="min-h-screen bg-background">
			<AppNavbar />
			<main className="mx-auto grid w-full max-w-[1400px] gap-4 px-4 py-6 sm:px-6 lg:px-8">
				{/* Breadcrumb */}
				<div className="flex flex-wrap items-center gap-1.5 text-[12.5px] text-muted-foreground">
					<Link
						className="transition-colors hover:text-primary"
						to="/dashboard"
					>
						Übersicht
					</Link>
					<span aria-hidden>/</span>
					<span className="font-semibold text-foreground">
						{model.dpp.productId}
					</span>
				</div>

				{/* Identity header card */}
				<section className="flex flex-wrap items-center gap-5 rounded-xl border bg-card p-5">
					<span className="flex size-14 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
						<Package className="size-6" />
					</span>
					<div className="min-w-0 flex-1">
						<div className="flex flex-wrap items-center gap-2.5">
							<h1 className="text-xl font-bold tracking-tight">
								{model.dpp.productId}
							</h1>
							<DppVersionStatus
								publishedVersionLabel={query.data.publishedVersionLabel}
								status={model.dpp.status}
								versionLabel={query.data.versionLabel}
							/>
						</div>
						<p className="mt-1 truncate font-mono text-xs text-muted-foreground">
							{model.dpp.digitalProductPassportId} ·{" "}
							{model.dpp.dppSchemaVersion} · {model.dpp.granularity}
						</p>
					</div>
					<div className="flex items-center gap-2">
						{query.data.hasPublicVersion ? (
							<Link
								className={buttonVariants({ variant: "outline" })}
								params={{ dppId: query.data.publicId }}
								target="_blank"
								to="/dpp/$dppId"
							>
								<ExternalLink className="size-4" />
								Öffentlicher DPP
							</Link>
						) : null}
						{canEdit ? (
							<Button onClick={() => setEditing(true)} type="button">
								<Pencil className="size-4" />
								Bearbeiten
							</Button>
						) : null}
					</div>
				</section>

				{!isDraft ? (
					<Alert>
						<Lock className="size-4" />
						<AlertTitle>Nicht editierbar</AlertTitle>
						<AlertDescription>
							Dieser DPP hat den Status „{statusLabel(model.dpp.status)}“. Nur
							Entwürfe können bearbeitet werden.
						</AlertDescription>
					</Alert>
				) : null}
				{/* Show dictionary updates while viewing; apply them only in an editable revision. */}
				<DictionaryUpgradeCard
					currentVersion={model.dpp.dppSchemaVersion.split("/").at(-1) ?? ""}
					dppId={dppId}
				/>

				{isDraft && role && !canEdit ? (
					<p className="text-sm text-muted-foreground">
						Zum Bearbeiten dieses Entwurfs ist die Rolle Admin oder Editor
						erforderlich.
					</p>
				) : null}

				{/* KPI tiles */}
				<section className="grid gap-3.5 sm:grid-cols-2 xl:grid-cols-4">
					<StatTile
						detail={`${model.publicCount} public · ${model.controlledCount} controlled`}
						hero
						label="Datenpunkte"
						value={model.totalCount}
					/>
					<StatTile
						detail="Öffentlich einsehbare Elemente"
						label="Public"
						value={model.publicCount}
					/>
					<StatTile
						detail="Zugriff über Rollen-Policies"
						label="Controlled"
						value={model.controlledCount}
					/>
					<StatTile
						detail="Verknüpfte Produktpässe"
						label="Beziehungen"
						value={model.relationships.length}
					/>
				</section>

				{/* Content grid: data on the left, pass record rail on the right */}
				<div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
					<div className="grid min-w-0 gap-4">
						<DppSummaryRail facts={model.summaryFacts} />
						<DppDynamicCards
							collections={model.collections}
							core={model.core}
							metricGroups={model.metricGroups}
						/>
					</div>
					{/* Let the fixed-width sidebar shrink around long content. */}
					<div className="grid min-w-0 gap-4">
						{role ? (
							<DppWorkflowCard
								dppId={dppId}
								role={role}
								status={model.dpp.status}
							/>
						) : null}
						<aside className="dark rounded-xl border bg-card p-5 text-card-foreground">
							<h2 className="text-[13.5px] font-bold">Passakte</h2>
							<dl className="mt-3.5 grid gap-3.5">
								<RailFact
									label="Status"
									value={statusLabel(model.dpp.status)}
								/>
								<RailFact
									label="DPP-Profil"
									value={model.dpp.dppSchemaVersion}
								/>
								<RailFact
									label="Aktualisiert"
									value={formatDate(model.dpp.lastUpdate, "long")}
								/>
								<div className="border-t pt-3">
									<dt className="text-[11px] font-semibold uppercase tracking-[0.04em] text-muted-foreground">
										DPP-ID
									</dt>
									<dd className="mt-1 break-all font-mono text-xs text-primary">
										{model.dpp.digitalProductPassportId}
									</dd>
								</div>
							</dl>
						</aside>
						<DppActivityCard dppId={dppId} />
						<DppRelationshipsCard relationships={model.relationships} />
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
	value: number;
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
				{value}
			</div>
			{detail ? (
				<div className="mt-2.5 border-t pt-2.5 text-xs text-muted-foreground">
					{detail}
				</div>
			) : null}
		</div>
	);
}

function RailFact({ label, value }: { label: string; value: string }) {
	return (
		<div className="min-w-0">
			<dt className="text-[11px] font-semibold uppercase tracking-[0.04em] text-muted-foreground">
				{label}
			</dt>
			<dd className="mt-0.5 truncate text-sm font-medium">{value}</dd>
		</div>
	);
}

function TraceState({
	title,
	error = false,
}: {
	error?: boolean;
	title: string;
}) {
	return (
		<div className="min-h-screen bg-background">
			<div className="mx-auto grid min-h-screen w-full max-w-xl place-items-center px-4">
				<Card className="w-full">
					<CardContent className="flex items-center gap-3 p-6">
						{error ? (
							<AlertTriangle className="size-5 text-destructive" />
						) : (
							<CircuitBoard className="size-5" />
						)}
						<div className="grid gap-2">
							<div className="font-medium">{title}</div>
							{!error ? <Skeleton className="h-2 w-48" /> : null}
						</div>
					</CardContent>
				</Card>
			</div>
		</div>
	);
}
