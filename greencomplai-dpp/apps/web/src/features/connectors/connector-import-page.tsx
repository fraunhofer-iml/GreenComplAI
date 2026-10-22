import type { Visibility } from "@dpp/schemas";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { ArrowLeft, Download, Loader2, Wand2 } from "lucide-react";
import { useState } from "react";

import { Badge } from "#/components/ui/badge";
import { Button, buttonVariants } from "#/components/ui/button";
import {
	Combobox,
	ComboboxCollection,
	ComboboxContent,
	ComboboxEmpty,
	ComboboxInput,
	ComboboxItem,
	ComboboxList,
} from "#/components/ui/combobox";
import { Field, FieldLabel } from "#/components/ui/field";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "#/components/ui/select";
import {
	dppGranularityLabels,
	label,
	listDictionaryRepositories,
	listEconomicOperators,
	visibilityLabels,
} from "#/features/catalog/catalog-api";
import { AppNavbar } from "#/features/navigation/app-navbar";

import { Feedback } from "./connector-feedback";
import {
	type ConnectorPreview,
	type DictionaryTarget,
	type FieldDecision,
	type ImportedProduct,
	type ImportRequest,
	type MappedField,
	useConnectors,
	useDictionaryTargets,
	useImportExternalProduct,
	usePreviewExternalProduct,
} from "./connectors-api";
import {
	type DictionaryCreated,
	DictionaryDraftWizard,
} from "./dictionary-draft-wizard";

// Taking one record from a connected system into the catalogue.
//
// Its own screen, addressed by the record it is about
// (`/connectors/simpl/import/ERP-1001`). It used to unfold underneath the
// lookup field on the connector's settings page, which put three unrelated
// things on one screen - credentials, a search box, and a form with forty
// decisions in it - and left the longest of the three with no address of its
// own. A mapping someone spends ten minutes on should survive a reload and be
// something they can send to a colleague.
//
// The screen fetches its own preview rather than taking one handed over during
// navigation. Handed-over state is gone after a reload, and this is a URL
// people will reload. The lookup on the settings page writes its result into
// the same cache entry, so arriving from there costs no second call.
export function ConnectorImportPage({
	connectorKey,
	externalId,
}: {
	connectorKey: string;
	externalId: string;
}) {
	const connectors = useConnectors(true);
	const connector = connectors.data?.find(
		(entry) => entry.key === connectorKey,
	);
	const preview = usePreviewExternalProduct(connectorKey, externalId);
	const importProduct = useImportExternalProduct();

	return (
		<div className="min-h-screen bg-background">
			<AppNavbar />
			<main className="mx-auto w-full max-w-[1000px] px-4 py-7 sm:px-6 lg:px-8">
				<div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
					<Link className="hover:text-primary" to="/connectors">
						Anbindungen
					</Link>
					<span aria-hidden>/</span>
					<Link
						className="hover:text-primary"
						params={{ connectorKey }}
						to="/connectors/$connectorKey"
					>
						{connector?.name ?? connectorKey}
					</Link>
					<span aria-hidden>/</span>
					<span className="font-medium text-foreground">Übernehmen</span>
				</div>

				{preview.isPending ? (
					<div className="mt-8 flex items-center gap-2 text-sm text-muted-foreground">
						<Loader2 className="size-4 animate-spin" />
						Datensatz wird geladen …
					</div>
				) : preview.isError ? (
					<div className="mt-8 grid gap-3 rounded-xl border bg-card p-5">
						<Feedback error={preview.error} />
						<Link
							className={buttonVariants({
								className: "w-fit",
								size: "sm",
								variant: "outline",
							})}
							params={{ connectorKey }}
							to="/connectors/$connectorKey"
						>
							<ArrowLeft className="size-4" />
							Zurück zum Nachschlagen
						</Link>
					</div>
				) : importProduct.data ? (
					<ImportResult
						connectorKey={connectorKey}
						product={importProduct.data}
						// Importing the same record again is a legitimate thing to do -
						// it refreshes the catalogue entry. Clearing the result puts the
						// form back without a round trip.
						onAgain={() => importProduct.reset()}
					/>
				) : (
					<>
						{connector?.baseUrlOverridden ? (
							// The same warning as on the settings page, because this is the
							// screen where the data actually crosses over. Whoever lands
							// here through a link never saw the other one.
							<div className="mt-4 rounded-xl border border-destructive/40 bg-destructive/5 p-4 text-[12.5px] text-destructive">
								Diese Anbindung spricht mit einem eingetragenen Testserver (
								{connector.baseUrl}), nicht mit dem System ihres Herstellers.
								Was von hier in den Katalog wandert, stammt von dort.
							</div>
						) : null}

						<div className="mt-4 grid gap-4">
							<Feedback error={importProduct.error} />
							<ImportForm
								busy={importProduct.isPending}
								connectorKey={connectorKey}
								key={`${connectorKey}:${externalId}`}
								onImport={(request) => importProduct.mutate(request)}
								preview={preview.data}
							/>
						</div>
					</>
				)}
			</main>
		</div>
	);
}

