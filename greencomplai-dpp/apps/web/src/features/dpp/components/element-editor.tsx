import { FileText, List, Plus, ShieldAlert, Trash2, Type } from "lucide-react";
import type { ReactNode } from "react";

import { Badge } from "#/components/ui/badge";
import { Button } from "#/components/ui/button";
import { Field, FieldDescription, FieldLabel } from "#/components/ui/field";
import { Input } from "#/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "#/components/ui/select";
import { FileUploadField } from "#/features/blobs/file-upload-field";
import type { OrganizationRole } from "#/features/organization/organizations-api";

import {
	type DataElement,
	type DictionaryEntry,
	dictionaryEntryForElement,
	type ElementPolicy,
	type Visibility,
} from "../dpp-view";
import { PolicyPicker, roleLabels } from "./policy-picker";

export const valueDataTypes = [
	"string",
	"number",
	"boolean",
	"date",
	"datetime",
	"enum",
] as const;

const kindLabels: Record<DataElement["kind"], string> = {
	document: "Dokument",
	multi: "Werteliste",
	single: "Einzelwert",
};

const kindIcons: Record<DataElement["kind"], ReactNode> = {
	document: <FileText className="size-3.5" />,
	multi: <List className="size-3.5" />,
	single: <Type className="size-3.5" />,
};

// Sensible write-policy default for freshly created controlled elements: the
// author's own role plus admin, so a non-admin editor does not lock themselves
// out of the element they are about to write (403 DPP_ELEMENT_WRITE_FORBIDDEN).
export function defaultPolicyForRole(role: OrganizationRole): ElementPolicy {
	const roles: OrganizationRole[] =
		role === "admin" ? ["admin"] : ["admin", role];
	return { readRoles: [...roles], writeRoles: [...roles] };
}

export function displayValue(value: unknown): string {
	if (value === null || value === undefined) return "";
	if (typeof value === "object") return JSON.stringify(value);
	return String(value);
}

function coerceValue(raw: string, valueDataType: string | undefined): unknown {
	if (valueDataType === "number") {
		const parsed = Number(raw);
		return raw.trim() !== "" && Number.isFinite(parsed) ? parsed : raw;
	}
	if (valueDataType === "boolean") {
		const normalized = raw.trim().toLowerCase();
		if (["1", "ja", "true", "wahr", "yes"].includes(normalized)) return true;
		if (["0", "falsch", "false", "nein", "no"].includes(normalized))
			return false;
		return raw;
	}
	return raw;
}

function hasPolicyRoles(policy: ElementPolicy | undefined): boolean {
	return Boolean(
		policy && (policy.readRoles.length > 0 || policy.writeRoles.length > 0),
	);
}

