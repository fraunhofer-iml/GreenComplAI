import { useQuery } from "@tanstack/react-query";
import { ArrowUpCircle } from "lucide-react";

import { Badge } from "#/components/ui/badge";
import { Button } from "#/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "#/components/ui/card";

import {
	type DictionaryUpgradeCandidate,
	getDictionaryUpgrade,
} from "../dpp-edit-api";

// A passport hangs off **one** dictionary version, deliberately: the meaning
// of its fields must not change because someone edited the dictionary later.
// The price is that new datapoints - say from a newly checked ESRS
// requirement - do not arrive on their own.
//
// This card is the way there. It only appears when there is actually
// something to gain, and it states **upfront** what the upgrade costs: new
// required fields block publishing, dropped entries lose their mapping. The
// upgrade happens in a draft; the published passport stays as it shipped.
export function DictionaryUpgradeCard({
	currentVersion,
	dppId,
	onApply,
}: {
	currentVersion: string;
	dppId: string;
	// If the callback is missing, the passport is not currently editable: the
	// notice is shown but not the button. Upgrading happens in a revision.
	onApply?: (dppSchemaVersion: string) => void;
}) {
	const query = useQuery({
		queryKey: ["dpp-dictionary-upgrade", dppId],
		queryFn: () => getDictionaryUpgrade(dppId),
	});

	// A check that fails must not just disappear - otherwise "no new version"
	// looks the same as "could not check".
	if (query.isError) {
		return (
			<p className="text-[13px] text-destructive" role="alert">
				Es konnte nicht geprüft werden, ob eine neuere Wörterbuchversion
				vorliegt. Bitte die Seite neu laden.
			</p>
		);
	}

	const candidates = query.data?.candidates ?? [];
	if (candidates.length === 0) return null;

	// The newest one first - it is usually the one meant.
	const newest = candidates[candidates.length - 1];
	if (!newest) return null;

	return (
		<Card className="border-primary/40">
			<CardHeader>
				<div className="flex flex-wrap items-center gap-2">
					<ArrowUpCircle className="size-4 text-primary" />
					<CardTitle>Neuere Wörterbuchversion verfügbar</CardTitle>
					<Badge variant="outline">
						{currentVersion} → {newest.version}
					</Badge>
				</div>
				<CardDescription>
					Dieser Pass ist an Version {currentVersion} gebunden. Änderungen am
					Wörterbuch — etwa neu angehakte ESRS-Anforderungen — landen in einer
					neuen Version und erreichen den Pass erst mit der Umstellung.
				</CardDescription>
			</CardHeader>
			<CardContent className="grid gap-3">
				<UpgradeSummary candidate={newest} />

				{onApply ? (
					<>
						<Button
							className="justify-self-start"
							onClick={() => onApply(newest.dppSchemaVersion)}
							type="button"
						>
							Auf {newest.version} umstellen
						</Button>
						{/* The upgrade is a change like any other: it only takes effect
						    once saved. */}
						<p className="text-[12px] text-muted-foreground">
							Die Umstellung wird mit dem nächsten Speichern wirksam. Der
							bereits veröffentlichte Stand dieses Passes bleibt unverändert.
						</p>
					</>
				) : (
					// A published passport is immutable. The upgrade belongs in a
					// revision and takes effect with the next publish.
					<p className="text-[12px] text-muted-foreground">
						Zum Umstellen eine neue Revision anlegen und sie dort im Editor
						übernehmen.
					</p>
				)}
			</CardContent>
		</Card>
	);
}

function UpgradeSummary({
	candidate,
}: {
	candidate: DictionaryUpgradeCandidate;
}) {
	const { added, removed, requiredMissing, typeChanged } = candidate.diff;
	const removedInUse = removed.filter((entry) => entry.usedByPassport);

	return (
		<div className="grid gap-2 text-[13px]">
			{added.length > 0 ? (
				<p>
					<span className="font-semibold">
						{added.length} neue{added.length === 1 ? "r" : ""} Datenpunkt
						{added.length === 1 ? "" : "e"}
					</span>{" "}
					stehen danach als Felder bereit:{" "}
					{added
						.slice(0, 6)
						.map((entry) => entry.entryKey)
						.join(", ")}
					{added.length > 6 ? " …" : ""}
				</p>
			) : null}

			{/* The part that carries the decision: afterwards the passport cannot
			    be published again until these fields are filled. */}
			{requiredMissing.length > 0 ? (
				<p className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 dark:border-amber-900 dark:bg-amber-950/40">
					<span className="font-semibold">
						{requiredMissing.length} Pflichtfeld
						{requiredMissing.length === 1 ? "" : "er"}
					</span>{" "}
					{requiredMissing.length === 1 ? "ist" : "sind"} danach leer:{" "}
					{requiredMissing.slice(0, 6).join(", ")}
					{requiredMissing.length > 6 ? " …" : ""}. Bis
					{requiredMissing.length === 1 ? " es" : " sie"} ausgefüllt{" "}
					{requiredMissing.length === 1 ? "ist" : "sind"}, lässt sich der Pass
					nicht veröffentlichen.
				</p>
			) : null}

			{removedInUse.length > 0 ? (
				<p className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 dark:border-amber-900 dark:bg-amber-950/40">
					<span className="font-semibold">
						{removedInUse.length} Datenpunkt
						{removedInUse.length === 1 ? "" : "e"}
					</span>{" "}
					{removedInUse.length === 1 ? "ist" : "sind"} in der neuen Version
					nicht mehr enthalten:{" "}
					{removedInUse.map((entry) => entry.entryKey).join(", ")}. Die Werte
					bleiben im Pass stehen, verlieren aber ihre Zuordnung zum Wörterbuch.
				</p>
			) : null}

			{typeChanged.length > 0 ? (
				<p>
					Geänderte Werttypen:{" "}
					{typeChanged
						.map(
							(change) => `${change.entryKey} (${change.from} → ${change.to})`,
						)
						.join(", ")}
					. Gespeicherte Werte können dadurch ungültig werden.
				</p>
			) : null}
		</div>
	);
}
