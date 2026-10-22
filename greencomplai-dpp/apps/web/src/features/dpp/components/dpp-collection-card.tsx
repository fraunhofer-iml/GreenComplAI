import type { ResolvedCollection } from "../dpp-view";
import { DppDataRow } from "./dpp-data-row";

// Data area as a list card: header row with name and public counter, followed
// by one bordered row per element.
export function DppCollectionCard({
	collection,
}: {
	collection: ResolvedCollection;
}) {
	const visible = collection.elements.filter(
		(element) => element.visibility === "public",
	).length;

	return (
		<section className="overflow-hidden rounded-xl border bg-card">
			<div className="flex flex-wrap items-baseline justify-between gap-2 border-b px-5 py-3.5">
				<h3 className="min-w-0 truncate text-[15px] font-bold">
					{collection.name}
				</h3>
				<span className="shrink-0 font-mono text-[11px] text-muted-foreground">
					{visible}/{collection.elements.length} public
				</span>
			</div>
			<div>
				{collection.elements.map((element) => (
					<DppDataRow element={element} key={element.id} />
				))}
			</div>
		</section>
	);
}
