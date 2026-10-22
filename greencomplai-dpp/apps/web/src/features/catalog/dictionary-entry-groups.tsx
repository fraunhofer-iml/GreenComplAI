import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { useState } from "react";

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
	type DictionaryEntry,
	type DictionaryEntryCategory,
	dictionaryEntryCategory,
	label,
} from "./catalog-api";

type EntryGroup = {
	category: DictionaryEntryCategory;
	entries: DictionaryEntry[];
};

const categoryOrder = [
	"uncategorized",
	"identification",
	"dimensions",
	"materials",
	"sustainability",
	"compliance",
	"service-repair",
	"supply-chain",
];
const visibilityLabels: Record<string, string> = {
	controlled: "Kontrolliert",
	public: "Öffentlich",
};

export function DictionaryEntryGroups({
	categories = [],
	entries,
	onEntryCategoryChange,
	repositoryKey,
	renderCategoryActions,
}: {
	categories?: DictionaryEntryCategory[];
	entries: DictionaryEntry[];
	onEntryCategoryChange?: (
		entry: DictionaryEntry,
		category: DictionaryEntryCategory,
	) => void;
	repositoryKey?: string;
	renderCategoryActions?: (category: DictionaryEntryCategory) => ReactNode;
}) {
	const groups = groupEntries(entries, categories);
	const [draggedEntryKey, setDraggedEntryKey] = useState<string | null>(null);
	const [dropCategoryId, setDropCategoryId] = useState<string | null>(null);

	return (
		<div className="grid gap-4">
			{groups.map((group) => (
				<Card
					data-drop-active={
						dropCategoryId === group.category.id ? "true" : undefined
					}
					key={group.category.id}
					onDragLeave={() =>
						setDropCategoryId((current) =>
							current === group.category.id ? null : current,
						)
					}
					onDragOver={(event) => {
						if (!onEntryCategoryChange || !draggedEntryKey) return;
						event.preventDefault();
						setDropCategoryId(group.category.id);
					}}
					onDrop={(event) => {
						event.preventDefault();
						setDropCategoryId(null);
						const entryKey = event.dataTransfer.getData("text/plain");
						const entry = entries.find(
							(candidate) => candidate.entryKey === entryKey,
						);
						if (
							entry &&
							dictionaryEntryCategory(entry).id !== group.category.id
						) {
							onEntryCategoryChange?.(entry, group.category);
						}
					}}
				>
					<CardHeader className="flex-row items-start justify-between gap-4">
						<div className="grid gap-1">
							<CardTitle>{group.category.label}</CardTitle>
							{group.category.description ? (
								<p className="text-sm text-muted-foreground">
									{group.category.description}
								</p>
							) : null}
						</div>
						<div className="flex items-center gap-2">
							<Badge variant="outline">{group.entries.length} Einträge</Badge>
							{renderCategoryActions?.(group.category)}
						</div>
					</CardHeader>
					<CardContent>
						<Table className="table-fixed">
							<colgroup>
								<col className="w-[26%]" />
								<col className="w-[34%]" />
								<col className="w-[14%]" />
								<col className="w-[16%]" />
								<col className="w-[10%]" />
							</colgroup>
							<TableHeader>
								<TableRow>
									<TableHead>Eintrag</TableHead>
									<TableHead>Name</TableHead>
									<TableHead>Typ</TableHead>
									<TableHead>Sichtbarkeit</TableHead>
									<TableHead className="text-right">Pflicht</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{group.entries.map((entry) => (
									<TableRow
										className="cursor-grab data-[dragging=true]:opacity-50"
										data-dragging={
											draggedEntryKey === entry.entryKey ? "true" : undefined
										}
										draggable={Boolean(onEntryCategoryChange)}
										key={entry.entryKey}
										onDragEnd={() => {
											setDraggedEntryKey(null);
											setDropCategoryId(null);
										}}
										onDragStart={(event) => {
											if (!onEntryCategoryChange) return;
											setDraggedEntryKey(entry.entryKey);
											event.dataTransfer.effectAllowed = "move";
											event.dataTransfer.setData("text/plain", entry.entryKey);
										}}
									>
										<TableCell className="overflow-hidden text-ellipsis">
											{repositoryKey ? (
												<Link
													className="block overflow-hidden text-ellipsis font-medium underline-offset-4 hover:underline"
													params={{
														dictionaryKey: repositoryKey,
														entryKey: entry.entryKey,
													}}
													to="/catalog/dictionaries/$dictionaryKey/entries/$entryKey"
												>
													{entry.entryKey}
												</Link>
											) : (
												entry.entryKey
											)}
										</TableCell>
										<TableCell className="overflow-hidden text-ellipsis">
											{label(entry.name)}
										</TableCell>
										<TableCell className="overflow-hidden text-ellipsis">
											{entry.valueType}
										</TableCell>
										<TableCell>
											<Badge variant="secondary">
												{visibilityLabels[entry.visibility] ?? entry.visibility}
											</Badge>
										</TableCell>
										<TableCell className="text-right">
											{entry.required ? (
												<Badge>Ja</Badge>
											) : (
												<Badge variant="outline">Nein</Badge>
											)}
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					</CardContent>
				</Card>
			))}
		</div>
	);
}

function groupEntries(
	entries: DictionaryEntry[],
	categories: DictionaryEntryCategory[],
): EntryGroup[] {
	const groups = new Map<string, EntryGroup>();

	for (const category of categories) {
		groups.set(category.id, { category, entries: [] });
	}

	for (const entry of entries) {
		const category = dictionaryEntryCategory(entry);
		const group = groups.get(category.id) ?? { category, entries: [] };
		group.entries.push(entry);
		groups.set(category.id, group);
	}

	return [...groups.values()]
		.map((group) => ({
			...group,
			entries: group.entries.sort((a, b) =>
				a.entryKey.localeCompare(b.entryKey),
			),
		}))
		.sort((a, b) => categoryRank(a.category.id) - categoryRank(b.category.id));
}

function categoryRank(categoryId: string) {
	const index = categoryOrder.indexOf(categoryId);
	return index === -1 ? Number.MAX_SAFE_INTEGER : index;
}
