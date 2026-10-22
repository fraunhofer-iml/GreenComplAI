import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { AlertCircle, CheckCircle2, Loader2, MailOpen } from "lucide-react";
import { useEffect } from "react";

import { Alert, AlertDescription, AlertTitle } from "#/components/ui/alert";
import { Button } from "#/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "#/components/ui/card";
import { apiOrigin } from "#/features/api/client";
import { setActiveOrganizationId } from "#/features/organization/organization-store";

type AcceptResult = { organizationId: string; role: string };

class AcceptError extends Error {
	readonly code: string;

	constructor(message: string, code: string) {
		super(message);
		this.name = "AcceptError";
		this.code = code;
	}
}

// Accepting cannot go through the tenant-scoped api client: the whole point is
// that the user is not a member of this organization yet, so there is no
// organization to put in the header.
async function acceptInvitation(token: string): Promise<AcceptResult> {
	const response = await fetch(
		`${apiOrigin}/invitations/${encodeURIComponent(token)}/acceptance`,
		{ method: "POST", credentials: "include" },
	);

	const payload = (await response.json().catch(() => undefined)) as
		| { result?: AcceptResult; messages?: { code?: string; text?: string }[] }
		| undefined;

	if (!response.ok || !payload?.result) {
		const message = payload?.messages?.[0];
		throw new AcceptError(
			message?.text ??
				`Einladung konnte nicht angenommen werden (${response.status})`,
			message?.code ?? "ACCEPT_FAILED",
		);
	}

	return payload.result;
}

const messages: Record<string, string> = {
	INVITATION_NOT_FOUND:
		"Diese Einladung existiert nicht oder wurde bereits eingelöst.",
	INVITATION_EXPIRED:
		"Diese Einladung ist abgelaufen. Bitte eine neue anfordern.",
	INVITATION_EMAIL_MISMATCH:
		"Diese Einladung wurde an eine andere E-Mail-Adresse ausgestellt. Bitte mit dem eingeladenen Konto anmelden.",
};

export function AcceptInvitePage({ token }: { token: string | undefined }) {
	const navigate = useNavigate();
	const queryClient = useQueryClient();

	const mutation = useMutation({
		mutationFn: () => acceptInvitation(token ?? ""),
		onSuccess: async (result) => {
			// Land in the organization that was just joined rather than whichever
			// one happened to be active before.
			setActiveOrganizationId(result.organizationId);
			await queryClient.invalidateQueries();
		},
	});

	const { mutate } = mutation;
	useEffect(() => {
		if (token) mutate();
	}, [token, mutate]);

	if (!token) {
		return (
			<Shell>
				<Alert variant="destructive">
					<AlertCircle className="size-4" />
					<AlertTitle>Kein Einladungscode</AlertTitle>
					<AlertDescription>
						Der Link ist unvollständig. Bitte den vollständigen Einladungslink
						verwenden.
					</AlertDescription>
				</Alert>
			</Shell>
		);
	}

	if (mutation.isPending) {
		return (
			<Shell>
				<p className="flex items-center gap-2 text-sm text-muted-foreground">
					<Loader2 className="size-4 animate-spin" />
					Einladung wird geprüft …
				</p>
			</Shell>
		);
	}

	if (mutation.isError) {
		const code =
			mutation.error instanceof AcceptError
				? mutation.error.code
				: "ACCEPT_FAILED";
		return (
			<Shell>
				<Alert variant="destructive">
					<AlertCircle className="size-4" />
					<AlertTitle>Einladung nicht angenommen</AlertTitle>
					<AlertDescription>
						{messages[code] ?? mutation.error.message}
					</AlertDescription>
				</Alert>
				<Button
					className="mt-4"
					onClick={() => navigate({ to: "/dashboard" })}
					variant="outline"
				>
					Zur Übersicht
				</Button>
			</Shell>
		);
	}

	if (mutation.isSuccess) {
		return (
			<Shell>
				<Alert>
					<CheckCircle2 className="size-4" />
					<AlertTitle>Einladung angenommen</AlertTitle>
					<AlertDescription>
						Du bist jetzt Mitglied dieser Organisation (Rolle:{" "}
						{mutation.data.role}).
					</AlertDescription>
				</Alert>
				<Button className="mt-4" onClick={() => navigate({ to: "/dashboard" })}>
					Zur Übersicht
				</Button>
			</Shell>
		);
	}

	return null;
}

function Shell({ children }: { children: React.ReactNode }) {
	return (
		<div className="flex min-h-screen items-center justify-center bg-background px-4">
			<Card className="w-full max-w-md">
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<MailOpen className="size-5 text-primary" />
						Einladung
					</CardTitle>
				</CardHeader>
				<CardContent>{children}</CardContent>
			</Card>
		</div>
	);
}
