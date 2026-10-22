import type { ProductLifecycleStatus } from "@dpp/schemas";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Download, Loader2, Plus } from "lucide-react";
import { useEffect, useState } from "react";

import { Badge } from "#/components/ui/badge";
import { Button, buttonVariants } from "#/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "#/components/ui/dropdown-menu";
import { Field, FieldLabel } from "#/components/ui/field";
import { Input } from "#/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "#/components/ui/select";
import { ApiError } from "#/features/api/client";
import { CreateDppDialog } from "#/features/dashboard/create-dpp-dialog";
import { listDpps } from "#/features/dashboard/dashboard-api";

import {
	getProduct,
	label,
	type Product,
	patchProduct,
	productLifecycleLabels,
} from "./catalog-api";
import { CatalogPage } from "./catalog-layout";
import {
	type IdentifierDraft,
	IdentifierFields,
	usableIdentifiers,
} from "./identifier-fields";
import {
	rowsToTranslatableString,
	TranslationFields,
	type TranslationRow,
	translatableStringToRows,
} from "./translation-fields";

// One product in the catalogue.
//
// The page used to be a generic edit form: a JSON textarea for the name, a
// second one for the metadata, and a free-text box for the lifecycle. It let
// you change every field and told you nothing about the record - not where it
// came from, not what the source system knows that the passport does not, not
// whether a passport exists at all.
//
// So the shape here follows the two questions someone actually arrives with.
// *What is this?* - identity, master data, identifiers. And *how far is it from
// being a passport?* - where it came from, what came along uninterpreted, which
// passports already stand on it.

const lifecycleValues = Object.keys(
	productLifecycleLabels,
) as ProductLifecycleStatus[];

export function ProductDetailPage({ productId }: { productId: string }) {
	const query = useQuery({
		queryKey: ["catalog", "products", productId],
		queryFn: () => getProduct(productId),
	});
	const product = query.data;
	const source = readSource(product?.metadata);

	return (
		<CatalogPage
			description={
				product ? (
					<span className="flex flex-wrap items-center gap-x-2 gap-y-1">
						<span className="font-mono text-[12px]">{product.productId}</span>
						{product.category ? <span>· {product.category}</span> : null}
					</span>
				) : undefined
			}
			title={product ? label(product.name) : productId}
		>
			{query.isPending ? (
				<div className="flex items-center gap-2 text-sm text-muted-foreground">
					<Loader2 className="size-4 animate-spin" />
					Produkt wird geladen …
				</div>
			) : !product ? (
				<Panel title="Nicht gefunden">
					<p className="text-[13px] text-muted-foreground">
						Unter der Kennung „{productId}" gibt es in diesem Katalog kein
						Produkt.
					</p>
					<Link
						className={buttonVariants({
							className: "w-fit",
							size: "sm",
							variant: "outline",
						})}
						to="/catalog/products"
					>
						Zur Produktliste
					</Link>
				</Panel>
			) : (
				<>
					{source ? <OriginPanel source={source} /> : null}

					<div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
						<MasterDataPanel product={product} />
						<PassportPanel productId={product.productId} source={source} />
					</div>

					<IdentifierPanel
						identifiers={product.identifiers}
						productId={product.productId}
					/>

					{source && source.attributes.length > 0 ? (
						<SourceAttributePanel
							attributes={source.attributes}
							connector={source.connector}
						/>
					) : null}
				</>
			)}
		</CatalogPage>
	);
}

function Panel({
	actions,
	children,
	description,
	title,
}: {
	actions?: React.ReactNode;
	children: React.ReactNode;
	description?: string;
	title: string;
}) {
	return (
		<section className="overflow-hidden rounded-xl border bg-card">
			<div className="flex flex-wrap items-start justify-between gap-3 border-b px-5 py-3.5">
				<div className="min-w-0">
					<h2 className="text-[15px] font-bold">{title}</h2>
					{description ? (
						<p className="mt-0.5 text-[12.5px] text-muted-foreground">
							{description}
						</p>
					) : null}
				</div>
				{actions}
			</div>
			<div className="grid gap-4 px-5 py-4">{children}</div>
		</section>
	);
}

