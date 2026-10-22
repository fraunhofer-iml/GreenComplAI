import { Link } from "@tanstack/react-router";
import {
	ChevronRight,
	KeyRound,
	Loader2,
	PlugZap,
	ShieldAlert,
} from "lucide-react";

import { Badge } from "#/components/ui/badge";
import { buttonVariants } from "#/components/ui/button";
import { AppNavbar } from "#/features/navigation/app-navbar";
import { useActiveOrganizationId } from "#/features/organization/organization-store";
import { useOrganizations } from "#/features/organization/organizations-api";

import { type Connector, useConnectors } from "./connectors-api";

// This overview is a list, not a form.
//
// Previously each connector appeared as an expanded card with all its input
// fields — a wall of fields even with one connector, unusable with five. What
// this page needs to answer is a different question: *which* connectors exist
// and which of them is set up. What a configured connector needs lives on its
// own page, where it can keep growing (credentials, connection test, field
// mapping, import).
export function ConnectorsPage() {
	const { data: organizations } = useOrganizations();
	const activeId = useActiveOrganizationId();
	const active =
		organizations?.find((org) => org.id === activeId) ?? organizations?.[0];
	const isAdmin = active?.role === "admin";

	return (
		<div className="min-h-screen bg-background">
			<AppNavbar />
			<main className="mx-auto w-full max-w-[1000px] px-4 py-7 sm:px-6 lg:px-8">
				<div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
					<Link className="hover:text-primary" to="/dashboard">
						Übersicht
					</Link>
					<span aria-hidden>/</span>
					<span className="font-medium text-foreground">Anbindungen</span>
				</div>
				<h1 className="mt-2 text-[22px] font-bold tracking-tight">
					Anbindungen
				</h1>
				<p className="mt-1 text-[13px] text-muted-foreground">
					Module für Fremdsysteme — jede Organisation entscheidet selbst, welche
					sie einrichtet{active ? ` · ${active.name}` : ""}.
				</p>

				{isAdmin ? (
					<ConnectorList />
				) : (
					<div className="mt-8 flex items-center gap-3 rounded-xl border bg-card p-5 text-sm text-muted-foreground">
						<ShieldAlert className="size-5 text-muted-foreground" />
						Nur Administratoren können Anbindungen einrichten.
					</div>
				)}
			</main>
		</div>
	);
}

function ConnectorList() {
	const connectors = useConnectors(true);
	const entries = connectors.data ?? [];

	if (connectors.isPending) {
		return (
			<div className="mt-8 flex items-center gap-2 text-sm text-muted-foreground">
				<Loader2 className="size-4 animate-spin" />
				Module werden geladen …
			</div>
		);
	}

	return (
		<div className="mt-6 grid gap-4">
			{entries.some((entry) => !entry.secretStorageAvailable) ? (
				<SecretKeyWarning />
			) : null}

			{entries.length === 0 ? (
				<div className="flex items-center gap-3 rounded-xl border bg-card p-5 text-sm text-muted-foreground">
					<PlugZap className="size-5" />
					Diese Installation bringt keine Anbindungsmodule mit.
				</div>
			) : (
				<div className="overflow-hidden rounded-xl border bg-card">
					{entries.map((entry, index) => (
						<ConnectorRow
							connector={entry}
							first={index === 0}
							key={entry.key}
						/>
					))}
				</div>
			)}
		</div>
	);
}

function ConnectorRow({
	connector,
	first,
}: {
	connector: Connector;
	first: boolean;
}) {
	return (
		<Link
			className={`flex items-center gap-4 px-5 py-4 transition-colors hover:bg-muted/40 ${
				first ? "" : "border-t"
			}`}
			params={{ connectorKey: connector.key }}
			to="/connectors/$connectorKey"
		>
			<span className="flex size-10 flex-none items-center justify-center rounded-lg bg-muted text-muted-foreground">
				<PlugZap className="size-5" />
			</span>

			<div className="min-w-0 flex-1">
				<div className="flex flex-wrap items-center gap-2">
					<span className="text-[15px] font-bold">{connector.name}</span>
					<StatusBadge connector={connector} />
				</div>
				<p className="mt-0.5 text-[12.5px] text-muted-foreground">
					{connector.description}
				</p>
				<p className="mt-1 text-[11px] text-muted-foreground">
					{connector.vendor} · {connector.version}
				</p>
			</div>

			{/* No button that does anything other than the row: "Install" leads to
			    setup, because a connector without credentials can't be installed.
			    A button that installs immediately would have nothing to enter. */}
			<span
				className={buttonVariants({
					className: "pointer-events-none flex-none",
					size: "sm",
					variant: connector.installed ? "outline" : "default",
				})}
			>
				{connector.installed ? "Einstellungen" : "Installieren"}
				<ChevronRight className="size-3.5" />
			</span>
		</Link>
	);
}

function StatusBadge({ connector }: { connector: Connector }) {
	if (!connector.known) return <Badge variant="destructive">Modul fehlt</Badge>;
	if (!connector.installed) return null;

	return (
		<Badge variant={connector.status === "active" ? "outline" : "secondary"}>
			{connector.status === "active" ? "aktiv" : "abgeschaltet"}
		</Badge>
	);
}

// Shown when the instance has no key to encrypt connector credentials with.
//
// Two audiences in one box, and that is deliberate. The first paragraph is for
// the administrator who wants to set up a connector and needs to know why they
// cannot yet - stated as a property of the system, not as a missing step in
// someone's setup. The second is for whoever operates the instance and can fix
// it, and names the one thing they have to do.
export function SecretKeyWarning() {
	return (
		<div className="flex items-start gap-3 rounded-xl border border-amber-500/40 bg-amber-500/5 p-4 text-[13px]">
			<KeyRound className="mt-0.5 size-4 shrink-0 text-amber-500" />
			<div>
				<div className="font-semibold">
					Zugangsdaten zu Fremdsystemen sind auf dieser Instanz noch nicht
					abgesichert
				</div>
				<p className="mt-1 text-muted-foreground">
					Die Zugangsdaten einer Anbindung werden verschlüsselt abgelegt, damit
					sie auch aus einer kopierten Datenbank heraus unbrauchbar bleiben. Der
					Schlüssel dafür ist hier noch nicht hinterlegt. Bis dahin nimmt die
					Plattform keine Anbindung mit Geheimnis an — sie würde es sonst im
					Klartext speichern.
				</p>
				<p className="mt-2 text-muted-foreground">
					Für den Betrieb dieser Instanz:{" "}
					<code className="font-mono text-xs">CONNECTOR_SECRET_KEY</code> auf
					einen base64-kodierten 32-Byte-Schlüssel setzen (
					<code className="font-mono text-xs">openssl rand -base64 32</code>)
					und die Anwendung neu starten. Der Schlüssel gehört in die Umgebung,
					nicht in die Datenbank.
				</p>
			</div>
		</div>
	);
}
