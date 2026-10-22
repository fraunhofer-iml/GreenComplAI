import { createFileRoute, redirect } from "@tanstack/react-router";
import { AlertCircle, LogIn, ShieldCheck } from "lucide-react";
import type { FormEvent } from "react";
import { useState } from "react";

import { Alert, AlertDescription, AlertTitle } from "#/components/ui/alert";
import { Button } from "#/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "#/components/ui/card";
import { Input } from "#/components/ui/input";
import { Label } from "#/components/ui/label";
import { authClient } from "#/lib/auth-client";
import { getCachedAuthSession } from "#/lib/auth-functions";

export type LoginSearch = { redirect?: string };

// Declared rather than inferred inline, for the same reason as in
// accept-invite: `beforeLoad` destructures its argument, so inferring both at
// once makes them depend on each other and collapses the search type to `{}`.
function validateSearch(search: Record<string, unknown>): LoginSearch {
	return {
		redirect: typeof search.redirect === "string" ? search.redirect : undefined,
	};
}

export const Route = createFileRoute("/login")({
	beforeLoad: async ({ context }) => {
		const session = await getCachedAuthSession(context.queryClient);
		if (session) {
			throw redirect({ to: "/dashboard" });
		}
	},
	component: LoginPage,
	validateSearch,
});

function LoginPage() {
	const { redirect } = Route.useSearch();
	const [mode, setMode] = useState<"signin" | "signup">("signin");
	const [name, setName] = useState("");
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [submitting, setSubmitting] = useState(false);
	const [awaitingTotp, setAwaitingTotp] = useState(false);
	const [totp, setTotp] = useState("");

	const isSignup = mode === "signup";

	async function handleSubmit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		setError(null);
		setSubmitting(true);

		const request = isSignup
			? authClient.signUp.email({ name, email, password })
			: authClient.signIn.email({ email, password });

		const result = await request.catch((requestError: unknown) => ({
			error: {
				message:
					requestError instanceof Error
						? requestError.message
						: "Die API ist nicht erreichbar.",
			},
		}));

		setSubmitting(false);

		if (result.error) {
			setError(resolveAuthErrorMessage(result.error));
			return;
		}

		// With a second factor enabled, sign-in does not create a session yet: the
		// user is only authenticated once the TOTP code is verified .
		if (
			"data" in result &&
			(result.data as { twoFactorRedirect?: boolean } | null)?.twoFactorRedirect
		) {
			setAwaitingTotp(true);
			return;
		}

		window.location.assign(normalizeRedirect(redirect));
	}

	async function submitTotp(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		setError(null);
		setSubmitting(true);

		const result = await authClient.twoFactor
			.verifyTotp({ code: totp })
			.catch((requestError: unknown) => ({
				error: {
					message:
						requestError instanceof Error
							? requestError.message
							: "Die API ist nicht erreichbar.",
				},
			}));

		setSubmitting(false);

		if (result.error) {
			setError("Der Code wurde nicht akzeptiert. Bitte erneut versuchen.");
			return;
		}

		window.location.assign(normalizeRedirect(redirect));
	}

	return (
		<main className="min-h-screen bg-background">
			<section className="grid min-h-screen place-items-center px-4 py-6">
				<Card className="w-full max-w-md">
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							<ShieldCheck className="size-5" />
							{isSignup ? "Registrierung" : "Anmeldung"}
						</CardTitle>
					</CardHeader>
					<CardContent className="grid gap-5">
						{error ? (
							<Alert variant="destructive">
								<AlertCircle className="size-4" />
								<AlertTitle>
									{isSignup
										? "Registrierung nicht möglich"
										: "Anmeldung nicht möglich"}
								</AlertTitle>
								<AlertDescription>{error}</AlertDescription>
							</Alert>
						) : null}

						{awaitingTotp ? (
							<form className="grid gap-4" onSubmit={submitTotp}>
								<p className="text-sm text-muted-foreground">
									Passwort akzeptiert. Bitte den 6-stelligen Code aus der
									Authenticator-App eingeben.
								</p>
								<div className="grid gap-2">
									<Label htmlFor="totp">Code</Label>
									<Input
										autoComplete="one-time-code"
										autoFocus
										id="totp"
										inputMode="numeric"
										maxLength={6}
										required
										value={totp}
										onChange={(event) => setTotp(event.target.value)}
									/>
								</div>
								<Button disabled={submitting || totp.length < 6} type="submit">
									<LogIn className="size-4" />
									{submitting ? "Wird geprüft …" : "Bestätigen"}
								</Button>
							</form>
						) : (
							<form className="grid gap-4" onSubmit={handleSubmit}>
								{isSignup ? (
									<div className="grid gap-2">
										<Label htmlFor="name">Name</Label>
										<Input
											autoComplete="name"
											id="name"
											required
											value={name}
											onChange={(event) => setName(event.target.value)}
										/>
									</div>
								) : null}
								<div className="grid gap-2">
									<Label htmlFor="email">E-Mail</Label>
									<Input
										autoComplete="email"
										id="email"
										required
										type="email"
										value={email}
										onChange={(event) => setEmail(event.target.value)}
									/>
								</div>
								<div className="grid gap-2">
									<Label htmlFor="password">Passwort</Label>
									<Input
										autoComplete={
											isSignup ? "new-password" : "current-password"
										}
										id="password"
										required
										minLength={isSignup ? 12 : undefined}
										type="password"
										value={password}
										onChange={(event) => setPassword(event.target.value)}
									/>
									{isSignup ? (
										<p className="text-xs text-muted-foreground">
											Mindestens 12 Zeichen. Registrierung nur mit gültiger
											Einladung möglich.
										</p>
									) : null}
								</div>
								<Button className="w-full" disabled={submitting} type="submit">
									<LogIn className="size-4" />
									{submitting
										? isSignup
											? "Registrieren..."
											: "Anmelden..."
										: isSignup
											? "Registrieren"
											: "Einloggen"}
								</Button>
							</form>
						)}

						<button
							type="button"
							className="text-sm text-muted-foreground underline-offset-4 hover:underline"
							hidden={awaitingTotp}
							onClick={() => {
								setError(null);
								setMode(isSignup ? "signin" : "signup");
							}}
						>
							{isSignup
								? "Bereits ein Konto? Zur Anmeldung"
								: "Einladung erhalten? Konto erstellen"}
						</button>
					</CardContent>
				</Card>
			</section>
		</main>
	);
}

function normalizeRedirect(value?: string) {
	if (!value || !value.startsWith("/") || value.startsWith("//"))
		return "/dashboard";
	return value;
}

function resolveAuthErrorMessage(error: {
	code?: string | null;
	message?: string | null;
	status?: number;
}) {
	if (error.code === "REGISTRATION_INVITE_ONLY" || error.status === 403) {
		return "Registrierung nur mit gültiger Einladung möglich. Bitte wende dich an einen Administrator.";
	}
	if (error.status === 401) return "E-Mail oder Passwort ist nicht korrekt.";
	if (error.message) return error.message;
	return "Die Anmeldung ist fehlgeschlagen. Prüfe, ob die API läuft und ob du die Web-App ueber localhost:5173 oder eine konfigurierte WEB_ORIGINS-Origin geoeffnet hast.";
}