// Where the record comes from, and what that means for editing it.
//
// The single fact this catalogue turns on: a product is either kept by hand or
// a mirror of a foreign system. For a mirrored one, most of what is below will
// be overwritten the next time somebody imports it - saying so beats letting
// someone find out by losing an edit.
function OriginPanel({ source }: { source: ProductSource }) {
	return (
		<section className="flex flex-wrap items-center gap-x-6 gap-y-2 rounded-xl border border-dashed bg-muted/30 px-5 py-3.5 text-[12.5px]">
			<div className="flex items-center gap-2">
				<Download className="size-3.5 shrink-0 text-muted-foreground" />
				<span className="font-medium">
					Aus{" "}
					{source.connector
						? source.connector.toUpperCase()
						: "einem Fremdsystem"}{" "}
					übernommen
				</span>
			</div>
			{source.externalId ? (
				<Fact label="Kennung dort" value={source.externalId} mono />
			) : null}
			{source.sourceType ? (
				<Fact label="Datensatzart" value={source.sourceType} mono />
			) : null}
			{source.importedAt ? (
				<Fact label="Zuletzt geholt" value={formatMoment(source.importedAt)} />
			) : null}

			{source.connector && source.externalId ? (
				<Link
					className={buttonVariants({
						className: "ml-auto",
						size: "sm",
						variant: "outline",
					})}
					params={{
						connectorKey: source.connector,
						externalId: source.externalId,
					}}
					to="/connectors/$connectorKey/import/$externalId"
				>
					Erneut übernehmen
				</Link>
			) : null}
		</section>
	);
}

function Fact({
	label: name,
	mono = false,
	value,
}: {
	label: string;
	mono?: boolean;
	value: string;
}) {
	return (
		<div className="flex items-baseline gap-1.5">
			<span className="text-muted-foreground">{name}</span>
			<span className={mono ? "font-mono text-[12px]" : undefined}>
				{value}
			</span>
		</div>
	);
}