// Editor card for a single data element (single/multi/document). The element
// kind is fixed at creation time; visibility/policy edits can be locked for
// non-admins on pre-existing elements (server enforces admin-only policy
// changes).
export function ElementEditor({
	activeRole,
	dictionaryEntries,
	element,
	onChange,
	onRemove,
	policyLocked,
	serverError,
}: {
	activeRole: OrganizationRole;
	// Index of the bound dictionary. Without it, this showed the element ID -
	// `element-powerSupply` instead of "Stromversorgung" - even though the
	// entry exists.
	dictionaryEntries?: Map<string, DictionaryEntry>;
	element: DataElement;
	onChange: (element: DataElement) => void;
	onRemove: () => void;
	policyLocked: boolean;
	serverError?: string;
}) {
	const entry = dictionaryEntries
		? dictionaryEntryForElement(element, dictionaryEntries)
		: undefined;
	const entryLabel = entry?.name.de ?? entry?.name.en;
	const heading =
		entryLabel ?? element.name?.de ?? element.name?.en ?? element.elementId;
	const changeVisibility = (visibility: Visibility) => {
		let next: DataElement = { ...element, visibility };
		if (visibility === "controlled" && !element.policy) {
			next = { ...next, policy: defaultPolicyForRole(activeRole) };
		}
		onChange(next);
	};

	const changeName = (raw: string) => {
		const existing = element.name ?? {};
		if (raw) {
			onChange({ ...element, name: { ...existing, de: raw } });
			return;
		}
		const { de: _removed, ...rest } = existing;
		onChange({
			...element,
			name: Object.keys(rest).length > 0 ? rest : undefined,
		});
	};

	const controlledWithoutPolicy =
		element.visibility === "controlled" && !hasPolicyRoles(element.policy);
	const missingOwnWriteRole =
		activeRole !== "admin" &&
		element.visibility === "controlled" &&
		hasPolicyRoles(element.policy) &&
		!(element.policy?.writeRoles ?? []).includes(activeRole);

	return (
		<div className="grid gap-3 rounded-lg border bg-card p-4">
			<div className="flex flex-wrap items-center gap-2">
				<Badge variant="secondary">
					{kindIcons[element.kind]}
					{kindLabels[element.kind]}
				</Badge>
				<Badge variant="outline">
					{element.visibility === "public" ? "Public" : "Controlled"}
				</Badge>
				<div className="flex min-w-0 flex-1 flex-wrap items-baseline gap-x-2">
					<span className="min-w-0 truncate text-sm font-medium">
						{heading || "Neues Element"}
					</span>
					{/* The technical identifier stays visible - it's the path the server
					    addresses the element by. */}
					{heading !== element.elementId && element.elementId ? (
						<span className="truncate font-mono text-[11px] text-muted-foreground">
							{element.elementId}
						</span>
					) : null}
				</div>
				<Button
					aria-label="Element entfernen"
					onClick={onRemove}
					size="icon-xs"
					type="button"
					variant="ghost"
				>
					<Trash2 className="size-3.5" />
				</Button>
			</div>

			{serverError ? (
				<p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
					{serverError}
				</p>
			) : null}

			<div className="grid gap-3 sm:grid-cols-3">
				<Field>
					<FieldLabel>Element-ID</FieldLabel>
					<Input
						onChange={(event) =>
							onChange({ ...element, elementId: event.target.value })
						}
						placeholder="z. B. weight-kg"
						value={element.elementId}
					/>
				</Field>
				<Field>
					<FieldLabel>Name (de)</FieldLabel>
					<Input
						onChange={(event) => changeName(event.target.value)}
						// Deliberately only a placeholder, not a value: empty means "name
						// from the dictionary". Filling it in here would copy it - and the
						// copy would go stale if the dictionary's name changes later.
						placeholder={entryLabel ?? "Anzeigename"}
						value={element.name?.de ?? ""}
					/>
					{entryLabel ? (
						<FieldDescription>
							Aus dem Wörterbuch. Eintragen nur, um ihn für diesen Pass zu
							überschreiben.
						</FieldDescription>
					) : null}
				</Field>
				<Field>
					<FieldLabel>Dictionary-Referenz</FieldLabel>
					<Input
						onChange={(event) =>
							onChange({
								...element,
								dictionaryReference: event.target.value || undefined,
							})
						}
						placeholder="Entry-Key oder URI (optional)"
						value={element.dictionaryReference ?? ""}
					/>
				</Field>
			</div>

			{element.kind === "single" ? (
				<SingleValueFields element={element} onChange={onChange} />
			) : null}
			{element.kind === "multi" ? (
				<MultiValueFields element={element} onChange={onChange} />
			) : null}
			{element.kind === "document" ? (
				<DocumentFields element={element} onChange={onChange} />
			) : null}

			<div className="grid gap-2 rounded-md border border-dashed p-3">
				<div className="flex flex-wrap items-center gap-2">
					<span className="text-xs font-medium text-muted-foreground">
						Sichtbarkeit
					</span>
					<Select
						items={{ controlled: "Controlled", public: "Public" }}
						onValueChange={(value) =>
							changeVisibility(value === "public" ? "public" : "controlled")
						}
						value={element.visibility}
					>
						<SelectTrigger disabled={policyLocked} size="sm">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="controlled">Controlled</SelectItem>
							<SelectItem value="public">Public</SelectItem>
						</SelectContent>
					</Select>
					{policyLocked ? (
						<span className="text-xs text-muted-foreground">
							Sichtbarkeit und Policy bestehender Elemente können nur Admins
							ändern.
						</span>
					) : null}
				</div>

				{element.visibility === "controlled" ? (
					<PolicyPicker
						disabled={policyLocked}
						onChange={(policy) => onChange({ ...element, policy })}
						policy={element.policy}
					/>
				) : null}

				{controlledWithoutPolicy ? (
					<p className="flex items-start gap-1.5 text-xs text-amber-600 dark:text-amber-500">
						<ShieldAlert className="mt-0.5 size-3.5 shrink-0" />
						Ohne Policy ist dieses Controlled-Element nur für Admins lesbar und
						schreibbar (fail-closed).
					</p>
				) : null}
				{missingOwnWriteRole ? (
					<p className="flex items-start gap-1.5 text-xs text-destructive">
						<ShieldAlert className="mt-0.5 size-3.5 shrink-0" />
						Ihre Rolle „{roleLabels[activeRole]}“ ist nicht in den
						Schreibrechten enthalten – der Server lehnt das Speichern dieses
						Elements mit 403 ab.
					</p>
				) : null}
			</div>
		</div>
	);
}

