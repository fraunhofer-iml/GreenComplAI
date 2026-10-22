import { Link, useNavigate } from "@tanstack/react-router";
import {
	ArrowLeft,
	Download,
	Loader2,
	PlugZap,
	Search,
	ShieldAlert,
	Trash2,
} from "lucide-react";
import { useState } from "react";

import { Badge } from "#/components/ui/badge";
import { Button, buttonVariants } from "#/components/ui/button";
import { Field, FieldLabel } from "#/components/ui/field";
import { Input } from "#/components/ui/input";
import { AppNavbar } from "#/features/navigation/app-navbar";
import { useActiveOrganizationId } from "#/features/organization/organization-store";
import { useOrganizations } from "#/features/organization/organizations-api";

import { Feedback } from "./connector-feedback";
import {
	type Connector,
	type ConnectorPreview,
	useConnectors,
	useInstallConnector,
	useLookupExternalProduct,
	useSetConnectorStatus,
	useTestConnector,
	useUninstallConnector,
} from "./connectors-api";
import { SecretKeyWarning } from "./connectors-page";

// Everything a single connector needs, in one place instead of scattered
// across an overview that has no business knowing about it.
//
// Import lives here, not on the overview: it always belongs to exactly one
// connector. On the overview it would need a selection list that only asked
// the question this page already answers.
export function ConnectorSettingsPage({
	connectorKey,
}: {
	connectorKey: string;
}) {
	const { data: organizations } = useOrganizations();
	const activeId = useActiveOrganizationId();
	const active =
		organizations?.find((org) => org.id === activeId) ?? organizations?.[0];
	const isAdmin = active?.role === "admin";
	const connectors = useConnectors(isAdmin);
	const connector = connectors.data?.find(
		(entry) => entry.key === connectorKey,
	);

	return (
		<div className="min-h-screen bg-background">
			<AppNavbar />
			<main className="mx-auto w-full max-w-[1000px] px-4 py-7 sm:px-6 lg:px-8">
				<div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
					<Link className="hover:text-primary" to="/dashboard">
						Übersicht
					</Link>
					<span aria-hidden>/</span>
					<Link className="hover:text-primary" to="/connectors">
						Anbindungen
					</Link>
					<span aria-hidden>/</span>
					<span className="font-medium text-foreground">
						{connector?.name ?? connectorKey}
					</span>
				</div>

				{!isAdmin ? (
					<div className="mt-8 flex items-center gap-3 rounded-xl border bg-card p-5 text-sm text-muted-foreground">
						<ShieldAlert className="size-5 text-muted-foreground" />
						Nur Administratoren können Anbindungen einrichten.
					</div>
				) : connectors.isPending ? (
					<div className="mt-8 flex items-center gap-2 text-sm text-muted-foreground">
						<Loader2 className="size-4 animate-spin" />
						Wird geladen …
					</div>
				) : !connector ? (
					<div className="mt-8 grid gap-4 rounded-xl border bg-card p-5">
						<p className="text-sm text-muted-foreground">
							Diese Installation kennt kein Modul mit der Kennung „
							{connectorKey}".
						</p>
						<Link
							className={buttonVariants({
								className: "w-fit",
								size: "sm",
								variant: "outline",
							})}
							to="/connectors"
						>
							<ArrowLeft className="size-4" />
							Zur Übersicht
						</Link>
					</div>
				) : (
					<ConnectorSettingsBody connector={connector} />
				)}
			</main>
		</div>
	);
}

function ConnectorSettingsBody({ connector }: { connector: Connector }) {
	const importable =
		connector.installed &&
		connector.status === "active" &&
		connector.capabilities.includes("lookupByExternalId");

	return (
		<div className="mt-4 grid gap-4">
			<div className="flex flex-wrap items-start gap-4 rounded-xl border bg-card p-5">
				<span className="flex size-11 flex-none items-center justify-center rounded-lg bg-muted text-muted-foreground">
					<PlugZap className="size-5" />
				</span>
				<div className="min-w-0 flex-1">
					<div className="flex flex-wrap items-center gap-2">
						<h1 className="text-lg font-bold">{connector.name}</h1>
						{connector.installed ? (
							<Badge
								variant={
									connector.status === "active" ? "outline" : "secondary"
								}
							>
								{connector.status === "active" ? "aktiv" : "abgeschaltet"}
							</Badge>
						) : (
							<Badge variant="secondary">nicht installiert</Badge>
						)}
						{connector.known ? null : (
							<Badge variant="destructive">Modul fehlt</Badge>
						)}
						{connector.baseUrlOverridden ? (
							// Loud on purpose. An import from a mock that looks exactly
							// like an import from the real system is a trap someone walks
							// into once and then doubts every number afterwards.
							<Badge variant="destructive">Testserver</Badge>
						) : null}
					</div>
					<p className="mt-1 text-[13px] text-muted-foreground">
						{connector.description}
					</p>
					<p className="mt-1 text-[11.5px] text-muted-foreground">
						{connector.vendor} · {connector.version}
						{connector.baseUrl ? ` · ${connector.baseUrl}` : ""}
					</p>
					{connector.baseUrlOverridden ? (
						<p className="mt-1.5 text-[11.5px] text-destructive">
							Dieses Modul spricht nicht mit dem System seines Herstellers,
							sondern mit einem für diese Installation eingetragenen Testserver.
							Alles, was von hier in den Katalog wandert, stammt von dort.
						</p>
					) : null}
				</div>
				<Link
					className={buttonVariants({
						className: "flex-none",
						size: "sm",
						variant: "outline",
					})}
					to="/connectors"
				>
					<ArrowLeft className="size-4" />
					Alle Anbindungen
				</Link>
			</div>

			{connector.secretStorageAvailable ? null : <SecretKeyWarning />}

			<ConnectorConfigCard connector={connector} />

			{importable ? <ImportSection connector={connector} /> : null}
		</div>
	);
}

