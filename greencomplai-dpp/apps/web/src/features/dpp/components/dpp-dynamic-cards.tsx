import type {
	ResolvedCollection,
	ResolvedElement,
	ResolvedMetricGroup,
} from "../dpp-view";
import { DppCollectionCard } from "./dpp-collection-card";
import { DppMetricGroupCard } from "./dpp-metric-group-card";

type DppDynamicCardsProps = {
	collections: ResolvedCollection[];
	// Root-level elements. Those with a metric presentation are already in
	// metricGroups; the rest would otherwise have nowhere to render.
	core?: ResolvedElement[];
	metricGroups: ResolvedMetricGroup[];
};

// Stacked content cards: metric groups (stat tiles) first, then the grouped
// data areas as list cards, and finally anything left over.
export function DppDynamicCards({
	collections,
	core = [],
	metricGroups,
}: DppDynamicCardsProps) {
	// A root-level element only reaches a metric group through the dictionary's
	// internalDisplay hint — which the public API strips, by design. Without a
	// fallback such an element is counted in the summary but rendered nowhere,
	// so a published passport can claim public datapoints and show none.
	const groupedIds = new Set(
		metricGroups.flatMap((group) =>
			group.elements.map((element) => element.id),
		),
	);
	const ungrouped = core.filter((element) => !groupedIds.has(element.id));

	return (
		<div className="grid gap-4">
			{metricGroups.map((group) => (
				<DppMetricGroupCard group={group} key={group.id} />
			))}
			{ungrouped.length > 0 ? (
				<DppCollectionCard
					collection={{
						elements: ungrouped,
						id: "core-data-elements",
						name: "Weitere Angaben",
						visibility: "public",
					}}
				/>
			) : null}
			{collections.map((collection) => (
				<DppCollectionCard collection={collection} key={collection.id} />
			))}
		</div>
	);
}
