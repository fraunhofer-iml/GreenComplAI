import type { SummaryFact } from "../dpp-view";

// "Stammdaten" card in the design language: uppercase micro labels over
// values, arranged in a responsive grid.
export function DppSummaryRail({ facts }: { facts: SummaryFact[] }) {
	return (
		<section
			aria-label="DPP Zusammenfassung"
			className="rounded-xl border bg-card p-5"
		>
			<h2 className="text-[15px] font-bold">Stammdaten</h2>
			<dl className="mt-4 grid gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
				{facts.map((fact) => (
					<div className="min-w-0" key={fact.id}>
						<dt className="text-[11px] font-semibold uppercase tracking-[0.04em] text-muted-foreground">
							{fact.kind === "schema" ? "DPP-Profil" : fact.label}
						</dt>
						<dd className="mt-1 truncate text-sm font-medium">{fact.value}</dd>
					</div>
				))}
			</dl>
		</section>
	);
}