function ConnectorConfigCard({ connector }: { connector: Connector }) {
	const navigate = useNavigate();
	const install = useInstallConnector();
	const setStatus = useSetConnectorStatus();
	const uninstall = useUninstallConnector();
	const test = useTestConnector();
	// Open fields start with the stored value, secret ones always empty: a
	// prefilled password field would claim to know the value and then submit
	// something other than what is shown there.
	const [values, setValues] = useState<Record<string, string>>(() => ({
		...connector.config,
	}));

	const busy = install.isPending || setStatus.isPending || uninstall.isPending;

	return (
		<section className="overflow-hidden rounded-xl border bg-card">
			<div className="border-b px-5 py-3.5">
				<h2 className="text-[15px] font-bold">Zugang</h2>
				<p className="mt-0.5 text-[12.5px] text-muted-foreground">
					Die Zugangsdaten werden verschlüsselt gespeichert und nie wieder
					angezeigt.
				</p>
			</div>

			<div className="grid gap-4 px-5 py-4">
				{connector.available ? null : (
					<p className="text-[12.5px] text-amber-600 dark:text-amber-400">
						{connector.unavailableReason}
					</p>
				)}

				{connector.configFields.map((field) => (
					<Field key={field.key}>
						<FieldLabel htmlFor={`${connector.key}-${field.key}`}>
							{field.label}
							{field.required ? " *" : ""}
						</FieldLabel>
						<Input
							autoComplete={field.secret ? "new-password" : "off"}
							id={`${connector.key}-${field.key}`}
							onChange={(event) =>
								setValues((current) => ({
									...current,
									[field.key]: event.target.value,
								}))
							}
							placeholder={
								field.secret && connector.hasCredentials
									? "hinterlegt — leer lassen, um ihn zu behalten"
									: field.placeholder
							}
							type={field.secret ? "password" : "text"}
							value={values[field.key] ?? ""}
						/>
						{field.description ? (
							<p className="text-[11.5px] text-muted-foreground">
								{field.description}
							</p>
						) : null}
					</Field>
				))}

				<Feedback
					error={
						install.error ?? test.error ?? setStatus.error ?? uninstall.error
					}
					success={
						test.isSuccess
							? "Die Verbindung steht."
							: install.isSuccess
								? "Gespeichert."
								: undefined
					}
				/>

				<div className="flex flex-wrap items-center gap-2">
					<Button
						disabled={busy || !connector.available || !connector.known}
						onClick={() => {
							test.reset();
							install.mutate({ key: connector.key, values });
						}}
						size="sm"
					>
						{install.isPending ? (
							<Loader2 className="size-3.5 animate-spin" />
						) : null}
						{connector.installed ? "Speichern" : "Installieren"}
					</Button>

					{connector.installed ? (
						<>
							<Button
								disabled={test.isPending || connector.status !== "active"}
								onClick={() => {
									install.reset();
									test.mutate(connector.key);
								}}
								size="sm"
								variant="outline"
							>
								{test.isPending ? (
									<Loader2 className="size-3.5 animate-spin" />
								) : null}
								Verbindung prüfen
							</Button>
							<Button
								disabled={busy}
								onClick={() =>
									setStatus.mutate({
										key: connector.key,
										status:
											connector.status === "active" ? "disabled" : "active",
									})
								}
								size="sm"
								variant="outline"
							>
								{connector.status === "active" ? "Abschalten" : "Anschalten"}
							</Button>
							<Button
								className="ml-auto text-destructive"
								disabled={busy}
								onClick={() =>
									uninstall.mutate(connector.key, {
										// After uninstalling, this page has nothing left to show.
										onSuccess: () => void navigate({ to: "/connectors" }),
									})
								}
								size="sm"
								variant="ghost"
							>
								<Trash2 className="size-3.5" />
								Entfernen
							</Button>
						</>
					) : null}
				</div>

				{connector.installed ? (
					<p className="text-[11.5px] text-muted-foreground">
						Entfernen löscht die hinterlegten Zugangsdaten mit.
					</p>
				) : null}
			</div>
		</section>
	);
}