function MasterDataPanel({ product }: { product: Product }) {
	const client = useQueryClient();
	const [nameRows, setNameRows] = useState<TranslationRow[]>(() =>
		translatableStringToRows(product.name),
	);
	const [form, setForm] = useState({
		category: product.category ?? "",
		lifecycleStatus: product.lifecycleStatus,
		manufacturerProductId: product.manufacturerProductId ?? "",
	});
	const [saved, setSaved] = useState(false);

	// A refetch - after an import, say - brings values the form has to follow,
	// or the next save would write back what the screen happened to hold.
	useEffect(() => {
		setNameRows(translatableStringToRows(product.name));
		setForm({
			category: product.category ?? "",
			lifecycleStatus: product.lifecycleStatus,
			manufacturerProductId: product.manufacturerProductId ?? "",
		});
	}, [product]);

	const mutation = useMutation({
		mutationFn: () =>
			patchProduct(product.productId, {
				category: form.category.trim() || null,
				lifecycleStatus: form.lifecycleStatus,
				manufacturerProductId: form.manufacturerProductId.trim() || null,
				name: rowsToTranslatableString(nameRows),
			}),
		onSuccess: async () => {
			setSaved(true);
			await client.invalidateQueries({ queryKey: ["catalog", "products"] });
		},
	});

	return (
		<Panel
			description="Was der Katalog über das Produkt selbst führt."
			title="Stammdaten"
		>
			<TranslationFields
				label="Name"
				onRowsChange={(rows) => {
					setNameRows(rows);
					setSaved(false);
				}}
				required
				rows={nameRows}
			/>

			<div className="grid gap-4 sm:grid-cols-2">
				<Field>
					<FieldLabel htmlFor="product-category">Kategorie</FieldLabel>
					<Input
						id="product-category"
						onChange={(event) => {
							setForm((current) => ({
								...current,
								category: event.target.value,
							}));
							setSaved(false);
						}}
						placeholder="z. B. Standardmaschine"
						value={form.category}
					/>
				</Field>

				<Field>
					<FieldLabel htmlFor="product-lifecycle">Lebenszyklus</FieldLabel>
					<Select
						onValueChange={(value) => {
							setForm((current) => ({
								...current,
								lifecycleStatus:
									(value as ProductLifecycleStatus | null) ??
									current.lifecycleStatus,
							}));
							setSaved(false);
						}}
						value={form.lifecycleStatus}
					>
						<SelectTrigger className="w-full" id="product-lifecycle">
							<SelectValue>
								{productLifecycleLabels[form.lifecycleStatus]}
							</SelectValue>
						</SelectTrigger>
						<SelectContent>
							{lifecycleValues.map((status) => (
								<SelectItem key={status} value={status}>
									{productLifecycleLabels[status]}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</Field>

				<Field className="sm:col-span-2">
					<FieldLabel htmlFor="product-manufacturer-number">
						Hersteller-Produktnummer
					</FieldLabel>
					<Input
						id="product-manufacturer-number"
						onChange={(event) => {
							setForm((current) => ({
								...current,
								manufacturerProductId: event.target.value,
							}));
							setSaved(false);
						}}
						placeholder="Artikel- oder Typnummer des Herstellers"
						value={form.manufacturerProductId}
					/>
				</Field>
			</div>

			<div className="flex flex-wrap items-center gap-3">
				<Button disabled={mutation.isPending} onClick={() => mutation.mutate()}>
					{mutation.isPending ? (
						<Loader2 className="size-3.5 animate-spin" />
					) : null}
					Stammdaten speichern
				</Button>
				<SaveState error={mutation.error} saved={saved} />
			</div>
		</Panel>
	);
}

// The passports standing on this product. A catalogue entry exists to carry
// them; a page that does not say whether any exist is a dead end.
function PassportPanel({
	productId,
	source,
}: {
	productId: string;
	source?: ProductSource | undefined;
}) {
	const query = useQuery({
		queryKey: ["dpps", "by-product", productId],
		queryFn: () => listDpps({ limit: 10, productId }),
	});
	const dpps = query.data?.dpps ?? [];
	const [creating, setCreating] = useState(false);
	const importable = Boolean(source?.connector && source?.externalId);

	return (
		<Panel
			description={
				query.isPending
					? undefined
					: dpps.length === 0
						? "Noch keiner."
						: `${query.data?.total ?? dpps.length} für dieses Produkt.`
			}
			title="Produktpässe"
		>
			{query.isPending ? (
				<p className="text-[12.5px] text-muted-foreground">Wird geladen …</p>
			) : dpps.length === 0 ? (
				<p className="text-[12.5px] text-muted-foreground">
					Aus diesem Katalogeintrag ist noch kein Pass entstanden. Ein Entwurf
					braucht Granularität, Wörterbuch und den verantwortlichen
					Wirtschaftsakteur.
				</p>
			) : (
				<ul className="grid gap-1.5">
					{dpps.map((dpp) => (
						<li key={dpp.digitalProductPassportId}>
							<Link
								className="flex items-center gap-2 rounded-md border px-3 py-2 text-[12.5px] transition-colors hover:bg-accent"
								params={{ dppId: dpp.digitalProductPassportId }}
								to="/dpps/$dppId"
							>
								<span className="font-mono text-[11.5px]">
									{dpp.versionLabel}
								</span>
								<span className="truncate text-muted-foreground">
									{dpp.granularity}
								</span>
								<Badge
									className="ml-auto shrink-0 text-[10px]"
									variant={dpp.status === "published" ? "outline" : "secondary"}
								>
									{dppStatusLabels[dpp.status] ?? dpp.status}
								</Badge>
							</Link>
						</li>
					))}
				</ul>
			)}

			{/* Two ways to get here, and they are not the same job. An empty draft
			    is the right start for a product nobody has data for. For a record
			    that mirrors a foreign system, the data is already there and the
			    import screen knows how to map it - starting empty would mean
			    typing in what a connector can fetch. */}
			{importable ? (
				<DropdownMenu>
					<DropdownMenuTrigger
						render={
							<Button className="w-fit" size="sm" variant="outline">
								<Plus className="size-3.5" />
								Pass anlegen
							</Button>
						}
					/>
					<DropdownMenuContent align="start" className="max-w-[300px]">
						<DropdownMenuItem
							render={
								<Link
									params={{
										connectorKey: source?.connector ?? "",
										externalId: source?.externalId ?? "",
									}}
									to="/connectors/$connectorKey/import/$externalId"
								/>
							}
						>
							<div className="grid gap-0.5">
								<span>
									Daten aus {source?.connector?.toUpperCase()} übernehmen
								</span>
								<span className="text-[11.5px] text-muted-foreground">
									Felder des Datensatzes zuordnen und als Datenelemente
									übernehmen.
								</span>
							</div>
						</DropdownMenuItem>
						<DropdownMenuItem onClick={() => setCreating(true)}>
							<div className="grid gap-0.5">
								<span>Leeren Entwurf anlegen</span>
								<span className="text-[11.5px] text-muted-foreground">
									Ohne Datenelemente; im Pass-Editor von Hand befüllen.
								</span>
							</div>
						</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
			) : (
				<Button
					className="w-fit"
					onClick={() => setCreating(true)}
					size="sm"
					variant="outline"
				>
					<Plus className="size-3.5" />
					Pass anlegen
				</Button>
			)}

			<CreateDppDialog
				onOpenChange={setCreating}
				open={creating}
				productId={productId}
				showTrigger={false}
			/>
		</Panel>
	);
}

const dppStatusLabels: Record<string, string> = {
	archived: "Archiviert",
	draft: "Entwurf",
	published: "Veröffentlicht",
	review: "In Prüfung",
};

// Its own panel and its own save, because the patch replaces the list as a
// whole. Inside the master-data form every name change would rewrite them - and
// a form that does not know about them would delete them.
function IdentifierPanel({
	identifiers,
	productId,
}: {
	identifiers: IdentifierDraft[];
	productId: string;
}) {
	const client = useQueryClient();
	const [draft, setDraft] = useState<IdentifierDraft[]>(identifiers);
	const [saved, setSaved] = useState(false);

	// After saving, the server returns its own version of the list (without the
	// empty rows, for instance), so a refetch has to pull the draft along.
	useEffect(() => {
		setDraft(identifiers);
	}, [identifiers]);

	const mutation = useMutation({
		mutationFn: () =>
			patchProduct(productId, { identifiers: usableIdentifiers(draft) }),
		onSuccess: async () => {
			setSaved(true);
			await client.invalidateQueries({ queryKey: ["catalog", "products"] });
		},
	});

	return (
		// No description here: `IdentifierFields` brings its own label and hint,
		// and saying the same thing twice in one panel reads as a mistake.
		<Panel title="Kennungen">
			<IdentifierFields
				onChange={(next) => {
					setDraft(next);
					setSaved(false);
				}}
				showCaption={false}
				value={draft}
			/>
			<div className="flex flex-wrap items-center gap-3">
				<Button disabled={mutation.isPending} onClick={() => mutation.mutate()}>
					{mutation.isPending ? (
						<Loader2 className="size-3.5 animate-spin" />
					) : null}
					Kennungen speichern
				</Button>
				<SaveState error={mutation.error} saved={saved} />
			</div>
		</Panel>
	);
}

// What the source system knows and the passport does not.
//
// These are the fields nobody has assigned a meaning to yet - kept so nothing
// is lost, uninterpreted because assigning that meaning is a decision the ERP
// cannot make. As a JSON blob they were unreadable; as a list they are a
// to-do with a length.
function SourceAttributePanel({
	attributes,
	connector,
}: {
	attributes: SourceAttribute[];
	connector?: string;
}) {
	return (
		<Panel
			description="Mitgeführt, aber keinem Wörterbucheintrag zugeordnet — sie stehen deshalb in keinem Pass."
			title={`Herkunftsangaben (${attributes.length})`}
		>
			<dl className="grid gap-x-8 gap-y-2 sm:grid-cols-2">
				{attributes.map((attribute) => (
					<div
						className="flex items-baseline justify-between gap-4 border-b border-dashed pb-1.5 text-[12.5px]"
						key={attribute.key}
					>
						<dt className="text-muted-foreground">{attribute.label}</dt>
						<dd className="text-right font-medium">
							{formatValue(attribute.value)}
							{attribute.unit ? ` ${attribute.unit}` : ""}
						</dd>
					</div>
				))}
			</dl>

			{connector ? (
				<p className="text-[11.5px] text-muted-foreground">
					Wohin sie gehören, wird beim nächsten Import dieser Datensatzart
					entschieden — die Zuordnung gilt danach für alle Datensätze der Art.
				</p>
			) : null}
		</Panel>
	);
}

function SaveState({ error, saved }: { error: unknown; saved: boolean }) {
	if (error) {
		return (
			<p className="text-[12.5px] text-destructive" role="alert">
				{error instanceof ApiError
					? error.message
					: "Speichern fehlgeschlagen. Bitte erneut versuchen."}
			</p>
		);
	}
	if (saved) {
		return (
			<p
				className="text-[12.5px] text-muted-foreground"
				aria-live="polite"
				aria-atomic="true"
			>
				Gespeichert.
			</p>
		);
	}

	return null;
}

type SourceAttribute = {
	key: string;
	label: string;
	unit?: string;
	value: unknown;
};

type ProductSource = {
	attributes: SourceAttribute[];
	connector?: string;
	externalId?: string;
	importedAt?: string;
	sourceType?: string;
};

// `metadata` is free-form JSON by contract, so nothing guarantees this shape.
// Read defensively: a record whose metadata says something else is a record
// without an origin, not a crash.
function readSource(metadata: unknown): ProductSource | undefined {
	if (!metadata || typeof metadata !== "object") return undefined;
	const source = (metadata as { source?: unknown }).source;
	if (!source || typeof source !== "object") return undefined;

	const record = source as Record<string, unknown>;
	const attributes = Array.isArray(record.attributes)
		? record.attributes.filter(isSourceAttribute)
		: [];

	return {
		attributes,
		connector: text(record.connector),
		externalId: text(record.externalId),
		importedAt: text(record.importedAt),
		sourceType: text(record.sourceType),
	};
}

function isSourceAttribute(value: unknown): value is SourceAttribute {
	if (!value || typeof value !== "object") return false;
	const record = value as Record<string, unknown>;

	return typeof record.key === "string" && typeof record.label === "string";
}

function text(value: unknown): string | undefined {
	return typeof value === "string" && value.length > 0 ? value : undefined;
}

function formatValue(value: unknown): string {
	if (value === null || value === undefined || value === "") return "—";
	if (Array.isArray(value)) return value.map(formatValue).join(", ");
	if (typeof value === "boolean") return value ? "ja" : "nein";
	if (typeof value === "object") return JSON.stringify(value);

	return String(value);
}

function formatMoment(value: string): string {
	const moment = new Date(value);
	if (Number.isNaN(moment.getTime())) return value;

	return moment.toLocaleString("de-DE", {
		day: "2-digit",
		hour: "2-digit",
		minute: "2-digit",
		month: "2-digit",
		year: "numeric",
	});
}
