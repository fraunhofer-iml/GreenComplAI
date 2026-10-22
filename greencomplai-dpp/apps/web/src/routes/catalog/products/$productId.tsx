import { createFileRoute } from "@tanstack/react-router";

import { ProductDetailPage } from "#/features/catalog/product-detail";

export const Route = createFileRoute("/catalog/products/$productId")({
	component: ProductDetailRoute,
});

function ProductDetailRoute() {
	const { productId } = Route.useParams();

	return <ProductDetailPage productId={productId} />;
}
