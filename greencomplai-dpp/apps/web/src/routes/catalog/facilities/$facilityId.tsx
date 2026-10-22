import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";

import { Card, CardContent, CardHeader, CardTitle } from "#/components/ui/card";
import { AddressCard } from "#/features/catalog/address-card";
import { getFacility, patchFacility } from "#/features/catalog/catalog-api";
import { CatalogPage } from "#/features/catalog/catalog-layout";
import { EntityEditForm } from "#/features/catalog/entity-form";

export const Route = createFileRoute("/catalog/facilities/$facilityId")({
	component: FacilityDetailPage,
});

function FacilityDetailPage() {
	const { facilityId } = Route.useParams();
	const client = useQueryClient();
	const query = useQuery({
		queryKey: ["catalog", "facilities", facilityId],
		queryFn: () => getFacility(facilityId),
	});
	const mutation = useMutation({
		mutationFn: (body: Record<string, unknown>) =>
			patchFacility(facilityId, body),
		onSuccess: async () => {
			await client.invalidateQueries({ queryKey: ["catalog", "facilities"] });
		},
	});
	const facility = query.data;

	return (
		<CatalogPage title={facility?.name ?? facilityId}>
			<Card>
				<CardHeader>
					<CardTitle>
						{facility ? `${facility.name} bearbeiten` : "Standort bearbeiten"}
					</CardTitle>
				</CardHeader>
				<CardContent>
					{facility ? (
						<EntityEditForm
							fields={[
								{ key: "facilityId", label: "Standortkennung", readonly: true },
								{ key: "name", label: "Name" },
								{ key: "facilityType", label: "Art" },
								{ key: "operatorId", label: "Betreiber (Akteur-ID)" },
								{ key: "countryCode", label: "Land" },
								{ key: "metadata", label: "Metadaten", type: "json" },
							]}
							initialValue={facility}
							onSubmit={(value) => mutation.mutate(value)}
						/>
					) : (
						<p>Standort wird geladen...</p>
					)}
				</CardContent>
			</Card>

			{facility ? (
				<AddressCard
					address={facility.address}
					onSave={(address) => mutation.mutate({ address })}
					pending={mutation.isPending}
				/>
			) : null}
		</CatalogPage>
	);
}
