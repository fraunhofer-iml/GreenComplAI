import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";

import { Skeleton } from "#/components/ui/skeleton";

import { entryMeta } from "../dpp-timeline";
import { useDppTimeline } from "../dpp-timeline-api";
import { statusLabel } from "../dpp-view";

// Compact recent-changes card for the DPP detail rail, linking to the full
// timeline page.
export function DppActivityCard({ dppId }: { dppId: string }) {
	const timeline = useDppTimeline(dppId);
	const entries = (timeline.data ?? []).slice(0, 4);

	return (
		// `min-w-0` on the card itself: it sits in a fixed-width grid column, and
		// without this a grid item can grow as wide as its content. A non-wrapping
		// change line would then push the whole right column past the edge.
		<div className="min-w-0 rounded-xl border bg-card p-4">
			<div className="mb-3 flex items-center justify-between">
				<h3 className="text-sm font-semibold">Verlauf</h3>
				<Link
					className="flex items-center gap-1 text-xs font-medium text-primary hover:underline"
					params={{ dppId }}
					to="/dpps/$dppId/timeline"
				>
					Vollständige Timeline
					<ArrowRight className="size-3.5" />
				</Link>
			</div>

			{timeline.isLoading ? (
				<Skeleton className="h-16 w-full" />
			) : entries.length === 0 ? (
				<p className="text-xs text-muted-foreground">Noch keine Änderungen.</p>
			) : (
				<ol className="flex flex-col gap-3">
					{entries.map((entry) => {
						const meta = entryMeta(entry);
						const firstDiff = entry.fieldDiffs[0];
						return (
							<li key={entry.id} className="flex min-w-0 gap-2.5">
								<span className="mt-0.5 flex size-5 flex-none items-center justify-center rounded-full bg-secondary text-secondary-foreground [&_svg]:size-3">
									{meta.icon}
								</span>
								{/* `flex-1` was missing: without a width constraint the element
								    sizes to its content, and `truncate` has nothing to shrink
								    against. */}
								<div className="min-w-0 flex-1">
									<div className="text-[12.5px] font-medium text-foreground">
										{meta.title}
									</div>
									{entry.statusFrom && entry.statusTo ? (
										<div className="text-[11px] text-muted-foreground">
											{statusLabel(entry.statusFrom)} →{" "}
											{statusLabel(entry.statusTo)}
										</div>
									) : firstDiff ? (
										// Two lines instead of one: in a 320px column the field name alone
										// fills the line, and a single-line truncation would show nothing
										// of the change itself anymore.
										<div className="min-w-0">
											<div className="truncate font-mono text-[11px] text-muted-foreground">
												{firstDiff.label}
											</div>
											<div className="truncate font-mono text-[11px] text-muted-foreground">
												{firstDiff.oldValue ?? "—"} →{" "}
												{firstDiff.newValue ?? "—"}
											</div>
										</div>
									) : null}
									<div className="text-[11px] text-muted-foreground">
										{new Date(entry.at).toLocaleDateString("de-DE")}
									</div>
								</div>
							</li>
						);
					})}
				</ol>
			)}
		</div>
	);
}
