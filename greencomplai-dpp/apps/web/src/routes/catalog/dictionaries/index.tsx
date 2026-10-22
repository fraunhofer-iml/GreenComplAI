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
	listDictionaryRepositories,
} from "#/features/catalog/catalog-api";
import { CatalogPage } from "#/features/catalog/catalog-layout";

export const Route = createFileRoute("/catalog/dictionaries/")({
	component: DictionariesPage,
});

const columnHeadClassName =
	"px-4 text-[11px] font-semibold tracking-[0.04em] uppercase text-muted-foreground";

function DictionariesPage() {
	const query = useQuery({
		queryKey: ["catalog", "dictionary-repositories"],
		queryFn: listDictionaryRepositories,
	});

	return (
		<CatalogPage title="Dictionaries">
			<Card className="gap-0 pb-0">
				<CardHeader className="border-b">
					<div className="flex items-center gap-2.5">
						<CardTitle className="text-[14.5px] font-bold">
							Dictionaries
						</CardTitle>
						<Badge variant="secondary">
							{query.data?.length ?? 0} Einträge
						</Badge>
					</div>
				</CardHeader>
				<CardContent className="px-0">
					<Table>
						<TableHeader>
							<TableRow className="hover:bg-transparent">
								<TableHead className={columnHeadClassName}>
									Dictionary Key
								</TableHead>
								<TableHead className={columnHeadClassName}>Name</TableHead>
								<TableHead className={columnHeadClassName}>Version</TableHead>
								<TableHead className={columnHeadClassName}>Status</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{(query.data ?? []).map((repository) => (
								<TableRow key={repository.repositoryKey}>
									<TableCell className="px-4 py-3">
										<Link
											className="font-mono text-xs font-semibold text-primary underline-offset-4 hover:text-accent-foreground hover:underline"
											params={{ dictionaryKey: repository.repositoryKey }}
											to="/catalog/dictionaries/$dictionaryKey"
										>
											{repository.repositoryKey}
										</Link>
									</TableCell>
									<TableCell className="px-4 py-3 font-medium">
										{label(repository.name)}
									</TableCell>
									<TableCell className="px-4 py-3 font-mono text-xs text-muted-foreground">
										{repository.version}
									</TableCell>
									<TableCell className="px-4 py-3">
										<Badge variant="secondary">{repository.status}</Badge>
									</TableCell>
								</TableRow>
							))}
						</TableBody>
					</Table>
				</CardContent>
			</Card>
		</CatalogPage>
	);
}
