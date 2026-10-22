import { type DppStatus, statusLabel } from "../dpp-view";

const statusPillClasses: Record<DppStatus, string> = {
	archived: "bg-muted text-muted-foreground",
	draft: "border text-muted-foreground",
	published: "bg-secondary text-secondary-foreground",
	review: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
};

export function DppStatusPill({
	status,
	versionLabel,
}: {
	status: DppStatus;
	versionLabel?: string | null | undefined;
}) {
	return (
		<span
			className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11.5px] font-semibold ${statusPillClasses[status]}`}
		>
			{statusLabel(status)}
			{versionLabel ? (
				<span className="font-mono font-normal opacity-70">{versionLabel}</span>
			) : null}
		</span>
	);
}

// A DPP's published version and its open revision are two independent facts: a
// passport can be `draft` on 2026.2 while 2026.1 stays published and publicly
// reachable. Showing only the working status made a published passport look like
// an unpublished draft (G62).
export function DppVersionStatus({
	publishedVersionLabel,
	status,
	versionLabel,
}: {
	publishedVersionLabel?: string | null | undefined;
	status: DppStatus;
	versionLabel?: string | null | undefined;
}) {
	// Archiving withdraws the passport from the public surface, so a previously
	// published version must not still be advertised as published.
	const showsPublished =
		Boolean(publishedVersionLabel) &&
		status !== "published" &&
		status !== "archived";

	return (
		<span className="inline-flex flex-wrap items-center gap-1.5">
			{showsPublished ? (
				<DppStatusPill
					status="published"
					versionLabel={publishedVersionLabel}
				/>
			) : null}
			<DppStatusPill status={status} versionLabel={versionLabel} />
		</span>
	);
}
