import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";

import { Card, CardContent, CardHeader, CardTitle } from "#/components/ui/card";
import { AddressCard } from "#/features/catalog/address-card";
import {
	getEconomicOperator,
	patchEconomicOperator,
} from "#/features/catalog/catalog-api";
import { CatalogPage } from "#/features/catalog/catalog-layout";
import { EntityEditForm } from "#/features/catalog/entity-form";

export const Route = createFileRoute("/catalog/operators/$operatorId")({
	component: OperatorDetailPage,
});

function OperatorDetailPage() {
	const { operatorId } = Route.useParams();
	const client = useQueryClient();
	const query = useQuery({
		queryKey: ["catalog", "operators", operatorId],
		queryFn: () => getEconomicOperator(operatorId),
	});
	const mutation = useMutation({
		mutationFn: (body: Record<string, unknown>) =>
			patchEconomicOperator(operatorId, body),
		onSuccess: async () => {
			await client.invalidateQueries({ queryKey: ["catalog", "operators"] });
		},
	});
	const operator = query.data;

	return (
		<CatalogPage title={operator?.legalName ?? operatorId}>
			<Card>
				<CardHeader>
					<CardTitle>
						{operator
							? `${operator.legalName} bearbeiten`
							: "Wirtschaftsakteur bearbeiten"}
					</CardTitle>
				</CardHeader>
				<CardContent>
					{operator ? (
						<EntityEditForm
							fields={[
								{ key: "operatorId", label: "Akteur-ID", readonly: true },
								{ key: "legalName", label: "Legal Name" },
								{ key: "roles", label: "Rollen", type: "json" },
								{ key: "countryCode", label: "Land" },
								{ key: "vatId", label: "VAT-ID" },
								{ key: "metadata", label: "Metadaten", type: "json" },
							]}
							initialValue={operator}
							onSubmit={(value) => mutation.mutate(value)}
						/>
					) : (
						<p>Wirtschaftsakteur wird geladen...</p>
					)}
				</CardContent>
			</Card>

			{operator ? (
				<AddressCard
					address={operator.address}
					onSave={(address) => mutation.mutate({ address })}
					pending={mutation.isPending}
				/>
			) : null}
		</CatalogPage>
	);
}
