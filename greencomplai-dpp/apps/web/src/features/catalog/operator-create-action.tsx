import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { useId, useState } from "react";

import { Button } from "#/components/ui/button";
import { Checkbox } from "#/components/ui/checkbox";
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
import { ApiError } from "#/features/api/client";

import {
	type AddressDraft,
	AddressFields,
	emptyAddress,
	mergeAddress,
} from "./address-fields";
import {
	createEconomicOperator,
	type EconomicOperatorRole,
	operatorRoleLabels,
	operatorRoles,
} from "./catalog-api";

export function OperatorCreateAction() {
	const queryClient = useQueryClient();
	const [open, setOpen] = useState(false);
	const [error, setError] = useState<string>();
	const operatorIdField = useId();
	const legalNameField = useId();
	const countryField = useId();
	const vatField = useId();
	const [form, setForm] = useState({
		countryCode: "",
		legalName: "",
		operatorId: "",
		vatId: "",
	});
	// Multiple roles are the normal case, not the exception: a company can be
	// a manufacturer and an importer. Hence checkboxes, not a select field.
	const [roles, setRoles] = useState<EconomicOperatorRole[]>(["manufacturer"]);
	const [address, setAddress] = useState<AddressDraft>(emptyAddress());

	const mutation = useMutation({
		mutationFn: () =>
			createEconomicOperator({
				operatorId: form.operatorId.trim(),
				legalName: form.legalName.trim(),
				roles,
				countryCode: form.countryCode.trim() || undefined,
				vatId: form.vatId.trim() || undefined,
				address: mergeAddress(undefined, address),
			}),
		onSuccess: async () => {
			await queryClient.invalidateQueries({
				queryKey: ["catalog", "operators"],
			});
			setOpen(false);
			setForm({ countryCode: "", legalName: "", operatorId: "", vatId: "" });
			setRoles(["manufacturer"]);
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

	// The schema requires at least one role - without this check the call
	// would run into a 422 that the form can already answer itself.
	const canSubmit = Boolean(
		form.operatorId.trim() && form.legalName.trim() && roles.length > 0,
	);

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger render={<Button />}>
				<Plus className="size-4" />
				Wirtschaftsakteur anlegen
			</DialogTrigger>
			<DialogContent className="sm:max-w-lg">
				<DialogHeader>
					<DialogTitle>Wirtschaftsakteur anlegen</DialogTitle>
					<DialogDescription>
						Hersteller, Importeur, Händler oder Bevollmächtigter. Jeder
						Produktpass nennt genau einen.
					</DialogDescription>
				</DialogHeader>

				<FieldGroup>
					<Field>
						<FieldLabel htmlFor={operatorIdField}>Akteur-ID</FieldLabel>
						<Input
							id={operatorIdField}
							value={form.operatorId}
							placeholder="z. B. OP-4711"
							onChange={(event) =>
								setForm((value) => ({
									...value,
									operatorId: event.target.value,
								}))
							}
						/>
						<FieldDescription>
							Je Organisation eindeutig. Genau diese Kennung trägt der Pass.
						</FieldDescription>
					</Field>

					<Field>
						<FieldLabel htmlFor={legalNameField}>Firmenname</FieldLabel>
						<Input
							id={legalNameField}
							value={form.legalName}
							placeholder="z. B. Musterwerke GmbH"
							onChange={(event) =>
								setForm((value) => ({
									...value,
									legalName: event.target.value,
								}))
							}
						/>
					</Field>

					<Field>
						<FieldLabel>Rollen</FieldLabel>
						<div className="grid gap-2 sm:grid-cols-2">
							{operatorRoles.map((role) => (
								<label
									className="flex items-center gap-2 text-[13px]"
									key={role}
								>
									<Checkbox
										checked={roles.includes(role)}
										onCheckedChange={(checked) =>
											setRoles((previous) =>
												checked
													? [...previous, role]
													: previous.filter((current) => current !== role),
											)
										}
									/>
									{operatorRoleLabels[role]}
								</label>
							))}
						</div>
						<FieldDescription>
							Mindestens eine. Mehrfachnennung ist zulässig — ein Unternehmen
							kann Hersteller und Importeur zugleich sein.
						</FieldDescription>
					</Field>

					<div className="grid gap-4 sm:grid-cols-2">
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
						<Field>
							<FieldLabel htmlFor={vatField}>USt-IdNr.</FieldLabel>
							<Input
								id={vatField}
								value={form.vatId}
								placeholder="optional"
								onChange={(event) =>
									setForm((value) => ({ ...value, vatId: event.target.value }))
								}
							/>
						</Field>
					</div>

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
