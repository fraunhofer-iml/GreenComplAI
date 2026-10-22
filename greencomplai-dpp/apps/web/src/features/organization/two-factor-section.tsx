import { useMutation } from "@tanstack/react-query";
import {
	AlertCircle,
	Check,
	Loader2,
	ShieldCheck,
	ShieldOff,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { useState } from "react";

import { Alert, AlertDescription, AlertTitle } from "#/components/ui/alert";
import { Badge } from "#/components/ui/badge";
import { Button } from "#/components/ui/button";
import { Field, FieldDescription, FieldLabel } from "#/components/ui/field";
import { Input } from "#/components/ui/input";
import { authClient } from "#/lib/auth-client";

type Stage =
	| { kind: "idle" }
	| { kind: "enrolling"; backupCodes: string[]; totpUri: string }
	| { kind: "done"; backupCodes: string[] };

// TOTP enrolment . Better Auth issues the secret and only flips
// twoFactorEnabled once a generated code has been verified — an enrolment that
// is started but never confirmed leaves the account exactly as it was.
export function TwoFactorSection({ enabled }: { enabled: boolean }) {
	const [stage, setStage] = useState<Stage>({ kind: "idle" });
	const [password, setPassword] = useState("");
	const [code, setCode] = useState("");
	const [error, setError] = useState<string>();

	const start = useMutation({
		mutationFn: async () => {
			const result = await authClient.twoFactor.enable({ password });
			if (result.error)
				throw new Error(result.error.message ?? "Aktivierung fehlgeschlagen");
			if (result.data?.method !== "totp")
				throw new Error("TOTP-Aktivierung fehlgeschlagen");
			return result.data;
		},
		onSuccess: (data) => {
			setError(undefined);
			setPassword("");
			setStage({
				kind: "enrolling",
				backupCodes: data.backupCodes,
				totpUri: data.totpURI,
			});
		},
		onError: (cause: Error) => setError(cause.message),
	});

	const verify = useMutation({
		mutationFn: async () => {
			const result = await authClient.twoFactor.verifyTotp({ code });
			if (result.error)
				throw new Error(result.error.message ?? "Code nicht akzeptiert");
		},
		onSuccess: () => {
			setError(undefined);
			setCode("");
			if (stage.kind === "enrolling")
				setStage({ kind: "done", backupCodes: stage.backupCodes });
		},
		onError: (cause: Error) => setError(cause.message),
	});

	const disable = useMutation({
		mutationFn: async () => {
			const result = await authClient.twoFactor.disable({ password });
			if (result.error)
				throw new Error(result.error.message ?? "Deaktivierung fehlgeschlagen");
		},
		onSuccess: () => {
			setError(undefined);
			setPassword("");
			setStage({ kind: "idle" });
			window.location.reload();
		},
		onError: (cause: Error) => setError(cause.message),
	});

	return (
		<section className="grid gap-3 rounded-xl border bg-card p-5">
			<div className="flex flex-wrap items-center gap-2">
				<h2 className="text-[15px] font-bold">Zwei-Faktor-Authentifizierung</h2>
				<Badge variant={enabled ? "secondary" : "outline"}>
					{enabled ? (
						<ShieldCheck className="size-3.5" />
					) : (
						<ShieldOff className="size-3.5" />
					)}
					{enabled ? "Aktiv" : "Nicht aktiv"}
				</Badge>
			</div>

			{error ? (
				<Alert variant="destructive">
					<AlertCircle className="size-4" />
					<AlertTitle>Fehlgeschlagen</AlertTitle>
					<AlertDescription>{error}</AlertDescription>
				</Alert>
			) : null}

			{stage.kind === "idle" && !enabled ? (
				<div className="flex flex-col gap-3 sm:flex-row sm:items-end">
					<Field className="flex-1">
						<FieldLabel>Passwort bestätigen</FieldLabel>
						<Input
							autoComplete="current-password"
							onChange={(event) => setPassword(event.target.value)}
							type="password"
							value={password}
						/>
						<FieldDescription>
							Schützt davor, dass eine übernommene Sitzung einen zweiten Faktor
							einrichtet.
						</FieldDescription>
					</Field>
					<Button
						disabled={!password || start.isPending}
						onClick={() => start.mutate()}
					>
						{start.isPending ? (
							<Loader2 className="size-4 animate-spin" />
						) : null}
						Einrichten
					</Button>
				</div>
			) : null}

			{stage.kind === "idle" && enabled ? (
				<div className="flex flex-col gap-3 sm:flex-row sm:items-end">
					<Field className="flex-1">
						<FieldLabel>Passwort bestätigen</FieldLabel>
						<Input
							autoComplete="current-password"
							onChange={(event) => setPassword(event.target.value)}
							type="password"
							value={password}
						/>
					</Field>
					<Button
						disabled={!password || disable.isPending}
						onClick={() => disable.mutate()}
						variant="outline"
					>
						{disable.isPending ? (
							<Loader2 className="size-4 animate-spin" />
						) : null}
						Deaktivieren
					</Button>
				</div>
			) : null}

			{stage.kind === "enrolling" ? (
				<div className="grid gap-4 sm:grid-cols-[auto_1fr] sm:items-start">
					<div className="rounded-lg border bg-white p-3">
						<QRCodeSVG size={148} value={stage.totpUri} />
					</div>
					<div className="grid gap-3">
						<p className="text-sm text-muted-foreground">
							Mit einer Authenticator-App scannen und den angezeigten Code
							eingeben. Erst danach ist der zweite Faktor aktiv.
						</p>
						<div className="flex flex-col gap-3 sm:flex-row sm:items-end">
							<Field className="sm:w-[200px]">
								<FieldLabel>6-stelliger Code</FieldLabel>
								<Input
									autoComplete="one-time-code"
									inputMode="numeric"
									maxLength={6}
									onChange={(event) => setCode(event.target.value)}
									value={code}
								/>
							</Field>
							<Button
								disabled={code.length < 6 || verify.isPending}
								onClick={() => verify.mutate()}
							>
								{verify.isPending ? (
									<Loader2 className="size-4 animate-spin" />
								) : null}
								Bestätigen
							</Button>
						</div>
						<BackupCodes codes={stage.backupCodes} />
					</div>
				</div>
			) : null}

			{stage.kind === "done" ? (
				<>
					<Alert>
						<Check className="size-4" />
						<AlertTitle>Zwei-Faktor-Authentifizierung aktiv</AlertTitle>
						<AlertDescription>
							Ab der nächsten Anmeldung wird ein Code aus der Authenticator-App
							verlangt.
						</AlertDescription>
					</Alert>
					<BackupCodes codes={stage.backupCodes} />
				</>
			) : null}
		</section>
	);
}

function BackupCodes({ codes }: { codes: string[] }) {
	return (
		<div className="grid gap-2 rounded-md bg-muted p-3">
			<p className="text-sm font-medium">Backup-Codes</p>
			<p className="text-xs text-muted-foreground">
				Jetzt sichern — sie werden nicht erneut angezeigt und sind der einzige
				Weg zurück, wenn das Gerät verloren geht. Jeder Code ist einmal
				verwendbar.
			</p>
			<ul className="grid grid-cols-2 gap-1 font-mono text-xs sm:grid-cols-3">
				{codes.map((code) => (
					<li key={code}>{code}</li>
				))}
			</ul>
		</div>
	);
}