function ImportSection({ connector }: { connector: Connector }) {
	const [externalId, setExternalId] = useState("");
	const [found, setFound] = useState<ConnectorPreview | undefined>();
	const lookup = useLookupExternalProduct();

	const submit = () => {
		setFound(undefined);
		lookup.mutate(
			{ key: connector.key, externalId: externalId.trim() },
			{ onSuccess: setFound },
		);
	};

	return (
		<section className="overflow-hidden rounded-xl border bg-card">
			<div className="border-b px-5 py-3.5">
				<h2 className="text-[15px] font-bold">Datensatz nachschlagen</h2>
				<p className="mt-0.5 text-[12.5px] text-muted-foreground">
					Die eindeutige Kennung aus dem Fremdsystem eingeben. Eine
					Freitextsuche gibt es nicht — die angebundenen Systeme bieten keine
					an. Nachschlagen speichert nichts.
				</p>
			</div>

			<div className="grid gap-4 px-5 py-4">
				<div className="flex flex-wrap items-end gap-3">
					<Field className="min-w-[240px] flex-1">
						<FieldLabel htmlFor="import-external-id">
							Kennung im Fremdsystem
						</FieldLabel>
						<Input
							id="import-external-id"
							onChange={(event) => setExternalId(event.target.value)}
							onKeyDown={(event) => {
								if (event.key === "Enter" && externalId.trim()) submit();
							}}
							placeholder="z. B. Seriennummer oder externe ID"
							value={externalId}
						/>
					</Field>

					<Button
						disabled={lookup.isPending || !externalId.trim()}
						onClick={submit}
					>
						{lookup.isPending ? (
							<Loader2 className="size-3.5 animate-spin" />
						) : (
							<Search className="size-3.5" />
						)}
						Nachschlagen
					</Button>
				</div>

				<Feedback error={lookup.error} />

				{found ? (
					<LookupResult connectorKey={connector.key} preview={found} />
				) : null}
			</div>
		</section>
	);
}

// What the connected system holds, before anything is decided about it.
//
// This is the screen's whole job: showing enough for someone to recognise the
// record and say "yes, that one". The forty decisions about where its fields
// belong are a separate screen with an address of its own, reached by the
// button at the bottom - not something that unfolds under a search box.
function LookupResult({
	connectorKey,
	preview,
}: {
	connectorKey: string;
	preview: ConnectorPreview;
}) {
	const { mapping, product } = preview;
	const mapped = mapping.fields.filter(
		(field) => field.dictionaryReference,
	).length;
	const suggested = mapping.fields.filter(
		(field) => !field.dictionaryReference && field.suggestion,
	).length;

	return (
		<div className="rounded-lg border bg-muted/30 p-4">
			<div className="flex flex-wrap items-start gap-3">
				<div className="min-w-0 flex-1">
					<div className="text-[15px] font-semibold">{product.name}</div>
					<div className="mt-0.5 font-mono text-[11.5px] text-muted-foreground">
						{product.externalId}
						{mapping.sourceType.key ? ` · ${mapping.sourceType.label}` : ""}
					</div>
					{product.description ? (
						<p className="mt-2 text-[12.5px] text-muted-foreground">
							{product.description}
						</p>
					) : null}
				</div>
			</div>

			<dl className="mt-4 grid gap-x-6 gap-y-2 text-[12.5px] sm:grid-cols-2">
				{product.category ? (
					<Detail label="Kategorie" value={product.category} />
				) : null}
				{product.manufacturer ? (
					<Detail label="Hersteller" value={product.manufacturer.legalName} />
				) : null}
				{product.identifiers.map((identifier) => (
					<Detail
						key={`${identifier.type}:${identifier.value}`}
						label={identifier.type}
						value={identifier.value}
					/>
				))}
				{product.documents.length > 0 ? (
					<Detail
						label="Dateien am Datensatz"
						value={String(product.documents.length)}
					/>
				) : null}
			</dl>

			{/* How much work the next screen actually is. A record type that was
			    mapped once opens already filled in; a new one does not, and knowing
			    that before clicking is worth a line. */}
			<p className="mt-4 text-[12px] text-muted-foreground">
				{mapping.fields.length === 0
					? "Keine Zusatzfelder — es bliebe beim Katalogeintrag aus Name, Kategorie und Kennungen."
					: [
							`${mapping.fields.length} Zusatzfeld${mapping.fields.length === 1 ? "" : "er"}`,
							mapped > 0
								? `${mapped} davon zugeordnet`
								: "noch keines einem Wörterbucheintrag zugeordnet",
							suggested > 0 ? `${suggested} mit Vorschlag` : undefined,
						]
							.filter(Boolean)
							.join(" · ")}
			</p>

			<div className="mt-4 flex justify-end">
				<Link
					className={buttonVariants({ size: "sm" })}
					params={{ connectorKey, externalId: product.externalId }}
					to="/connectors/$connectorKey/import/$externalId"
				>
					<Download className="size-3.5" />
					Importieren
				</Link>
			</div>
		</div>
	);
}

function Detail({ label, value }: { label: string; value: string }) {
	return (
		<div>
			<dt className="text-muted-foreground">{label}</dt>
			<dd className="font-medium">{value}</dd>
		</div>
	);
}
