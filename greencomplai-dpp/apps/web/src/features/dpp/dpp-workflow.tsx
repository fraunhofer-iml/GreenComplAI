import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
	AlertTriangle,
	CheckCircle2,
	GitBranch,
	Loader2,
	Send,
	ShieldCheck,
} from "lucide-react";
import { useState } from "react";

import { Button } from "#/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "#/components/ui/dialog";
import { Textarea } from "#/components/ui/textarea";
import { ApiError, apiRequest } from "#/features/api/client";
import { getActiveOrganizationId } from "#/features/organization/organization-store";
import type { OrganizationRole } from "#/features/organization/organizations-api";

import {
	createDppRevision,
	type TransitionAction,
	transitionDpp,
	type ValidationReport,
} from "./dpp-edit-api";
import type { DppStatus } from "./dpp-view";

type WorkflowAction = TransitionAction | "new-revision";

type ActionConfig = {
	action: WorkflowAction;
	label: string;
	title: string;
	description: string;
	commentLabel?: string;
	requiresValidation?: boolean;
	variant?: "default" | "outline" | "destructive";
	icon: React.ReactNode;
};

const actionConfigs: Record<WorkflowAction, ActionConfig> = {
	"new-revision": {
		action: "new-revision",
		label: "Neue Revision erstellen",
		title: "Neue Revision erstellen",
		description:
			"Die veröffentlichte Version bleibt unverändert öffentlich erreichbar. Es wird ein neuer Entwurf zur Bearbeitung erstellt, der nach Freigabe zur aktiven Version wird.",
		icon: <GitBranch className="size-4" />,
	},
	"submit-review": {
		action: "submit-review",
		label: "Zur Prüfung einreichen",
		title: "Zur Prüfung einreichen",
		description:
			"Der Produktpass wird zur Freigabe an einen Administrator übergeben.",
		commentLabel: "Kommentar für die Prüfung (optional)",
		icon: <Send className="size-4" />,
	},
	"return-to-draft": {
		action: "return-to-draft",
		label: "Zurück in Entwurf",
		title: "Zurück in den Entwurf",
		description: "Der Produktpass wird zur Überarbeitung zurückgegeben.",
		commentLabel: "Grund der Rückgabe (optional)",
		variant: "outline",
		icon: <Send className="size-4 rotate-180" />,
	},
	publish: {
		action: "publish",
		label: "Veröffentlichen",
		title: "Produktpass veröffentlichen",
		description:
			"Nach der Freigabe entsteht eine unveränderliche, öffentliche Version.",
		requiresValidation: true,
		icon: <ShieldCheck className="size-4" />,
	},
	archive: {
		action: "archive",
		label: "Archivieren",
		title: "Produktpass archivieren",
		description: "Archivierte Pässe sind nicht mehr aktiv.",
		commentLabel: "Archivierungsgrund (optional)",
		variant: "destructive",
		icon: <AlertTriangle className="size-4" />,
	},
};

function availableActions(
	status: DppStatus,
	role: OrganizationRole,
): WorkflowAction[] {
	const isAdmin = role === "admin";
	const canEdit = isAdmin || role === "editor";
	switch (status) {
		case "draft":
			return [
				...(canEdit ? (["submit-review"] as const) : []),
				...(isAdmin ? (["archive"] as const) : []),
			];
		case "review":
			return [
				...(isAdmin ? (["publish"] as const) : []),
				...(canEdit ? (["return-to-draft"] as const) : []),
				...(isAdmin ? (["archive"] as const) : []),
			];
		case "published":
			// A published version is immutable, but the DPP as a business object can
			// be updated by drafting a new revision (prEN 18222 UpdateDPPById).
			return [
				...(canEdit ? (["new-revision"] as const) : []),
				...(isAdmin ? (["archive"] as const) : []),
			];
		default:
			return [];
	}
}

const statusLabels: Record<DppStatus, string> = {
	draft: "Entwurf",
	review: "In Prüfung",
	published: "Veröffentlicht",
	archived: "Archiviert",
};

export function DppWorkflowCard({
	dppId,
	status,
	role,
}: {
	dppId: string;
	status: DppStatus;
	role: OrganizationRole;
}) {
	const [open, setOpen] = useState<WorkflowAction>();
	const actions = availableActions(status, role);

	return (
		<div className="rounded-xl border bg-card p-4">
			<div className="mb-3 flex items-center justify-between">
				<h3 className="text-sm font-semibold">Workflow</h3>
				<span className="text-xs text-muted-foreground">
					{statusLabels[status]}
				</span>
			</div>
			{actions.length === 0 ? (
				<p className="text-xs text-muted-foreground">
					Keine Aktionen für deine Rolle in diesem Status verfügbar.
				</p>
			) : (
				<div className="grid gap-2">
					{actions.map((action) => {
						const config = actionConfigs[action];
						return (
							<Button
								className="w-full justify-start"
								key={action}
								onClick={() => setOpen(action)}
								variant={config.variant ?? "default"}
							>
								{config.icon}
								{config.label}
							</Button>
						);
					})}
				</div>
			)}

			{open ? (
				<WorkflowDialog
					config={actionConfigs[open]}
					dppId={dppId}
					onClose={() => setOpen(undefined)}
				/>
			) : null}
		</div>
	);
}

