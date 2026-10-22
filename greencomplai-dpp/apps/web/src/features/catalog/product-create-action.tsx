import { useMutation, useQueryClient } from "@tanstack/react-query";
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
	createProduct,
	type ProductLifecycleStatus,
	productLifecycleLabels,
} from "./catalog-api";
import {
	type IdentifierDraft,
	IdentifierFields,
	usableIdentifiers,
} from "./identifier-fields";

const lifecycleValues = Object.keys(
	productLifecycleLabels,
) as ProductLifecycleStatus[];

export function ProductCreateAction() {
	const queryClient = useQueryClient();
	const [open, setOpen] = useState(false);
	const [error, setError] = useState<string>();
	// `FieldLabel` doesn't link to the input on its own: without `htmlFor`/`id` the label is
	// just text next to it - clicking it focuses nothing, and screen readers as well as tests
	// can't find the field.
	const productIdField = useId();
	const nameField = useId();
	const categoryField = useId();
	const lifecycleField = useId();
	const [form, setForm] = useState({
		category: "",
		lifecycleStatus: "active" as ProductLifecycleStatus,
		name: "",
		productId: "",
	});
	const [identifiers, setIdentifiers] = useState<IdentifierDraft[]>([]);

	const mutation = useMutation({
		mutationFn: () =>
			createProduct({
				productId: form.productId.trim(),
				// The name is a translation object; the form maintains only German for now, so
				// there's no language table for a single name here.
				name: { de: form.name.trim() },
				category: form.category.trim() || undefined,
				lifecycleStatus: form.lifecycleStatus,
				identifiers: usableIdentifiers(identifiers),
			}),
		onSuccess: async () => {
			await queryClient.invalidateQueries({
				queryKey: ["catalog", "products"],
			});
			setOpen(false);
			setForm({
				category: "",
				lifecycleStatus: "active",
				name: "",
				productId: "",
			});
			setIdentifiers([]);
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

	const canSubmit = Boolean(form.productId.trim() && form.name.trim());

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger render={<Button />}>
				<Plus className="size-4" />
				Produkt anlegen
			</DialogTrigger>
			<DialogContent className="sm:max-w-lg">
				<DialogHeader>
					<DialogTitle>Produkt anlegen</DialogTitle>
					<DialogDescription>
						Stammdaten des Produkts. Der Produktpass verweist über die
						Produkt-ID darauf.
					</DialogDescription>
				</DialogHeader>

				<FieldGroup>
					<Field>
						<FieldLabel htmlFor={productIdField}>Produkt-ID</FieldLabel>
						<Input
							id={productIdField}
							value={form.productId}
							placeholder="z. B. ERP-12345"
							onChange={(event) =>
								setForm((value) => ({
									...value,
									productId: event.target.value,
								}))
							}
						/>
						<FieldDescription>
							Die Kennung aus dem führenden System. Je Organisation eindeutig.
						</FieldDescription>
					</Field>

					<Field>
						<FieldLabel htmlFor={nameField}>Name</FieldLabel>
						<Input
							id={nameField}
							value={form.name}
							placeholder="z. B. Stadtrad 28 Zoll"
							onChange={(event) =>
								setForm((value) => ({ ...value, name: event.target.value }))
							}
						/>
					</Field>

					<Field>
						<FieldLabel htmlFor={categoryField}>Kategorie</FieldLabel>
						<Input
							id={categoryField}
							value={form.category}
							placeholder="optional"
							onChange={(event) =>
								setForm((value) => ({ ...value, category: event.target.value }))
							}
						/>
					</Field>

					<Field>
						<FieldLabel htmlFor={lifecycleField}>Lebenszyklus</FieldLabel>
						<Select
							value={form.lifecycleStatus}
							onValueChange={(lifecycleStatus) =>
								setForm((value) => ({
									...value,
									lifecycleStatus:
										(lifecycleStatus as ProductLifecycleStatus | null) ??
										value.lifecycleStatus,
								}))
							}
						>
							<SelectTrigger className="w-full" id={lifecycleField}>
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

					<IdentifierFields onChange={setIdentifiers} value={identifiers} />
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
					{/* Not "Produkt anlegen" again: the trigger already carries that label, and
					    two buttons with the same name are indistinguishable for screen readers
					    and tests alike. */}
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