function SingleValueFields({
	element,
	onChange,
}: {
	element: Extract<DataElement, { kind: "single" }>;
	onChange: (element: DataElement) => void;
}) {
	return (
		<div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_180px]">
			<Field>
				<FieldLabel>Wert</FieldLabel>
				<Input
					onChange={(event) =>
						onChange({
							...element,
							value: coerceValue(event.target.value, element.valueDataType),
						})
					}
					value={displayValue(element.value)}
				/>
			</Field>
			<Field>
				<FieldLabel>Datentyp</FieldLabel>
				<ValueTypeSelect
					onChange={(valueDataType) =>
						onChange({
							...element,
							value: coerceValue(displayValue(element.value), valueDataType),
							valueDataType,
						})
					}
					value={element.valueDataType ?? "string"}
				/>
			</Field>
		</div>
	);
}

function MultiValueFields({
	element,
	onChange,
}: {
	element: Extract<DataElement, { kind: "multi" }>;
	onChange: (element: DataElement) => void;
}) {
	const updateEntry = (
		index: number,
		update: Partial<{ value: unknown; valueDataType: string }>,
	) => {
		onChange({
			...element,
			valueList: element.valueList.map((entry, entryIndex) =>
				entryIndex === index ? { ...entry, ...update } : entry,
			),
		});
	};

	const addEntry = () => {
		onChange({
			...element,
			valueList: [
				...element.valueList,
				{
					elementId: `${element.elementId || "wert"}-${crypto.randomUUID().slice(0, 8)}`,
					value: "",
					valueDataType: "string",
				},
			],
		});
	};

	return (
		<div className="grid gap-2">
			<span className="text-xs font-medium text-muted-foreground">Werte</span>
			{element.valueList.map((entry, index) => (
				<div
					className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_180px_auto]"
					key={entry.elementId}
				>
					<Input
						onChange={(event) =>
							updateEntry(index, {
								value: coerceValue(event.target.value, entry.valueDataType),
							})
						}
						value={displayValue(entry.value)}
					/>
					<ValueTypeSelect
						onChange={(valueDataType) =>
							updateEntry(index, {
								value: coerceValue(displayValue(entry.value), valueDataType),
								valueDataType,
							})
						}
						value={entry.valueDataType}
					/>
					<Button
						aria-label="Wert entfernen"
						disabled={element.valueList.length <= 1}
						onClick={() =>
							onChange({
								...element,
								valueList: element.valueList.filter(
									(_, entryIndex) => entryIndex !== index,
								),
							})
						}
						size="icon-xs"
						type="button"
						variant="ghost"
					>
						<Trash2 className="size-3.5" />
					</Button>
				</div>
			))}
			<div>
				<Button onClick={addEntry} size="xs" type="button" variant="outline">
					<Plus className="size-3.5" />
					Wert hinzufügen
				</Button>
			</div>
		</div>
	);
}

function DocumentFields({
	element,
	onChange,
}: {
	element: Extract<DataElement, { kind: "document" }>;
	onChange: (element: DataElement) => void;
}) {
	// Filename and content type are taken from the stored object rather than
	// typed: the server derives both from the uploaded bytes, so a hand-edited
	// value could only ever contradict what is actually stored.
	return (
		<FileUploadField
			onChange={(file) =>
				onChange({
					...element,
					blobObjectId: file?.blobObjectId ?? "",
					filename: file?.filename ?? "",
					contentType: file?.contentType ?? "",
				})
			}
			value={
				element.blobObjectId
					? {
							blobObjectId: element.blobObjectId,
							contentType: element.contentType,
							filename: element.filename,
						}
					: undefined
			}
		/>
	);
}

function ValueTypeSelect({
	onChange,
	value,
}: {
	onChange: (value: string) => void;
	value: string;
}) {
	return (
		<Select onValueChange={(next) => onChange(next ?? "string")} value={value}>
			<SelectTrigger className="w-full" size="sm">
				<SelectValue />
			</SelectTrigger>
			<SelectContent>
				{valueDataTypes.map((type) => (
					<SelectItem key={type} value={type}>
						{type}
					</SelectItem>
				))}
			</SelectContent>
		</Select>
	);
}
