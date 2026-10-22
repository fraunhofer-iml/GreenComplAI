import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import { Badge } from "#/components/ui/badge";
import { Button } from "#/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "#/components/ui/card";
import { Checkbox } from "#/components/ui/checkbox";
import { ApiError } from "#/features/api/client";

import {
	type EsrsProfile,
	type EsrsProfileConflict,
	getEsrsProfiles,
	setEsrsProfiles,
} from "./catalog-api";

// The requirements as a checkbox list on the dictionary. Checking a box adds
// the parent category and the required datapoints; the dictionary-driven
// editor turns those into fields on the passport.
//
// Deliberately gated behind "Save" instead of applying on click: enabling a
// requirement can fork a pinned dictionary version and creates required
// fields that make drafts unpublishable. Both are consequences you confirm
// together, not something you trigger by accident while scrolling.
export function EsrsProfileCard({ dictionaryKey }: { dictionaryKey: string }) {
	const client = useQueryClient();
	const query = useQuery({
		queryKey: ["catalog", "esrs-profiles", dictionaryKey],
		queryFn: () => getEsrsProfiles(dictionaryKey),
	});

	const [selected, setSelected] = useState<string[]>([]);
	const [error, setError] = useState<string>();
	const [applied, setApplied] = useState<string>();
	const [conflicts, setConflicts] = useState<EsrsProfileConflict[]>([]);

	useEffect(() => {
		if (query.data) setSelected(query.data.enabled);
	}, [query.data]);

	const mutation = useMutation({
		mutationFn: () => setEsrsProfiles(dictionaryKey, selected),
		onSuccess: async (result) => {
			setError(undefined);
			setConflicts(result.conflicts);
			setApplied(
				[
					result.created.length > 0
						? `${result.created.length} Datenpunkte angelegt`
						: "keine neuen Datenpunkte",
					result.forkedTo
						? `neue Wörterbuchversion ${result.forkedTo}, weil die bisherige von veröffentlichten Pässen gebunden ist`
						: undefined,
				]
					.filter(Boolean)
					.join(" · "),
			);
			await client.invalidateQueries({ queryKey: ["catalog"] });
		},
		onError: (cause: unknown) => {
			setApplied(undefined);
			setConflicts([]);
			setError(
				cause instanceof ApiError
					? cause.message
					: "Speichern fehlgeschlagen. Bitte erneut versuchen.",
			);
		},
	});

	const profiles = query.data?.profiles ?? [];
	const dirty =
		JSON.stringify([...selected].sort()) !==
		JSON.stringify([...(query.data?.enabled ?? [])].sort());

	const toggle = (key: string, on: boolean) => {
		setApplied(undefined);
		setConflicts([]);
		setSelected((previous) =>
			on ? [...previous, key] : previous.filter((entry) => entry !== key),
		);
	};

	return (
		<Card>
			<CardHeader>
				<CardTitle>Nachhaltigkeitsberichterstattung (ESRS)</CardTitle>
				<CardDescription>
					Wählen Sie die Anforderungen, zu denen Sie berichten wollen. Die
					zugehörigen Datenpunkte werden als Überkategorie in dieses Wörterbuch
					eingetragen und erscheinen danach als Felder im Produktpass.
				</CardDescription>
			</CardHeader>
			<CardContent className="grid gap-4">
				{query.isLoading ? (
					<p className="text-[13px] text-muted-foreground">
						Anforderungen werden geladen …
					</p>
				) : (
					<div className="grid gap-3">
						{profiles.map((profile) => (
							<EsrsProfileRow
								checked={selected.includes(profile.key)}
								key={profile.key}
								onToggle={(on) => toggle(profile.key, on)}
								profile={profile}
							/>
						))}
					</div>
				)}

				{/* The caveat sits next to the selection, not in a footnote. */}
				<p className="text-[12px] text-muted-foreground">
					Die Profile bilden ab, welche Produktdaten für die genannten
					ESRS-Angaben gebraucht werden — sie sind eine Arbeitshilfe, keine
					Rechtsauskunft. Ein Haken zu entfernen nimmt den Anspruch zurück,
					löscht aber keine Datenpunkte: sie können bereits Werte in Pässen
					tragen.
				</p>

				{error ? (
					<p className="text-[13px] text-destructive" role="alert">
						{error}
					</p>
				) : null}
				{applied ? (
					<p
						className="text-[13px] text-muted-foreground"
						aria-live="polite"
						aria-atomic="true"
					>
						Gespeichert — {applied}.
					</p>
				) : null}

				{/* Neither created nor silently ignored: an entry that already carries
				    this key can mean something entirely different - "weight" might be
				    packaging weight. Silently reinterpreting it would corrupt the
				    tenant's data. */}
				{conflicts.length > 0 ? (
					<div
						className="grid gap-1 rounded-lg border border-amber-300 bg-amber-50 p-3 text-[13px] dark:border-amber-900 dark:bg-amber-950/40"
						aria-live="polite"
						aria-atomic="true"
					>
						<p className="font-semibold">
							{conflicts.length === 1
								? "Ein Datenpunkt wurde nicht angelegt"
								: `${conflicts.length} Datenpunkte wurden nicht angelegt`}
						</p>
						<p className="text-muted-foreground">
							Unter diesen Schlüsseln steht in Ihrem Wörterbuch bereits etwas
							anderes. Sie wurden nicht verändert. Damit die Auswertung sie
							erkennt, tragen Sie am jeweiligen Eintrag die genannte Kennung
							nach — oder benennen Sie Ihren eigenen Eintrag um.
						</p>
						<ul className="grid gap-0.5">
							{conflicts.map((conflict) => (
								<li key={conflict.entryKey}>
									<code>{conflict.entryKey}</code> — erwartete Kennung{" "}
									<code>{conflict.canonicalUri}</code>
									{conflict.existingCanonicalUri
										? `, vorhanden ist ${conflict.existingCanonicalUri}`
										: ", vorhanden ist keine"}
								</li>
							))}
						</ul>
					</div>
				) : null}

				<Button
					className="justify-self-start"
					disabled={!dirty || mutation.isPending}
					onClick={() => mutation.mutate()}
				>
					Auswahl speichern
				</Button>
			</CardContent>
		</Card>
	);
}

function EsrsProfileRow({
	checked,
	onToggle,
	profile,
}: {
	checked: boolean;
	onToggle: (on: boolean) => void;
	profile: EsrsProfile;
}) {
	const required = profile.datapoints.filter((datapoint) => datapoint.required);

	return (
		<label className="flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors hover:bg-muted/40">
			<Checkbox
				checked={checked}
				className="mt-0.5"
				onCheckedChange={(value) => onToggle(Boolean(value))}
			/>
			<div className="grid gap-1">
				<div className="flex flex-wrap items-center gap-2">
					<span className="text-[13.5px] font-semibold">{profile.label}</span>
					<Badge variant="outline">{profile.standard}</Badge>
					{/* As long as the revised ESRS are not in force and the new EFRAG
					    taxonomy is not published, every profile is provisional. */}
					<Badge variant="secondary">vorläufig</Badge>
				</div>
				<p className="text-[13px] text-muted-foreground">
					{profile.description}
				</p>
				<p className="text-[12px] text-muted-foreground">
					{profile.datapoints.length} Datenpunkte, davon {required.length}{" "}
					Pflicht:{" "}
					{profile.datapoints.map((datapoint) => datapoint.name).join(", ")}
				</p>
			</div>
		</label>
	);
}
