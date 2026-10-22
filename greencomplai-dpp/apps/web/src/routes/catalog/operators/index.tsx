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
	listEconomicOperators,
	operatorRoleLabels,
} from "#/features/catalog/catalog-api";
import { CatalogPage } from "#/features/catalog/catalog-layout";
import { OperatorCreateAction } from "#/features/catalog/operator-create-action";

export const Route = createFileRoute("/catalog/operators/")({
	component: OperatorsPage,
});

function OperatorsPage() {
	const query = useQuery({
		queryKey: ["catalog", "operators"],
		queryFn: listEconomicOperators,
	});

	return (
		<CatalogPage actions={<OperatorCreateAction />} title="Wirtschaftsakteure">
			<Card>
				<CardHeader className="flex-row items-start justify-between gap-4">
					<CardTitle>Wirtschaftsakteure</CardTitle>
					<Badge variant="outline">{query.data?.length ?? 0}</Badge>
				</CardHeader>
				<CardContent>
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>Wirtschaftsakteur</TableHead>
								<TableHead>Name</TableHead>
								<TableHead>Rollen</TableHead>
								<TableHead>Land</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{(query.data ?? []).map((operator) => (
								<TableRow key={operator.operatorId}>
									<TableCell>
										<Link
											className="font-medium underline-offset-4 hover:underline"
											params={{ operatorId: operator.operatorId }}
											to="/catalog/operators/$operatorId"
										>
											{operator.operatorId}
										</Link>
									</TableCell>
									<TableCell>{operator.legalName}</TableCell>
									<TableCell className="space-x-1">
										{operator.roles.map((role) => (
											<Badge key={role} variant="secondary">
												{operatorRoleLabels[role]}
											</Badge>
										))}
									</TableCell>
									<TableCell>{operator.countryCode ?? "-"}</TableCell>
								</TableRow>
							))}
						</TableBody>
					</Table>
				</CardContent>
			</Card>
		</CatalogPage>
	);
}
