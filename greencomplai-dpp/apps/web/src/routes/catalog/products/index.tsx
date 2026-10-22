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
	label,
	listProducts,
	productLifecycleLabels,
} from "#/features/catalog/catalog-api";
import { CatalogPage } from "#/features/catalog/catalog-layout";
import { ProductCreateAction } from "#/features/catalog/product-create-action";

export const Route = createFileRoute("/catalog/products/")({
	component: ProductsPage,
});

function ProductsPage() {
	const query = useQuery({
		queryKey: ["catalog", "products"],
		queryFn: listProducts,
	});
	const products = query.data ?? [];

	return (
		<CatalogPage actions={<ProductCreateAction />} title="Produkte">
			<Card>
				<CardHeader className="flex-row items-start justify-between gap-4">
					<CardTitle>Produkte</CardTitle>
					<Badge variant="outline">{products.length}</Badge>
				</CardHeader>
				<CardContent>
					{query.isLoading ? (
						<p className="text-[13px] text-muted-foreground">
							Produkte werden geladen …
						</p>
					) : products.length === 0 ? (
						// Explain the empty state instead of rendering an ambiguous empty table.
						<p className="text-[13px] text-muted-foreground">
							Noch keine Produkte erfasst. Ein Produktpass kann auch ohne
							angelegtes Produkt entstehen — die Produkt-ID ist dann eine freie
							Kennung aus dem ERP.
						</p>
					) : (
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Produkt-ID</TableHead>
									<TableHead>Name</TableHead>
									<TableHead>Kategorie</TableHead>
									<TableHead>Lebenszyklus</TableHead>
									<TableHead>Kennungen</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{products.map((product) => (
									<TableRow key={product.productId}>
										<TableCell>
											<Link
												className="font-medium underline-offset-4 hover:underline"
												params={{ productId: product.productId }}
												to="/catalog/products/$productId"
											>
												{product.productId}
											</Link>
										</TableCell>
										<TableCell>{label(product.name)}</TableCell>
										<TableCell>{product.category ?? "-"}</TableCell>
										<TableCell>
											<Badge variant="secondary">
												{productLifecycleLabels[product.lifecycleStatus]}
											</Badge>
										</TableCell>
										<TableCell className="space-x-1">
											{product.identifiers.length === 0
												? "-"
												: product.identifiers.map((identifier) => (
														<Badge
															key={`${identifier.identifierType}:${identifier.identifierValue}`}
															variant="outline"
														>
															{identifier.identifierType}:{" "}
															{identifier.identifierValue}
														</Badge>
													))}
										</TableCell>
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
