import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { ArrowRight, Plus } from "lucide-react";
import { useId, useState } from "react";

import { Button, buttonVariants } from "#/components/ui/button";
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
import {
	dppGranularityLabels,
	label,
	listDictionaryRepositories,
	listEconomicOperators,
	listFacilities,
	listProducts,
} from "#/features/catalog/catalog-api";
import { createDppDraft } from "./dashboard-api";

// Sentinel for "no facility": the select treats an empty value as unset and
// would keep showing the placeholder.
const NO_FACILITY = "__none__";

export function CreateDppDialog({
	// Controlled from outside where the dialog is opened by something other than
	// its own button - a menu item, for instance, which cannot host a trigger
	// because the menu unmounts it on selection.
	onOpenChange,
	open: controlledOpen,
	// Fixed where the page is already about one product. Then the field states
	// the product instead of asking for it.
	productId,
	showTrigger = true,
}: {
	onOpenChange?: (open: boolean) => void;
	open?: boolean;
	productId?: string;
	showTrigger?: boolean;
} = {}) {
	const queryClient = useQueryClient();
	const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
	const open = controlledOpen ?? uncontrolledOpen;
	const setOpen = onOpenChange ?? setUncontrolledOpen;
	const [createdDppId, setCreatedDppId] = useState<string>();
	const [form, setForm] = useState({
		dppSchemaVersion: "",
		economicOperatorId: "",
		facilityId: "",
		granularity: "model",
		productId: productId ?? "",
	});
	const operators = useQuery({
		queryKey: ["catalog", "operators"],
		queryFn: listEconomicOperators,
	});
	const repositories = useQuery({
		queryKey: ["catalog", "dictionary-repositories"],
		queryFn: listDictionaryRepositories,
	});
	const products = useQuery({
		queryKey: ["catalog", "products"],
		queryFn: listProducts,
	});
	const facilities = useQuery({
		queryKey: ["catalog", "facilities"],
		queryFn: listFacilities,
	});
	const productListId = useId();
	// What the closed trigger shows. Without these, `Select.Value` falls back to
	// the raw value - the operator's id instead of its name, `key/version`
	// instead of the dictionary's name.
	const operatorItems = Object.fromEntries(
		(operators.data ?? []).map((operator) => [
			operator.operatorId,
			`${operator.legalName} · ${operator.operatorId}`,
		]),
	);
	const repositoryItems = Object.fromEntries(
		(repositories.data ?? []).map((repository) => [
			`${repository.repositoryKey}/${repository.version}`,
			`${label(repository.name)} · ${repository.version}`,
		]),
	);
	const facilityLabel = form.facilityId
		? (facilities.data?.find(
				(facility) => facility.facilityId === form.facilityId,
			)?.name ?? form.facilityId)
		: "Kein Standort";
	const canSubmit = Boolean(
		form.productId &&
			form.economicOperatorId &&
			form.granularity &&
			form.dppSchemaVersion,
	);
	const mutation = useMutation({
		mutationFn: () => createDppDraft(form),
		onSuccess: async (created) => {
			setCreatedDppId(created.publicId);
			await queryClient.invalidateQueries({ queryKey: ["dashboard", "dpps"] });
		},
	});

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			{showTrigger ? (
				<DialogTrigger render={<Button />}>
					<Plus className="size-4" />
					DPP Draft erstellen
				</DialogTrigger>
			) : null}
			<DialogContent className="sm:max-w-2xl">
				<DialogHeader>
					<DialogTitle>DPP Draft Shell</DialogTitle>
					<DialogDescription>
						Erstellt einen leeren Draft mit externer Produkt-ID,
						Wirtschaftsakteur, Schema und Granularität.
					</DialogDescription>
				</DialogHeader>

				<FieldGroup>
					<Field>
						<FieldLabel>Produkt-ID</FieldLabel>
						{/* Suggest known products while allowing an ID before master data exists. */}
						<Input
							value={form.productId}
							list={productListId}
							disabled={Boolean(productId)}
							placeholder="z. B. ERP-12345 oder GTIN-..."
							onChange={(event) =>
								setForm((value) => ({
									...value,
									productId: event.target.value,
								}))
							}
						/>
						<datalist id={productListId}>
							{(products.data ?? []).map((product) => (
								<option key={product.productId} value={product.productId}>
									{label(product.name)}
								</option>
							))}
						</datalist>
						<FieldDescription>
							Referenz auf das Produkt im führenden System des Unternehmens.
							Erfasste Produkte werden vorgeschlagen; eine freie Kennung ist
							ebenso zulässig.
						</FieldDescription>
					</Field>

					<Field>
						<FieldLabel>Wirtschaftsakteur</FieldLabel>
						<Select
							items={operatorItems}
							value={form.economicOperatorId}
							onValueChange={(economicOperatorId) =>
								setForm((value) => ({
									...value,
									economicOperatorId: economicOperatorId ?? "",
								}))
							}
						>
							<SelectTrigger className="w-full">
								<SelectValue placeholder="Wirtschaftsakteur wählen" />
							</SelectTrigger>
							<SelectContent>
								{(operators.data ?? []).map((operator) => (
									<SelectItem
										key={operator.operatorId}
										value={operator.operatorId}
									>
										{operator.legalName} · {operator.operatorId}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
						<FieldDescription>
							Der Wirtschaftsakteur ist für diesen Draft verantwortlich.
						</FieldDescription>
					</Field>

					<Field>
						<FieldLabel>Dictionary</FieldLabel>
						<Select
							items={repositoryItems}
							value={form.dppSchemaVersion}
							onValueChange={(dppSchemaVersion) =>
								setForm((value) => ({
									...value,
									dppSchemaVersion: dppSchemaVersion ?? "",
								}))
							}
						>
							<SelectTrigger className="w-full">
								<SelectValue placeholder="Dictionary wählen" />
							</SelectTrigger>
							<SelectContent>
								{(repositories.data ?? []).map((repository) => (
									<SelectItem
										key={repository.id}
										value={`${repository.repositoryKey}/${repository.version}`}
									>
										{label(repository.name)}
										<span className="text-muted-foreground">
											{repository.repositoryKey}/{repository.version}
										</span>
									</SelectItem>
								))}
							</SelectContent>
						</Select>
						<FieldDescription>
							Koppelt den Pass an ein Dictionary-Repository und legt damit die
							Schema-Version sowie die befüllbaren Felder im Editor fest.
						</FieldDescription>
					</Field>

					<div className="grid gap-4 sm:grid-cols-2">
						<Field>
							<FieldLabel>Granularität</FieldLabel>
							{/* Granularity is a fixed enum, not arbitrary text. */}
							<Select
								items={dppGranularityLabels}
								value={form.granularity}
								onValueChange={(granularity) =>
									setForm((value) => ({
										...value,
										granularity: granularity ?? value.granularity,
									}))
								}
							>
								<SelectTrigger className="w-full">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{Object.keys(dppGranularityLabels).map((granularity) => (
										<SelectItem key={granularity} value={granularity}>
											{dppGranularityLabels[granularity]}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</Field>
						<Field>
							<FieldLabel>Standort</FieldLabel>
							{/* A referenced facility must already exist. */}
							<Select
								value={form.facilityId || NO_FACILITY}
								onValueChange={(facilityId) =>
									setForm((value) => ({
										...value,
										facilityId:
											!facilityId || facilityId === NO_FACILITY
												? ""
												: facilityId,
									}))
								}
							>
								<SelectTrigger className="w-full">
									<SelectValue>{facilityLabel}</SelectValue>
								</SelectTrigger>
								<SelectContent>
									<SelectItem value={NO_FACILITY}>Kein Standort</SelectItem>
									{(facilities.data ?? []).map((facility) => (
										<SelectItem
											key={facility.facilityId}
											value={facility.facilityId}
										>
											{facility.name} ({facility.facilityId})
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</Field>
					</div>
					{!operators.data?.length && (
						<p className="text-sm text-destructive">
							Es wird mindestens ein Wirtschaftsakteur im Catalog benötigt.
						</p>
					)}
					{repositories.data && repositories.data.length === 0 ? (
						<p className="text-sm text-destructive">
							Es wird mindestens ein Dictionary-Repository benötigt.
						</p>
					) : null}
					{createdDppId ? (
						<Link
							className={buttonVariants({ variant: "outline" })}
							params={{ dppId: createdDppId }}
							to="/dpps/$dppId"
						>
							Neuen DPP öffnen
							<ArrowRight className="size-4" />
						</Link>
					) : null}
				</FieldGroup>

				<DialogFooter>
					<Button
						disabled={!canSubmit || mutation.isPending}
						onClick={() => mutation.mutate()}
					>
						Draft erstellen
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
