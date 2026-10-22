import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { useId, useState } from "react";

import { Button } from "#/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "#/components/ui/dialog";
import {
	Field,
	FieldDescription,
	FieldGroup,
	FieldLabel,
} from "#/components/ui/field";
import { Input } from "#/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "#/components/ui/select";
import { ApiError } from "#/features/api/client";

import {
	type AddressDraft,
	AddressFields,
	emptyAddress,
	mergeAddress,
} from "./address-fields";
import {
	createFacility,
	type FacilityType,
	facilityTypeLabels,
	facilityTypes,
	listEconomicOperators,
} from "./catalog-api";

// The value the select field carries for "no operator": empty doesn't work,
// because the field would then count as unset and the placeholder would stick.
const NO_OPERATOR = "__none__";

export function FacilityCreateAction() {
	const queryClient = useQueryClient();
	const [open, setOpen] = useState(false);
	const [error, setError] = useState<string>();
	// See product-create-action: `FieldLabel` does not link up on its own.
	const facilityIdField = useId();
	const nameField = useId();
	const typeField = useId();
	const operatorField = useId();
	const countryField = useId();
	const [form, setForm] = useState({
		countryCode: "",
		facilityId: "",
		facilityType: "manufacturing" as FacilityType,
		name: "",
		operatorId: NO_OPERATOR,
	});
	const [address, setAddress] = useState<AddressDraft>(emptyAddress());

	const operators = useQuery({
		queryKey: ["catalog", "operators"],
		queryFn: listEconomicOperators,
	});

	const mutation = useMutation({
		mutationFn: () =>
			createFacility({
				facilityId: form.facilityId.trim(),
				name: form.name.trim(),
				facilityType: form.facilityType,
				operatorId:
					form.operatorId === NO_OPERATOR ? undefined : form.operatorId,
				countryCode: form.countryCode.trim() || undefined,
				address: mergeAddress(undefined, address),
			}),
		onSuccess: async () => {
			await queryClient.invalidateQueries({
				queryKey: ["catalog", "facilities"],
			});
			setOpen(false);
			setForm({
				countryCode: "",
				facilityId: "",
				facilityType: "manufacturing",
				name: "",
				operatorId: NO_OPERATOR,
			});
			setAddress(emptyAddress());
			setError(undefined);
		},
		onError: (cause: unknown) => {
			setError(
				cause instanceof ApiError
					? cause.message
					: "Anlegen fehlgeschlagen. Bitte erneut versuchen.",
			);
		},
	});

	const canSubmit = Boolean(form.facilityId.trim() && form.name.trim());
	const operatorLabel =
		form.operatorId === NO_OPERATOR
			? "Kein Betreiber"
			: (operators.data?.find(
					(operator) => operator.operatorId === form.operatorId,
				)?.legalName ?? form.operatorId);

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger render={<Button />}>
				<Plus className="size-4" />
				Standort anlegen
			</DialogTrigger>
			<DialogContent className="sm:max-w-lg">
				<DialogHeader>
					<DialogTitle>Standort anlegen</DialogTitle>
					<DialogDescription>
						Ein Betriebsstandort der Organisation. Der Produktpass verweist über
						die Standortkennung darauf.
					</DialogDescription>
				</DialogHeader>

				<FieldGroup>
					<Field>
						<FieldLabel htmlFor={facilityIdField}>Standortkennung</FieldLabel>
						<Input
							id={facilityIdField}
							value={form.facilityId}
							placeholder="z. B. WERK-NORD oder eine GLN"
							onChange={(event) =>
								setForm((value) => ({
									...value,
									facilityId: event.target.value,
								}))
							}
						/>
						<FieldDescription>
							Je Organisation eindeutig. Genau diese Kennung trägt der Pass.
						</FieldDescription>
					</Field>

					<Field>
						<FieldLabel htmlFor={nameField}>Name</FieldLabel>
						<Input
							id={nameField}
							value={form.name}
							placeholder="z. B. Werk Nord"
							onChange={(event) =>
								setForm((value) => ({ ...value, name: event.target.value }))
							}
						/>
					</Field>

					<Field>
						<FieldLabel htmlFor={typeField}>Art</FieldLabel>
						<Select
							value={form.facilityType}
							onValueChange={(facilityType) =>
								setForm((value) => ({
									...value,
									facilityType:
										(facilityType as FacilityType | null) ?? value.facilityType,
								}))
							}
						>
							<SelectTrigger className="w-full" id={typeField}>
								<SelectValue>
									{facilityTypeLabels[form.facilityType]}
								</SelectValue>
							</SelectTrigger>
							<SelectContent>
								{facilityTypes.map((facilityType) => (
									<SelectItem key={facilityType} value={facilityType}>
										{facilityTypeLabels[facilityType]}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</Field>

					<Field>
						<FieldLabel htmlFor={operatorField}>Betreiber</FieldLabel>
						<Select
							value={form.operatorId}
							onValueChange={(operatorId) =>
								setForm((value) => ({
									...value,
									operatorId: operatorId ?? NO_OPERATOR,
								}))
							}
						>
							<SelectTrigger className="w-full" id={operatorField}>
								<SelectValue>{operatorLabel}</SelectValue>
							</SelectTrigger>
							<SelectContent>
								<SelectItem value={NO_OPERATOR}>Kein Betreiber</SelectItem>
								{(operators.data ?? []).map((operator) => (
									<SelectItem
										key={operator.operatorId}
										value={operator.operatorId}
									>
										{operator.legalName} ({operator.operatorId})
									</SelectItem>
								))}
							</SelectContent>
						</Select>
						<FieldDescription>
							Optional — genannt muss er aber einer der erfassten
							Wirtschaftsakteure sein.
						</FieldDescription>
					</Field>

					<Field>
						<FieldLabel htmlFor={countryField}>Land</FieldLabel>
						<Input
							id={countryField}
							value={form.countryCode}
							placeholder="z. B. DE"
							maxLength={2}
							onChange={(event) =>
								setForm((value) => ({
									...value,
									countryCode: event.target.value.toUpperCase(),
								}))
							}
						/>
					</Field>

					<AddressFields onChange={setAddress} value={address} />
				</FieldGroup>

				{error ? (
					<p className="text-[13px] text-destructive" role="alert">
						{error}
					</p>
				) : null}

				<DialogFooter>
					<Button onClick={() => setOpen(false)} variant="outline">
						Abbrechen
					</Button>
					{/* See product-create-action: the trigger is already named this. */}
					<Button
						disabled={!canSubmit || mutation.isPending}
						onClick={() => mutation.mutate()}
					>
						Anlegen
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