// What became of the record, once. Deliberately a screen of its own rather than
// a line above the form: an import reports several things at once - the
// catalogue entry, possibly a passport, possibly documents that did not make
// it - and each of them is a place someone may need to go next.
function ImportResult({
	connectorKey,
	onAgain,
	product,
}: {
	connectorKey: string;
	onAgain: () => void;
	product: ImportedProduct;
}) {
	return (
		<div className="mt-4 grid gap-4">
			<div className="rounded-xl border bg-card p-5">
				<div className="flex flex-wrap items-center gap-2">
					<h1 className="text-lg font-bold">
						{product.created ? "Übernommen" : "Aufgefrischt"}
					</h1>
					<Badge variant="secondary">{product.productId}</Badge>
				</div>
				<p className="mt-1 text-[13px] text-muted-foreground">
					{product.created
						? "Der Katalogeintrag ist neu angelegt."
						: "Der vorhandene Katalogeintrag wurde mit den Werten aus dem Fremdsystem aufgefrischt."}
				</p>

				<div className="mt-4 flex flex-wrap gap-2">
					<Link
						className={buttonVariants({ size: "sm" })}
						params={{ productId: product.productId }}
						to="/catalog/products/$productId"
					>
						Zum Katalogeintrag
					</Link>
					{product.dpp ? (
						<Link
							className={buttonVariants({ size: "sm", variant: "outline" })}
							params={{ dppId: product.dpp.digitalProductPassportId }}
							to="/dpps/$dppId"
						>
							Zum Passentwurf
						</Link>
					) : null}
					<Button onClick={onAgain} size="sm" variant="outline">
						Erneut übernehmen
					</Button>
					<Link
						className={buttonVariants({ size: "sm", variant: "ghost" })}
						params={{ connectorKey }}
						to="/connectors/$connectorKey"
					>
						<ArrowLeft className="size-4" />
						Nächster Datensatz
					</Link>
				</div>
			</div>

			{product.dppError ? (
				<div className="rounded-xl border border-amber-500/40 bg-amber-500/5 p-4 text-[12.5px] text-amber-600 dark:text-amber-400">
					Der Katalogeintrag steht, der Passentwurf nicht:{" "}
					{product.dppError.message}
				</div>
			) : null}

			{product.skippedDocuments.length > 0 ? (
				<div className="rounded-xl border border-amber-500/40 bg-amber-500/5 p-4 text-[12.5px] text-amber-600 dark:text-amber-400">
					Nicht übernommene Dokumente:
					<ul className="mt-1 list-inside list-disc">
						{product.skippedDocuments.map((document) => (
							<li key={document.name}>
								{document.name} — {document.reason}
							</li>
						))}
					</ul>
				</div>
			) : null}
		</div>
	);
}

const targetLabels: Record<FieldDecision["target"], string> = {
	ignore: "Nicht übernehmen",
	attribute: "Als Herkunftsangabe",
	element: "Als Datenelement im Pass",
};

const granularities = Object.keys(dppGranularityLabels);

