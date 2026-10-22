import type {
	CreateDppRelationshipInput,
	DictionaryUpgradeResponse,
	DppValidationIssueResponse,
	DppValidationReportResponse,
} from "@dpp/schemas";

import { apiRequest } from "#/features/api/client";

import type { DppRelationship, DppSnapshot, DppStatus } from "./dpp-view";

// The server merges the snapshot flat over the stored one, so `collections`
// and `dataElements` must always be sent as complete arrays. Identity and
// lifecycle fields are never patchable.
export type DppSnapshotPatch = Partial<
	Omit<DppSnapshot, "digitalProductPassportId" | "lastUpdate" | "status">
>;

export async function patchDpp(
	dppId: string,
	snapshot: DppSnapshotPatch,
): Promise<DppSnapshot> {
	const payload = await apiRequest<{ dpp: DppSnapshot }>(
		`/dpps/${encodeURIComponent(dppId)}`,
		{ body: { snapshot }, method: "PATCH" },
	);
	return payload.dpp;
}

export type DictionaryUpgrade = DictionaryUpgradeResponse;
export type DictionaryUpgradeCandidate =
	DictionaryUpgradeResponse["candidates"][number];

// Which newer dictionary versions exist and what an upgrade would change.
// The upgrade itself then goes through `patchDpp` — the same path as any
// other change to the passport.
export async function getDictionaryUpgrade(
	dppId: string,
): Promise<DictionaryUpgrade> {
	const payload = await apiRequest<{ upgrade: DictionaryUpgrade }>(
		`/dpps/${encodeURIComponent(dppId)}/dictionary-upgrade`,
	);
	return payload.upgrade;
}

export type ValidationIssue = DppValidationIssueResponse;
export type ValidationReport = DppValidationReportResponse;

// The workflow's actions are targets of one status resource, not four verbs.
// The UI still speaks in actions, so the mapping lives here rather than leaking
// status literals into every button.
export type TransitionAction =
	| "submit-review"
	| "return-to-draft"
	| "publish"
	| "archive";

const transitionTargets: Record<TransitionAction, DppStatus> = {
	"submit-review": "review",
	"return-to-draft": "draft",
	publish: "published",
	archive: "archived",
};

export async function transitionDpp(
	dppId: string,
	action: TransitionAction,
	comment?: string,
): Promise<DppSnapshot> {
	const payload = await apiRequest<{ dpp: DppSnapshot }>(
		`/dpps/${encodeURIComponent(dppId)}/status`,
		{
			method: "PUT",
			body: {
				status: transitionTargets[action],
				...(comment ? { comment } : {}),
			},
		},
	);
	return payload.dpp;
}

export async function createDppRevision(dppId: string): Promise<DppSnapshot> {
	const payload = await apiRequest<{ dpp: DppSnapshot }>(
		`/dpps/${encodeURIComponent(dppId)}/revisions`,
		{ method: "POST" },
	);
	return payload.dpp;
}

export async function restoreDppVersion(
	dppId: string,
	versionNumber: number,
): Promise<DppSnapshot> {
	const payload = await apiRequest<{ dpp: DppSnapshot }>(
		`/dpps/${encodeURIComponent(dppId)}/versions/${versionNumber}/restore`,
		{ method: "POST" },
	);
	return payload.dpp;
}

export type CreateRelationshipInput = CreateDppRelationshipInput;

export async function createDppRelationship(
	dppId: string,
	input: CreateRelationshipInput,
): Promise<DppRelationship> {
	const payload = await apiRequest<{ relationship: DppRelationship }>(
		`/dpps/${encodeURIComponent(dppId)}/relationships`,
		{ body: input, method: "POST" },
	);
	return payload.relationship;
}

export async function deleteDppRelationship(
	dppId: string,
	relationshipId: string,
): Promise<void> {
	await apiRequest<unknown>(
		`/dpps/${encodeURIComponent(dppId)}/relationships/${encodeURIComponent(relationshipId)}`,
		{ method: "DELETE" },
	);
}
