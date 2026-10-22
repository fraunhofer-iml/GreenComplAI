import type { DppRelationshipType } from "@dpp/schemas";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Network, Plus, Trash2 } from "lucide-react";
import { useState } from "react";

import { Badge } from "#/components/ui/badge";
import { Button } from "#/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "#/components/ui/card";
import { Field, FieldLabel } from "#/components/ui/field";
import { Input } from "#/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "#/components/ui/select";
import { Separator } from "#/components/ui/separator";
import { useActiveOrganizationId } from "#/features/organization/organization-store";

import { createDppRelationship, deleteDppRelationship } from "../dpp-edit-api";
import type { DppRelationship, Visibility } from "../dpp-view";

const relationshipTypes = [
	{ label: "enthält", value: "contains" },
	{ label: "ist Komponente von", value: "isComponentOf" },
	{ label: "ersetzt", value: "replaces" },
	{ label: "ist Variante von", value: "isVariantOf" },
	{ label: "abgeleitet von", value: "derivedFrom" },
	{ label: "hat Verpackung", value: "hasPackaging" },
	{ label: "hat Ersatzteil", value: "hasSparePart" },
] as const;

// What the closed field shows. Without it `Select.Value` prints the raw value -
// `controlled` where the list offers "Controlled".
const visibilityChoices = { controlled: "Controlled", public: "Public" };

function relationshipLabel(value: string): string {
	return relationshipTypes.find((type) => type.value === value)?.label ?? value;
}

const emptyForm = {
	relationshipType: "contains" as DppRelationshipType,
	targetDigitalProductPassportId: "",
	targetProductId: "",
	visibility: "controlled" as Visibility,
};

// Manages the DPP's relationship edges directly against the relationships
// endpoints; changes are applied immediately (independent of the snapshot
// dirty state) and refresh the view query.
export function RelationshipEditor({
	dppId,
	relationships,
}: {
	dppId: string;
	relationships: DppRelationship[];
}) {
	const queryClient = useQueryClient();
	const organizationId = useActiveOrganizationId();
	const [form, setForm] = useState(emptyForm);
	const [error, setError] = useState<string>();

	const refresh = () =>
		queryClient.invalidateQueries({
			queryKey: ["dpp-view", organizationId, dppId],
		});

	const createMutation = useMutation({
		mutationFn: () =>
			createDppRelationship(dppId, {
				relationshipType: form.relationshipType,
				targetDigitalProductPassportId:
					form.targetDigitalProductPassportId.trim(),
				targetProductId: form.targetProductId.trim() || undefined,
				visibility: form.visibility,
			}),
		onError: (mutationError: unknown) =>
			setError(
				mutationError instanceof Error
					? mutationError.message
					: "Beziehung konnte nicht angelegt werden.",
			),
		onSuccess: async () => {
			setForm(emptyForm);
			setError(undefined);
			await refresh();
		},
	});

	const deleteMutation = useMutation({
		mutationFn: (relationshipId: string) =>
			deleteDppRelationship(dppId, relationshipId),
		onError: (mutationError: unknown) =>
			setError(
				mutationError instanceof Error
					? mutationError.message
					: "Beziehung konnte nicht entfernt werden.",
			),
		onSuccess: async () => {
			setError(undefined);
			await refresh();
		},
	});

	return (
		<Card>
			<CardHeader>
				<div className="flex items-center gap-2">
					<Network className="size-4 text-muted-foreground" />
					<CardTitle>Beziehungen</CardTitle>
				</div>
				<CardDescription>
					Kanten zu anderen Produktpässen. Änderungen wirken sofort und sind
					unabhängig vom Speichern des Entwurfs.
				</CardDescription>
			</CardHeader>
			<CardContent className="grid gap-4">
				{relationships.length === 0 ? (
					<p className="text-sm text-muted-foreground">
						Noch keine Beziehungen vorhanden.
					</p>
				) : (
					<div className="grid gap-2">
						{relationships.map((relationship) => (
							<div
								className="flex flex-wrap items-center gap-2 rounded-lg border p-3"
								key={relationship.id}
							>
								<Badge variant="secondary">
									{relationshipLabel(relationship.relationshipType)}
								</Badge>
								<Badge variant="outline">
									{relationship.visibility === "public"
										? "Public"
										: "Controlled"}
								</Badge>
								<div className="min-w-0 flex-1">
									<div className="truncate text-sm font-medium">
										{relationship.targetProductId ??
											relationship.targetDigitalProductPassportId}
									</div>
									<div className="truncate text-xs text-muted-foreground">
										{relationship.targetDigitalProductPassportId}
									</div>
								</div>
								<Button
									aria-label="Beziehung entfernen"
									disabled={deleteMutation.isPending}
									onClick={() => deleteMutation.mutate(relationship.id)}
									size="icon-xs"
									type="button"
									variant="ghost"
								>
									<Trash2 className="size-3.5" />
								</Button>
							</div>
						))}
					</div>
				)}

				<Separator />

				<div className="grid gap-3">
					<div className="grid gap-3 sm:grid-cols-2">
						<Field>
							<FieldLabel>Ziel-DPP-ID</FieldLabel>
							<Input
								onChange={(event) =>
									setForm((value) => ({
										...value,
										targetDigitalProductPassportId: event.target.value,
									}))
								}
								placeholder="urn:dpp:…"
								value={form.targetDigitalProductPassportId}
							/>
						</Field>
						<Field>
							<FieldLabel>Ziel-Produkt-ID (optional)</FieldLabel>
							<Input
								onChange={(event) =>
									setForm((value) => ({
										...value,
										targetProductId: event.target.value,
									}))
								}
								value={form.targetProductId}
							/>
						</Field>
					</div>
					<div className="flex flex-wrap items-end gap-3">
						<Field className="w-56">
							<FieldLabel>Beziehungstyp</FieldLabel>
							<Select
								items={relationshipTypes}
								onValueChange={(value) =>
									setForm((current) => ({
										...current,
										relationshipType:
											(value as DppRelationshipType | null) ?? "contains",
									}))
								}
								value={form.relationshipType}
							>
								<SelectTrigger className="w-full">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{relationshipTypes.map((type) => (
										<SelectItem key={type.value} value={type.value}>
											{type.label}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</Field>
						<Field className="w-44">
							<FieldLabel>Sichtbarkeit</FieldLabel>
							<Select
								items={visibilityChoices}
								onValueChange={(value) =>
									setForm((current) => ({
										...current,
										visibility: value === "public" ? "public" : "controlled",
									}))
								}
								value={form.visibility}
							>
								<SelectTrigger className="w-full">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="controlled">Controlled</SelectItem>
									<SelectItem value="public">Public</SelectItem>
								</SelectContent>
							</Select>
						</Field>
						<Button
							disabled={
								!form.targetDigitalProductPassportId.trim() ||
								createMutation.isPending
							}
							onClick={() => createMutation.mutate()}
							type="button"
						>
							<Plus className="size-4" />
							Beziehung hinzufügen
						</Button>
					</div>
					{error ? <p className="text-sm text-destructive">{error}</p> : null}
				</div>
			</CardContent>
		</Card>
	);
}