function ImportForm({
	busy,
	connectorKey,
	onImport,
	preview,
}: {
	busy: boolean;
	connectorKey: string;
	onImport: (request: ImportRequest) => void;
	preview: ConnectorPreview;
}) {
	const { mapping, product } = preview;
	const targets = useDictionaryTargets(true);
	const repositories = useQuery({
		queryKey: ["catalog", "dictionary-repositories"],
		queryFn: listDictionaryRepositories,
	});
	const operators = useQuery({
		queryKey: ["catalog", "operators"],
		queryFn: listEconomicOperators,
	});
	// What the closed trigger shows. `Select.Value` falls back to the raw value
	// otherwise, so the field would read `simpl-standardmaschine/2026.1` where the
	// list offers the dictionary's name.
	const repositoryItems = Object.fromEntries(
		(repositories.data ?? []).map((repository) => [
			`${repository.repositoryKey}/${repository.version}`,
			`${label(repository.name)} · ${repository.version}`,
		]),
	);

	// The operator the passport names has to be one the catalogue holds - it is
	// the reference the passport is validated against, not a free-text note.
	//
	// The record's own manufacturer is offered alongside them, because the import
	// creates it a moment before the passport: on the first import of a
	// manufacturer it is a legitimate choice that is not in the list yet. It is
	// labelled as such rather than passed off as an existing entry - and it
	// carries the identifier the source system uses, which is why it reads like a
	// machine id. Where the catalogue already holds the same company under a
	// name of its own, that one is the better answer, and now the difference is
	// visible instead of hidden behind a text field showing a UUID.
	const manufacturer = product.manufacturer;
	const manufacturerKnown = (operators.data ?? []).some(
		(operator) => operator.operatorId === manufacturer?.externalId,
	);
	const operatorItems: Record<string, string> = {
		...Object.fromEntries(
			(operators.data ?? []).map((operator) => [
				operator.operatorId,
				`${operator.legalName} · ${operator.operatorId}`,
			]),
		),
		...(manufacturer && !manufacturerKnown
			? {
					[manufacturer.externalId]: `${manufacturer.legalName} · wird beim Import angelegt`,
				}
			: {}),
	};
	const [decisions, setDecisions] = useState<Record<string, FieldDecision>>(
		() =>
			Object.fromEntries(
				mapping.fields.map((field) => [field.sourceField, toDecision(field)]),
			),
	);
	const [withDpp, setWithDpp] = useState(false);
	// Which dictionary this record's fields are described by.
	//
	// One decision for the whole screen, taken before the fields are mapped,
	// because a passport is validated against exactly one dictionary
	// (`dppSchemaVersion` resolves to one version, and only entries of that
	// version are looked up). Elements pointing at a different one are not
	// rejected - they are silently skipped on save and only warned about on
	// publish, so a mixed passport publishes with half its values unchecked.
	// This used to be two independent choices, one per field and one in the
	// passport form, which is how they came apart.
	const [binding, setBinding] = useState("");
	const [dpp, setDpp] = useState({
		economicOperatorId: product.manufacturer?.externalId ?? "",
		granularity: "item",
	});
	// `repositoryKey/version` - the key alone is what an entry belongs to.
	const bindingKey = binding.slice(0, binding.lastIndexOf("/"));

	// Only the chosen dictionary's entries can be picked, and only its entries
	// are proposed. Filtering here rather than trusting the user not to mix is
	// the point of the whole binding.
	const boundTargets = (targets.data ?? []).filter(
		(target) => target.repositoryKey === bindingKey,
	);
	const suggestionFor = (field: MappedField) =>
		field.suggestion?.repositoryKey === bindingKey
			? field.suggestion
			: undefined;

	// Switching the dictionary invalidates every reference into the old one.
	// They are dropped rather than carried over: a reference the passport's
	// binding cannot resolve is exactly what this screen is meant to prevent.
	const chooseBinding = (next: string) => {
		setBinding(next);
		// Nothing to judge against while the entries are still loading. New
		// assignments are filtered regardless, so the only thing left unreconciled
		// is a reference that was already there.
		if (!targets.data) return;

		setDecisions((current) =>
			Object.fromEntries(
				Object.entries(current).map(([sourceField, decision]) => {
					const stillValid = boundTargetsInclude(
						targets.data,
						decision.dictionaryReference,
						next.slice(0, next.lastIndexOf("/")),
					);

					return [
						sourceField,
						stillValid
							? decision
							: {
									...decision,
									collectionElementId: undefined,
									collectionName: undefined,
									dictionaryReference: undefined,
									target:
										decision.target === "element"
											? "attribute"
											: decision.target,
								},
					];
				}),
			),
		);
	};

	const update = (sourceField: string, patch: Partial<FieldDecision>) =>
		setDecisions((current) => ({
			...current,
			[sourceField]: { ...current[sourceField]!, ...patch },
		}));

	// A chosen dictionary entry brings its category, visibility and unit along
	// - it knows better where it belongs than a default could guess. It
	// remains overridable regardless.
	const chooseTarget = (
		sourceField: string,
		target: DictionaryTarget | undefined,
	) => {
		if (!target) {
			update(sourceField, { dictionaryReference: undefined });
			return;
		}

		update(sourceField, {
			dictionaryReference: target.reference,
			collectionElementId: target.categoryId,
			collectionName: target.categoryLabel,
			visibility: target.visibility,
			unit: target.unit ?? decisions[sourceField]?.unit,
		});
	};

	// A suggestion carries everything the decision needs - accepting it is one
	// click instead of three selections. It is only applied here, on request: a
	// guess that enters itself would be exactly the fabrication of passport
	// content this intermediate step is meant to prevent.
	const acceptSuggestion = (field: MappedField) => {
		const suggestion = suggestionFor(field);
		if (!suggestion) return;

		update(field.sourceField, {
			target: "element",
			dictionaryReference: suggestion.dictionaryReference,
			collectionElementId: suggestion.categoryId,
			collectionName: suggestion.categoryLabel,
			visibility: suggestion.visibility,
			unit: suggestion.unit ?? field.unit,
		});
	};

	// The entries the wizard just created, applied to the fields they were
	// drafted from. `element`, not `attribute`: someone who has just built a
	// dictionary entry for a field has said what the field means, and that is
	// the whole of what was missing for it to become a data element.
	const applyCreatedDictionary = (result: DictionaryCreated) => {
		// The passport binds to the dictionary whose entries these fields now
		// point at. Having just built that vocabulary for this record kind,
		// being asked which dictionary to pin would be asking about the thing
		// that was just decided. Overwritten freely if someone picks another.
		setBinding(`${result.repositoryKey}/${result.repositoryVersion}`);

		setDecisions((current) => {
			const next = { ...current };

			for (const entry of result.placements) {
				const decision = next[entry.sourceField];
				if (!decision) continue;

				next[entry.sourceField] = {
					...decision,
					// The collection comes from the entry, which may sit under a
					// category this import knows nothing about. Without one the
					// element stays at the passport's top level rather than being
					// filed under a heading nobody chose.
					collectionElementId: entry.collection?.id,
					collectionName: entry.collection?.label,
					dictionaryReference: entry.dictionaryReference,
					target: "element",
				};
			}

			return next;
		});
	};

	// The fields for which a suggestion is ready and nothing is decided yet -
	// the work a single click can finish.
	const openSuggestions = mapping.fields.filter(
		(field) =>
			suggestionFor(field) &&
			!decisions[field.sourceField]?.dictionaryReference,
	);

	// What the wizard gets to work with: the draft minus the fields nobody wants
	// imported.
	//
	// Fields that already point at an entry stay in. This used to drop them, on
	// the reasoning that a field with an answer needs no vocabulary - but that
	// answer names one dictionary, and the wizard may be about to write to a
	// different one. Accepting the suggestions above and then building a new
	// dictionary left it with the four or five fields nothing had matched, and
	// the record's actual vocabulary out of it. Which dictionary an entry is
	// redundant in is the wizard's question, because that is where the target is
	// chosen.
	const openDraftEntries = preview.dictionaryDraft.entries.filter(
		(entry) => decisions[entry.sourceField]?.target !== "ignore",
	);

	const dppReady = withDpp && binding.trim() && dpp.economicOperatorId.trim();
	const elementCount = Object.values(decisions).filter(
		(decision) => decision.target === "element" && decision.dictionaryReference,
	).length;

	return (
		<div className="rounded-xl border bg-card p-5">
			{/* Only enough to know which record this is. What it *is* - category,
			    manufacturer, identifiers - was on the screen before this one; the
			    decision to be made here is about fields, and repeating the record's
			    description above forty of them buries them. */}
			<div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
				<h1 className="text-lg font-bold">{product.name}</h1>
				<span className="font-mono text-[11.5px] text-muted-foreground">
					{product.externalId}
				</span>
				{mapping.sourceType.key ? (
					<Badge variant="secondary">{mapping.sourceType.label}</Badge>
				) : null}
			</div>

			{mapping.fields.length > 0 ? (
				<div className="mt-5">
					<div className="text-[11.5px] font-semibold uppercase tracking-wide text-muted-foreground">
						Felder aus dem Fremdsystem
					</div>
					<p className="mt-1 text-[11.5px] text-muted-foreground">
						Was hier festgelegt wird, gilt für alle Datensätze der Art
						{mapping.sourceType.key ? ` „${mapping.sourceType.label}"` : ""} —
						der nächste Import beginnt damit schon ausgefüllt.
					</p>

					{/* First, and above the fields: everything below is scoped to it.
					    Without it the fields have nothing to point at, which is why the
					    list below stays unassignable until this is answered. */}
					<Field className="mt-3 max-w-md">
						<FieldLabel htmlFor="mapping-dictionary">Wörterbuch</FieldLabel>
						<Select
							items={repositoryItems}
							onValueChange={(value) => chooseBinding(value ?? "")}
							value={binding}
						>
							<SelectTrigger className="w-full" id="mapping-dictionary">
								<SelectValue
									placeholder={
										repositories.isPending
											? "Wird geladen …"
											: "Wörterbuch wählen"
									}
								/>
							</SelectTrigger>
							<SelectContent>
								{(repositories.data ?? []).map((repository) => (
									<SelectItem
										key={repository.id}
										value={`${repository.repositoryKey}/${repository.version}`}
									>
										{label(repository.name)}
										<span className="ml-2 text-muted-foreground">
											{repository.repositoryKey}/{repository.version}
										</span>
									</SelectItem>
								))}
							</SelectContent>
						</Select>
						<p className="text-[11px] text-muted-foreground">
							{binding
								? "Die Felder unten können nur Einträge aus diesem Wörterbuch benennen. Ein Passentwurf wird dagegen geprüft."
								: "Noch keins gewählt. Passt keins der vorhandenen, legt der Wizard eins aus dieser Datensatzart an."}
						</p>
					</Field>

					<div className="mt-3 flex flex-wrap gap-2">
						{openSuggestions.length > 0 ? (
							<Button
								onClick={() => openSuggestions.forEach(acceptSuggestion)}
								size="sm"
								variant="outline"
							>
								<Wand2 className="size-3.5" />
								{openSuggestions.length === 1
									? "Vorschlag übernehmen"
									: `${openSuggestions.length} Vorschläge übernehmen`}
							</Button>
						) : null}

						{/* Offered as long as any field is still meant to be imported.
						    Whether an entry already exists for it is a question about a
						    particular dictionary, and the wizard is where that one is
						    named. */}
						{openDraftEntries.length > 0 ? (
							<DictionaryDraftWizard
								connectorKey={connectorKey}
								draft={{
									entries: openDraftEntries,
									repository: preview.dictionaryDraft.repository,
								}}
								onCreated={applyCreatedDictionary}
								sourceType={mapping.sourceType}
							/>
						) : null}
					</div>

					<div className="mt-3 grid gap-3">
						{mapping.fields.map((field) => (
							<FieldRow
								decision={decisions[field.sourceField]!}
								field={field}
								key={field.sourceField}
								onAcceptSuggestion={() => acceptSuggestion(field)}
								onChoose={(target) => chooseTarget(field.sourceField, target)}
								onUpdate={(patch) => update(field.sourceField, patch)}
								suggestion={suggestionFor(field)}
								targets={boundTargets}
								targetsPending={targets.isPending}
							/>
						))}
					</div>
				</div>
			) : null}

			<div className="mt-5 rounded-md border bg-background p-3">
				<label className="flex items-center gap-2 text-[13px] font-medium">
					<input
						checked={withDpp}
						className="size-3.5"
						onChange={(event) => setWithDpp(event.target.checked)}
						type="checkbox"
					/>
					Gleich einen Passentwurf anlegen
					{elementCount > 0 ? (
						<span className="text-[11.5px] font-normal text-muted-foreground">
							({elementCount} Datenelement{elementCount === 1 ? "" : "e"})
						</span>
					) : null}
				</label>
				<p className="mt-1 text-[11.5px] text-muted-foreground">
					Granularität, Wörterbuch und verantwortlicher Wirtschaftsakteur stehen
					nicht im Fremdsystem — ohne sie bleibt es beim Katalogeintrag.
				</p>

				{withDpp ? (
					<div className="mt-3 grid gap-3 sm:grid-cols-3">
						<Field>
							<FieldLabel htmlFor="dpp-granularity">Granularität</FieldLabel>
							<Select
								items={dppGranularityLabels}
								onValueChange={(value) =>
									value &&
									setDpp((current) => ({ ...current, granularity: value }))
								}
								value={dpp.granularity}
							>
								<SelectTrigger id="dpp-granularity">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{granularities.map((granularity) => (
										<SelectItem key={granularity} value={granularity}>
											{dppGranularityLabels[granularity]}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</Field>
						{/* Shown, not asked again. The passport is validated against the
						    dictionary the fields above point at; offering a second choice
						    here is what let the two come apart. */}
						<Field>
							<FieldLabel>Wörterbuch</FieldLabel>
							<div className="flex h-9 items-center text-[13px]">
								{binding ? (
									<span>
										{repositoryItems[binding] ?? binding}
										<span className="ml-2 font-mono text-[11px] text-muted-foreground">
											{binding}
										</span>
									</span>
								) : (
									<span className="text-destructive">
										Oben noch keins gewählt
									</span>
								)}
							</div>
						</Field>
						<Field>
							<FieldLabel htmlFor="dpp-operator">Wirtschaftsakteur</FieldLabel>
							<Select
								items={operatorItems}
								onValueChange={(value) =>
									setDpp((current) => ({
										...current,
										economicOperatorId: value ?? "",
									}))
								}
								value={dpp.economicOperatorId}
							>
								<SelectTrigger className="w-full" id="dpp-operator">
									<SelectValue
										placeholder={
											operators.isPending
												? "Wird geladen …"
												: "Wirtschaftsakteur wählen"
										}
									/>
								</SelectTrigger>
								<SelectContent>
									{Object.entries(operatorItems).map(([value, text]) => (
										<SelectItem key={value} value={value}>
											{text}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</Field>
					</div>
				) : null}
			</div>

			<div className="mt-4 flex justify-end">
				<Button
					disabled={busy || (withDpp && !dppReady)}
					onClick={() =>
						onImport({
							key: connectorKey,
							externalId: product.externalId,
							fields: Object.values(decisions),
							dpp: withDpp ? { ...dpp, dppSchemaVersion: binding } : undefined,
						})
					}
				>
					{busy ? (
						<Loader2 className="size-3.5 animate-spin" />
					) : (
						<Download className="size-3.5" />
					)}
					Übernehmen
				</Button>
			</div>

			{product.documents.length > 0 ? (
				// Whether the bytes are fetched is the documents field's decision
				// above, not a property of the import: `attribute` keeps the file
				// names, `element` with a dictionary entry fetches the files.
				<p className="mt-3 text-[11.5px] text-muted-foreground">
					{product.documents.length} Datei(en) hängen im Fremdsystem am
					Datensatz. Geholt werden sie nur, wenn das Feld „Dokumente" oben auf
					einen Wörterbucheintrag zeigt.
				</p>
			) : null}
		</div>
	);
}

// Whether a reference already made still belongs to the dictionary now chosen.
function boundTargetsInclude(
	targets: DictionaryTarget[],
	reference: string | undefined,
	repositoryKey: string,
): boolean {
	if (!reference) return false;

	return targets.some(
		(target) =>
			target.reference === reference && target.repositoryKey === repositoryKey,
	);
}

function FieldRow({
	decision,
	field,
	onAcceptSuggestion,
	onChoose,
	onUpdate,
	suggestion,
	targets,
	targetsPending,
}: {
	decision: FieldDecision;
	field: MappedField;
	onAcceptSuggestion: () => void;
	onChoose: (target: DictionaryTarget | undefined) => void;
	onUpdate: (patch: Partial<FieldDecision>) => void;
	// Passed in rather than read off the field: the server proposes the best
	// match in the whole tenant, and only the ones inside the chosen dictionary
	// may be offered here.
	suggestion: MappedField["suggestion"];
	targets: DictionaryTarget[];
	targetsPending: boolean;
}) {
	// The categories that actually occur in the dictionary. A free-text input
	// here would invite two spellings of the same category.
	const categories = [
		...new Map(
			targets.map((target) => [target.categoryId, target.categoryLabel]),
		).entries(),
	];

	return (
		<div className="rounded-md border bg-background p-3">
			<div className="flex flex-wrap items-baseline gap-2">
				<span className="text-[13px] font-medium">{field.label}</span>
				{field.configured ? null : (
					<Badge className="text-[10px]" variant="secondary">
						neu
					</Badge>
				)}
				<span className="ml-auto text-[12.5px] text-muted-foreground">
					{Array.isArray(field.value)
						? field.value.map((entry) => String(entry ?? "—")).join(", ")
						: String(field.value ?? "—")}
					{field.unit ? ` ${field.unit}` : ""}
					{Array.isArray(field.value) && field.value.length > 1 ? (
						<span className="ml-1.5 text-[11px]">
							({field.value.length} Werte)
						</span>
					) : null}
				</span>
			</div>

			{suggestion && !decision.dictionaryReference ? (
				<button
					className="mt-2 flex w-full items-center gap-2 rounded-md border border-dashed px-2 py-1.5 text-left text-[12px] transition-colors hover:bg-accent"
					onClick={onAcceptSuggestion}
					type="button"
				>
					<Wand2 className="size-3.5 shrink-0 text-muted-foreground" />
					<span>
						Vorschlag: <span className="font-medium">{suggestion.label}</span>
						{suggestion.categoryLabel ? (
							<span className="text-muted-foreground">
								{" "}
								· {suggestion.categoryLabel}
							</span>
						) : null}
					</span>
					{suggestion.confidence < 0.75 ? (
						<Badge className="ml-auto text-[10px]" variant="outline">
							unsicher
						</Badge>
					) : null}
				</button>
			) : null}

			<div className="mt-2 grid gap-2 sm:grid-cols-2">
				<Select
					items={targetLabels}
					onValueChange={(value) =>
						value && onUpdate({ target: value as FieldDecision["target"] })
					}
					value={decision.target}
				>
					<SelectTrigger aria-label={`Ziel für ${field.label}`} className="h-8">
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						{(Object.keys(targetLabels) as FieldDecision["target"][]).map(
							(target) => (
								<SelectItem key={target} value={target}>
									{targetLabels[target]}
								</SelectItem>
							),
						)}
					</SelectContent>
				</Select>

				{decision.target === "element" ? (
					<DictionaryPicker
						fieldLabel={field.label}
						onChoose={onChoose}
						pending={targetsPending}
						selected={decision.dictionaryReference}
						targets={targets}
					/>
				) : null}
			</div>

			{decision.target === "element" ? (
				<div className="mt-2 grid gap-2 sm:grid-cols-2">
					<Select
						items={{
							__none: "Ohne Überkategorie",
							...Object.fromEntries(categories),
						}}
						onValueChange={(value) =>
							onUpdate(
								!value || value === "__none"
									? {
											collectionElementId: undefined,
											collectionName: undefined,
										}
									: {
											collectionElementId: value,
											collectionName: categories.find(
												([id]) => id === value,
											)?.[1],
										},
							)
						}
						value={decision.collectionElementId ?? "__none"}
					>
						<SelectTrigger
							aria-label={`Überkategorie für ${field.label}`}
							className="h-8"
						>
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="__none">Ohne Überkategorie</SelectItem>
							{categories.map(([id, categoryLabel]) => (
								<SelectItem key={id} value={id}>
									{categoryLabel}
								</SelectItem>
							))}
						</SelectContent>
					</Select>

					<Select
						items={visibilityLabels}
						onValueChange={(value) =>
							value &&
							onUpdate({ visibility: value as FieldDecision["visibility"] })
						}
						value={decision.visibility}
					>
						<SelectTrigger
							aria-label={`Sichtbarkeit für ${field.label}`}
							className="h-8"
						>
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							{(Object.keys(visibilityLabels) as Visibility[]).map((value) => (
								<SelectItem key={value} value={value}>
									{visibilityLabels[value]}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>
			) : null}

			{decision.target === "element" && !decision.dictionaryReference ? (
				<p className="mt-2 text-[11.5px] text-amber-600 dark:text-amber-400">
					Ohne Dictionary-Eintrag bleibt das Feld eine Herkunftsangabe — ein
					Datenelement ohne fachlichen Bezug wäre ein Feld im Pass, das nichts
					bedeutet.
				</p>
			) : null}
		</div>
	);
}

// Picking a dictionary entry as a search field, not as a list.
//
// A selection list over all of an organization's entries is comfortable at
// twenty entries and unusable at two hundred - and two hundred is the
// realistic size of a maintained dictionary. What gets typed is the name
// someone already has in mind.
//
// Category and unit are shown at the entry: they are what makes two
// similarly named entries distinguishable.
function DictionaryPicker({
	fieldLabel,
	onChoose,
	pending,
	selected,
	targets,
}: {
	fieldLabel: string;
	onChoose: (target: DictionaryTarget | undefined) => void;
	pending: boolean;
	selected?: string | undefined;
	targets: DictionaryTarget[];
}) {
	const options = targets.map((target) => ({
		category: target.categoryLabel,
		label: target.label,
		unit: target.unit,
		value: target.reference,
	}));
	const current = options.find((option) => option.value === selected) ?? null;

	return (
		<Combobox
			isItemEqualToValue={(a, b) => a?.value === b?.value}
			items={options}
			onValueChange={(option) =>
				onChoose(targets.find((target) => target.reference === option?.value))
			}
			value={current}
		>
			<ComboboxInput
				aria-label={`Dictionary-Eintrag für ${fieldLabel}`}
				className="h-8"
				disabled={options.length === 0 && !pending}
				placeholder={
					pending
						? "Wird geladen …"
						: options.length === 0
							? "Erst oben ein Wörterbuch wählen"
							: "Eintrag suchen …"
				}
				showClear
			/>
			<ComboboxContent>
				<ComboboxEmpty>Kein Eintrag gefunden</ComboboxEmpty>
				<ComboboxList>
					<ComboboxCollection>
						{(option: (typeof options)[number]) => (
							<ComboboxItem key={option.value} value={option}>
								<span className="truncate">{option.label}</span>
								<span className="ml-auto shrink-0 text-[11px] text-muted-foreground">
									{[option.category, option.unit].filter(Boolean).join(" · ")}
								</span>
							</ComboboxItem>
						)}
					</ComboboxCollection>
				</ComboboxList>
			</ComboboxContent>
		</Combobox>
	);
}

function toDecision(field: MappedField): FieldDecision {
	return {
		collectionElementId: field.collectionElementId,
		collectionName: field.collectionName,
		dictionaryReference: field.dictionaryReference,
		elementId: field.elementId,
		sourceField: field.sourceField,
		target: field.target,
		unit: field.unit,
		visibility: field.visibility,
	};
}
