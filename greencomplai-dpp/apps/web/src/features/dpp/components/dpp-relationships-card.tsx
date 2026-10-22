import { Link } from "@tanstack/react-router";
import { ArrowRight, Boxes } from "lucide-react";

import type { DppRelationship } from "../dpp-view";

export type DppRelationshipView = DppRelationship;

// What an edge is called from the viewpoint of the passport currently on screen.
//
// A relationship has two ends and two readings: the same edge is "contains" from the whole and
// "is part of" from the part. Showing only the stored type asserts the opposite on one of the
// two sides - specifically the side that didn't create it.
const RELATIONSHIP_LABELS: Record<
	string,
	{ incoming: string; outgoing: string }
> = {
	contains: { outgoing: "enthält", incoming: "enthalten in" },
	isComponentOf: { outgoing: "ist Teil von", incoming: "hat als Bestandteil" },
	replaces: { outgoing: "ersetzt", incoming: "wird ersetzt durch" },
	isVariantOf: { outgoing: "ist Variante von", incoming: "hat als Variante" },
	derivedFrom: { outgoing: "abgeleitet von", incoming: "Grundlage für" },
	hasPackaging: { outgoing: "hat Verpackung", incoming: "ist Verpackung von" },
	hasSparePart: { outgoing: "hat Ersatzteil", incoming: "ist Ersatzteil von" },
};

function relationshipLabel(relationship: DppRelationshipView): string {
	const labels = RELATIONSHIP_LABELS[relationship.relationshipType];
	// An unknown type is shown as-is - no guessing.
	if (!labels) return relationship.relationshipType;

	return relationship.direction === "incoming"
		? labels.incoming
		: labels.outgoing;
}

// The other end of the edge. For an incoming relationship that's the source; showing it is the
// whole point - otherwise the row would point back to the passport currently on screen.
function otherEnd(relationship: DppRelationshipView) {
	if (relationship.direction === "incoming") {
		return {
			// Short identifier first: it's the address form the app otherwise navigates by. The
			// URN works just as well but leaves the same view reachable at two addresses.
			dppId:
				relationship.sourcePublicId ??
				relationship.sourceDigitalProductPassportId ??
				relationship.targetDigitalProductPassportId,
			label:
				relationship.sourceProductId ??
				relationship.sourceDigitalProductPassportId ??
				relationship.targetDigitalProductPassportId,
		};
	}

	return {
		dppId:
			relationship.targetPublicId ??
			relationship.targetDigitalProductPassportId,
		label:
			relationship.targetProductId ??
			relationship.targetDigitalProductPassportId,
	};
}

// Rail card listing linked passports as navigable rows.
export function DppRelationshipsCard({
	relationships,
}: {
	relationships: DppRelationshipView[];
}) {
	return (
		<section className="rounded-xl border bg-card p-5">
			<div className="flex items-baseline justify-between gap-2">
				<h3 className="text-[15px] font-bold">Beziehungen</h3>
				<span className="font-mono text-[11px] text-muted-foreground">
					{relationships.length} Kanten
				</span>
			</div>
			<div className="mt-3 grid gap-2">
				{relationships.length === 0 ? (
					<p className="text-sm text-muted-foreground">
						Keine verknüpften Produktpässe.
					</p>
				) : null}
				{relationships.map((relationship) => {
					const end = otherEnd(relationship);

					return (
						<Link
							className="flex items-center gap-3 rounded-lg border px-3.5 py-2.5 transition-colors hover:bg-muted/50"
							key={relationship.id}
							params={{ dppId: end.dppId }}
							to="/dpps/$dppId"
						>
							<Boxes className="size-4 shrink-0 text-muted-foreground" />
							<div className="min-w-0 flex-1">
								<div className="text-[11px] uppercase tracking-[0.04em] text-muted-foreground">
									{relationshipLabel(relationship)}
								</div>
								<div className="truncate text-sm font-semibold">
									{end.label}
								</div>
							</div>
							<ArrowRight className="size-4 shrink-0 text-muted-foreground" />
						</Link>
					);
				})}
			</div>
		</section>
	);
}
