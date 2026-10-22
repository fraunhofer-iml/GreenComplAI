import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";

import { Badge } from "#/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "#/components/ui/card";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "#/components/ui/table";
import {
	facilityTypeLabels,
	listFacilities,
} from "#/features/catalog/catalog-api";
import { CatalogPage } from "#/features/catalog/catalog-layout";
import { FacilityCreateAction } from "#/features/catalog/facility-create-action";

export const Route = createFileRoute("/catalog/facilities/")({
	component: FacilitiesPage,
});

function FacilitiesPage() {
	const query = useQuery({
		queryKey: ["catalog", "facilities"],
		queryFn: listFacilities,
	});
	const facilities = query.data ?? [];

	return (
		<CatalogPage actions={<FacilityCreateAction />} title="Standorte">
			<Card>
				<CardHeader className="flex-row items-start justify-between gap-4">
					<CardTitle>Standorte</CardTitle>
					<Badge variant="outline">{facilities.length}</Badge>
				</CardHeader>
				<CardContent>
					{query.isLoading ? (
						<p className="text-[13px] text-muted-foreground">
							Standorte werden geladen …
						</p>
					) : facilities.length === 0 ? (
						<p className="text-[13px] text-muted-foreground">
							Noch keine Standorte erfasst. Ein Pass kann ohne Standort
							entstehen — nennt er einen, muss er hier stehen.
						</p>
					) : (
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Standortkennung</TableHead>
									<TableHead>Name</TableHead>
									<TableHead>Art</TableHead>
									<TableHead>Betreiber</TableHead>
									<TableHead>Land</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{facilities.map((facility) => (
									<TableRow key={facility.facilityId}>
										<TableCell>
											<Link
												className="font-medium underline-offset-4 hover:underline"
												params={{ facilityId: facility.facilityId }}
												to="/catalog/facilities/$facilityId"
											>
												{facility.facilityId}
											</Link>
										</TableCell>
										<TableCell>{facility.name}</TableCell>
										<TableCell>
											<Badge variant="secondary">
												{facilityTypeLabels[facility.facilityType]}
											</Badge>
										</TableCell>
										<TableCell>{facility.operatorId ?? "-"}</TableCell>
										<TableCell>{facility.countryCode ?? "-"}</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					)}
				</CardContent>
			</Card>
		</CatalogPage>
	);
}
