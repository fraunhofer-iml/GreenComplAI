import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

import { buttonVariants } from "#/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "#/components/ui/card";
import {
	getDictionaryRepository,
	label,
	patchDictionaryRepository,
} from "#/features/catalog/catalog-api";
import { CatalogPage } from "#/features/catalog/catalog-layout";
import { EntityEditForm } from "#/features/catalog/entity-form";

export const Route = createFileRoute(
	"/catalog/dictionaries/$dictionaryKey/edit",
)({
	component: DictionaryRepositoryEditPage,
});

function DictionaryRepositoryEditPage() {
	const { dictionaryKey } = Route.useParams();
	const client = useQueryClient();
	const navigate = useNavigate();
	const query = useQuery({
		queryKey: ["catalog", "dictionary-repositories", dictionaryKey],
		queryFn: () => getDictionaryRepository(dictionaryKey),
	});
	const mutation = useMutation({
		mutationFn: (body: Record<string, unknown>) =>
			patchDictionaryRepository(dictionaryKey, body),
		onSuccess: async () => {
			await client.invalidateQueries({
				queryKey: ["catalog", "dictionary-repositories"],
			});
			await navigate({
				params: { dictionaryKey },
				to: "/catalog/dictionaries/$dictionaryKey",
			});
		},
	});
	const repository = query.data;

	return (
		<CatalogPage
			actions={
				<Link
					className={buttonVariants({ variant: "outline" })}
					params={{ dictionaryKey }}
					to="/catalog/dictionaries/$dictionaryKey"
				>
					<ArrowLeft className="size-4" />
					Details
				</Link>
			}
			title={
				repository
					? `${label(repository.name)} bearbeiten`
					: "Dictionary bearbeiten"
			}
		>
			<Card>
				<CardHeader>
					<div>
						<CardTitle>Dictionary bearbeiten</CardTitle>
						<CardDescription>
							Pflege der öffentlichen Dictionary-Metadaten.
						</CardDescription>
					</div>
				</CardHeader>
				<CardContent>
					{repository ? (
						<EntityEditForm
							fields={[
								{
									key: "repositoryKey",
									label: "Dictionary Key",
									readonly: true,
								},
								{ key: "name", label: "Name", type: "json" },
								{ key: "namespaceUri", label: "Namespace URI" },
								{ key: "version", label: "Version" },
								{ key: "publisher", label: "Publisher" },
								{
									key: "status",
									label: "Status",
									options: ["draft", "active", "retired"],
									type: "select",
								},
								{ key: "metadata", label: "Metadaten", type: "json" },
							]}
							initialValue={repository}
							onSubmit={(value) => mutation.mutate(value)}
						/>
					) : (
						<p>Dictionary wird geladen...</p>
					)}
				</CardContent>
			</Card>
		</CatalogPage>
	);
}