function WorkflowDialog({
	config,
	dppId,
	onClose,
}: {
	config: ActionConfig;
	dppId: string;
	onClose: () => void;
}) {
	const queryClient = useQueryClient();
	const [comment, setComment] = useState("");
	const [error, setError] = useState<string>();

	const validation = useQuery({
		queryKey: ["dpp-validation", getActiveOrganizationId(), dppId],
		queryFn: async () =>
			(
				await apiRequest<{ report: ValidationReport }>(
					`/dpps/${encodeURIComponent(dppId)}/validation`,
				)
			).report,
		enabled: config.requiresValidation === true,
	});

	const mutation = useMutation({
		mutationFn: () =>
			config.action === "new-revision"
				? createDppRevision(dppId)
				: transitionDpp(dppId, config.action, comment.trim() || undefined),
		onSuccess: async () => {
			await Promise.all([
				queryClient.invalidateQueries({ queryKey: ["dpp-view"] }),
				queryClient.invalidateQueries({ queryKey: ["dpp-timeline"] }),
				queryClient.invalidateQueries({ queryKey: ["dpp-versions"] }),
				queryClient.invalidateQueries({ queryKey: ["dpp-list"] }),
			]);
			onClose();
		},
		onError: (err) =>
			setError(err instanceof ApiError ? err.message : "Aktion fehlgeschlagen"),
	});

	const report = validation.data;
	// For publish, only enable once validation has confirmed the snapshot is valid
	// (also blocks while the report is still loading).
	const blockedByValidation =
		config.requiresValidation === true && report?.valid !== true;

	return (
		<Dialog onOpenChange={(next) => !next && onClose()} open>
			<DialogContent className="sm:max-w-lg">
				<DialogHeader>
					<DialogTitle>{config.title}</DialogTitle>
					<DialogDescription>{config.description}</DialogDescription>
				</DialogHeader>

				{config.requiresValidation ? (
					<ValidationSummary loading={validation.isLoading} report={report} />
				) : null}

				{config.commentLabel ? (
					<div className="grid gap-1.5">
						<span className="text-sm font-medium">{config.commentLabel}</span>
						<Textarea
							onChange={(event) => setComment(event.target.value)}
							rows={3}
							value={comment}
						/>
					</div>
				) : null}

				{error ? <p className="text-sm text-destructive">{error}</p> : null}

				<DialogFooter>
					<Button onClick={onClose} variant="outline">
						Abbrechen
					</Button>
					<Button
						disabled={mutation.isPending || blockedByValidation}
						onClick={() => mutation.mutate()}
						variant={
							config.variant === "destructive" ? "destructive" : "default"
						}
					>
						{mutation.isPending ? (
							<Loader2 className="size-4 animate-spin" />
						) : (
							config.icon
						)}
						{config.label}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

function ValidationSummary({
	loading,
	report,
}: {
	loading: boolean;
	report: ValidationReport | undefined;
}) {
	if (loading) {
		return <p className="text-sm text-muted-foreground">Validierung läuft …</p>;
	}
	if (!report) return null;

	return (
		<div className="grid gap-2 rounded-lg border p-3 text-sm">
			{report.valid ? (
				<div className="flex items-center gap-2 text-primary">
					<CheckCircle2 className="size-4" />
					Validierung bestanden – bereit zur Veröffentlichung.
				</div>
			) : (
				<div className="flex items-center gap-2 font-medium text-destructive">
					<AlertTriangle className="size-4" />
					{report.errors.length} Fehler – Veröffentlichung blockiert.
				</div>
			)}
			{report.errors.length > 0 ? (
				<ul className="grid gap-1">
					{report.errors.slice(0, 8).map((issue) => (
						<li
							key={`${issue.path}:${issue.code}`}
							className="text-xs text-destructive"
						>
							<span className="font-mono">{issue.path}</span> — {issue.message}
						</li>
					))}
				</ul>
			) : null}
			{report.warnings.length > 0 ? (
				<div className="border-t pt-2">
					<div className="text-xs font-medium text-muted-foreground">
						{report.warnings.length} Warnungen
					</div>
					<ul className="mt-1 grid gap-1">
						{report.warnings.slice(0, 5).map((issue) => (
							<li
								key={`${issue.path}:${issue.code}`}
								className="text-xs text-muted-foreground"
							>
								<span className="font-mono">{issue.path}</span> —{" "}
								{issue.message}
							</li>
						))}
					</ul>
				</div>
			) : null}
		</div>
	);
}
