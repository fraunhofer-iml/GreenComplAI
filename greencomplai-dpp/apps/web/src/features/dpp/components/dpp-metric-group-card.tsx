import type { ResolvedMetricGroup } from "../dpp-view";

// Metric group as a card of stat tiles (muted background, label over value),
// following the "Nachhaltigkeitsdaten" section of the design canvas.
export function DppMetricGroupCard({ group }: { group: ResolvedMetricGroup }) {
	return (
		<section className="rounded-xl border bg-card p-5">
			<div className="flex flex-wrap items-baseline justify-between gap-2">
				<h3 className="text-[15px] font-bold">{group.title}</h3>
				<span className="font-mono text-[11px] text-muted-foreground">
					{group.elements.length} Kennzahlen
				</span>
			</div>
			<div className="mt-3.5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
				{group.elements.map((element) => (
					<div className="rounded-lg bg-muted/60 px-3.5 py-3" key={element.id}>
						<div className="text-xs text-muted-foreground">{element.label}</div>
						<div className="mt-1 text-lg font-bold">
							{element.value}
							{element.unit ? (
								<span className="text-sm font-medium text-muted-foreground">
									{" "}
									{element.unit}
								</span>
							) : null}
						</div>
					</div>
				))}
			</div>
		</section>
	);
}
