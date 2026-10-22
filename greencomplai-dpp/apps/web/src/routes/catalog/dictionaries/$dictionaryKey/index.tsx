import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";

import { Badge } from "#/components/ui/badge";
import { buttonVariants } from "#/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "#/components/ui/card";
import {
	type DictionaryEntry,
	type DictionaryEntryCategory,
	dictionaryEntryCategory,
	dictionaryRepositoryCategories,
	getDictionaryRepository,
	label,
	listDictionaryEntriesByRepository,
	patchDictionaryEntry,
} from "#/features/catalog/catalog-api";
import { CatalogPage } from "#/features/catalog/catalog-layout";
import { DictionaryEntryGroups } from "#/features/catalog/dictionary-entry-groups";
import { EsrsProfileCard } from "#/features/catalog/esrs-profile-card";
import {
	CreateEntryDialog,
	DeleteCategoryDialog,
	EditCategoryDialog,
	RepositoryCreateActions,
} from "#/features/catalog/repository-create-actions";

export const Route = createFileRoute("/catalog/dictionaries/$dictionaryKey/")({
	component: DictionaryRepositoryDetailPage,
});

function DictionaryRepositoryDetailPage() {
	const { dictionaryKey } = Route.useParams();
	const client = useQueryClient();
	const query = useQuery({
		queryKey: ["catalog", "dictionary-repositories", dictionaryKey],
		queryFn: () => getDictionaryRepository(dictionaryKey),
	});
	const entries = useQuery({
		queryKey: ["catalog", "dictionary-repositories", dictionaryKey, "entries"],
		queryFn: () => listDictionaryEntriesByRepository(dictionaryKey),
	});
	const repository = query.data;
	const categories = collectAvailableCategories(
		repository ? dictionaryRepositoryCategories(repository) : [],
		entries.data ?? [],
	);
	const selectableCategories = categories.filter(
		(category) => category.id !== defaultCategory.id,
	);
	const categoryMutation = useMutation({
		mutationFn: ({
			category,
			entry,
		}: {
			category: DictionaryEntryCategory;
			entry: DictionaryEntry;
		}) =>
			patchDictionaryEntry(dictionaryKey, entry.entryKey, {
				metadata: entryCategoryMetadata(entry, category),
			}),
		onSuccess: async () => {
			await client.invalidateQueries({
				queryKey: ["catalog", "dictionary-entries"],
			});
			await client.invalidateQueries({
				queryKey: [
					"catalog",
					"dictionary-repositories",
					dictionaryKey,
					"entries",
				],
			});
		},
	});

	return (
		<CatalogPage
			actions={
				<div className="flex flex-wrap justify-end gap-2">
					{repository ? (
						<RepositoryCreateActions repository={repository} />
					) : null}
					<Link
						className={buttonVariants({ variant: "outline" })}
						params={{ dictionaryKey }}
						to="/catalog/dictionaries/$dictionaryKey/edit"
					>
						Bearbeiten
					</Link>
				</div>
			}
			title={repository ? label(repository.name) : dictionaryKey}
		>
			<Card>
				<CardHeader>
					<div>
						<CardTitle>Dictionary-Details</CardTitle>
						<CardDescription>
							Lesende Übersicht der Dictionary-Stammdaten.
						</CardDescription>
					</div>
				</CardHeader>
				<CardContent>
					{repository ? (
						<dl className="grid gap-3 md:grid-cols-2">
							<DetailItem
								label="Dictionary Key"
								value={repository.repositoryKey}
							/>
							<DetailItem label="Name" value={label(repository.name)} />
							<DetailItem
								label="Namespace URI"
								value={repository.namespaceUri}
							/>
							<DetailItem label="Version" value={repository.version} />
							<DetailItem
								label="Publisher"
								value={repository.publisher ?? "Nicht angegeben"}
							/>
							<DetailItem label="Status" value={repository.status} />
						</dl>
					) : (
						<p>Dictionary wird geladen...</p>
					)}
				</CardContent>
			</Card>
			<Card>
				<CardHeader className="flex-row items-start justify-between gap-4">
					<CardTitle>Einträge nach Überkategorie</CardTitle>
					<Badge variant="outline">{entries.data?.length ?? 0}</Badge>
				</CardHeader>
			</Card>
			{repository ? (
				<DictionaryEntryGroups
					categories={categories}
					entries={entries.data ?? []}
					onEntryCategoryChange={(entry, category) =>
						categoryMutation.mutate({ category, entry })
					}
					repositoryKey={dictionaryKey}
					renderCategoryActions={(category) => (
						<div className="flex items-center gap-2">
							{category.id !== defaultCategory.id ? (
								<>
									<EditCategoryDialog
										category={category}
										repository={repository}
									/>
									<DeleteCategoryDialog
										category={category}
										entryCount={entryCountForCategory(
											entries.data ?? [],
											category.id,
										)}
										repository={repository}
									/>
								</>
							) : null}
							<CreateEntryDialog
								categories={selectableCategories}
								initialCategoryId={
									category.id === defaultCategory.id ? "default" : category.id
								}
								repository={repository}
							/>
						</div>
					)}
				/>
			) : null}

			<EsrsProfileCard dictionaryKey={dictionaryKey} />
		</CatalogPage>
	);
}

function DetailItem({
	label: detailLabel,
	value,
}: {
	label: string;
	value: string;
}) {
	return (
		<div className="rounded-lg border p-4">
			<dt className="text-xs font-medium uppercase text-muted-foreground">
				{detailLabel}
			</dt>
			<dd className="mt-2 break-words text-sm">{value}</dd>
		</div>
	);
}

const defaultCategory: DictionaryEntryCategory = {
	description: "Einträge ohne explizite Überkategorie.",
	id: "uncategorized",
	label: "Default",
};

function collectAvailableCategories(
	repositoryCategories: DictionaryEntryCategory[],
	entries: DictionaryEntry[],
) {
	const categories = new Map<string, DictionaryEntryCategory>();

	categories.set(defaultCategory.id, defaultCategory);
	for (const category of repositoryCategories) {
		categories.set(category.id, category);
	}
	for (const entry of entries) {
		const category = dictionaryEntryCategory(entry);
		categories.set(category.id, category);
	}

	return [...categories.values()];
}

function entryCountForCategory(entries: DictionaryEntry[], categoryId: string) {
	return entries.filter(
		(entry) => dictionaryEntryCategory(entry).id === categoryId,
	).length;
}

function entryCategoryMetadata(
	entry: DictionaryEntry,
	category: DictionaryEntryCategory,
) {
	const metadata = { ...(entry.metadata ?? {}) };

	if (category.id === defaultCategory.id) {
		delete metadata.category;
		return metadata;
	}

	return {
		...metadata,
		category: {
			description: category.description,
			id: category.id,
			name: { de: category.label, en: category.label },
		},
	};
}
