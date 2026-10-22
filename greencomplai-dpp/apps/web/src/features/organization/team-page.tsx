import { Link } from "@tanstack/react-router";
import { Copy, Loader2, ShieldAlert, UserPlus } from "lucide-react";
import { useState } from "react";

import { Badge } from "#/components/ui/badge";
import { Button } from "#/components/ui/button";
import { Field, FieldLabel } from "#/components/ui/field";
import { Input } from "#/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "#/components/ui/select";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "#/components/ui/table";
import { AppNavbar } from "#/features/navigation/app-navbar";
import { authClient } from "#/lib/auth-client";
import {
	type CreatedInvitation,
	useChangeMemberRole,
	useChangeMemberStatus,
	useInvitations,
	useInviteMember,
	useMembers,
	useRevokeInvitation,
} from "./members-api";
import { useActiveOrganizationId } from "./organization-store";
import { type OrganizationRole, useOrganizations } from "./organizations-api";
import { TwoFactorSection } from "./two-factor-section";

const roles: OrganizationRole[] = ["admin", "editor", "viewer", "authority"];
const roleLabels: Record<OrganizationRole, string> = {
	admin: "Admin",
	editor: "Editor",
	viewer: "Viewer",
	authority: "Behörde",
};

export function TeamPage() {
	const { data: organizations } = useOrganizations();
	const activeId = useActiveOrganizationId();
	const active =
		organizations?.find((org) => org.id === activeId) ?? organizations?.[0];
	const isAdmin = active?.role === "admin";

	return (
		<div className="min-h-screen bg-background">
			<AppNavbar />
			<main className="mx-auto w-full max-w-[1000px] px-4 py-7 sm:px-6 lg:px-8">
				<div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
					<Link className="hover:text-primary" to="/dashboard">
						Übersicht
					</Link>
					<span aria-hidden>/</span>
					<span className="font-medium text-foreground">Team</span>
				</div>
				<h1 className="mt-2 text-[22px] font-bold tracking-tight">Team</h1>
				<p className="mt-1 text-[13px] text-muted-foreground">
					Mitglieder, Rollen und Einladungen{active ? ` · ${active.name}` : ""}.
				</p>

				{isAdmin ? (
					<ManageBody />
				) : (
					<div className="mt-8 flex items-center gap-3 rounded-xl border bg-card p-5 text-sm text-muted-foreground">
						<ShieldAlert className="size-5 text-muted-foreground" />
						Nur Administratoren können die Organisation verwalten.
					</div>
				)}
			</main>
		</div>
	);
}

function ManageBody() {
	// Enrolment is per user, not per organization: it sits on the team page
	// because that is where access is managed, but it governs one's own account.
	const session = authClient.useSession();
	const twoFactorEnabled = Boolean(
		(session.data?.user as { twoFactorEnabled?: boolean } | undefined)
			?.twoFactorEnabled,
	);
	const members = useMembers(true);
	const invitations = useInvitations(true);
	const changeRole = useChangeMemberRole();
	const changeStatus = useChangeMemberStatus();
	const revoke = useRevokeInvitation();

	return (
		<div className="mt-6 grid gap-6">
			<section className="overflow-hidden rounded-xl border bg-card">
				<div className="border-b px-5 py-3.5">
					<h2 className="text-[15px] font-bold">Mitglieder</h2>
				</div>
				<Table>
					<TableHeader>
						<TableRow className="hover:bg-transparent">
							<TableHead className="px-5">Benutzer</TableHead>
							<TableHead className="px-5">Rolle</TableHead>
							<TableHead className="px-5">Status</TableHead>
							<TableHead className="px-5 text-right">Aktion</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{(members.data ?? []).map((member) => (
							<TableRow key={member.userId}>
								<TableCell className="px-5">
									<div className="font-medium">{member.name ?? "—"}</div>
									<div className="text-xs text-muted-foreground">
										{member.email ?? member.userId}
									</div>
								</TableCell>
								<TableCell className="px-5">
									<Select
										items={roleLabels}
										value={member.role}
										onValueChange={(role) =>
											role &&
											changeRole.mutate({
												userId: member.userId,
												role: role as OrganizationRole,
											})
										}
									>
										<SelectTrigger className="h-8 w-[130px]">
											<SelectValue />
										</SelectTrigger>
										<SelectContent>
											{roles.map((role) => (
												<SelectItem key={role} value={role}>
													{roleLabels[role]}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</TableCell>
								<TableCell className="px-5">
									<Badge
										variant={
											member.status === "active" ? "outline" : "secondary"
										}
									>
										{member.status}
									</Badge>
								</TableCell>
								<TableCell className="px-5 text-right">
									<Button
										disabled={changeStatus.isPending}
										onClick={() =>
											changeStatus.mutate({
												userId: member.userId,
												status:
													member.status === "disabled" ? "active" : "disabled",
											})
										}
										size="sm"
										variant="ghost"
									>
										{member.status === "disabled"
											? "Aktivieren"
											: "Deaktivieren"}
									</Button>
								</TableCell>
							</TableRow>
						))}
					</TableBody>
				</Table>
				{changeRole.isError || changeStatus.isError ? (
					<p className="px-5 py-3 text-sm text-destructive">
						Änderung nicht möglich (z. B. letzter aktiver Admin).
					</p>
				) : null}
			</section>

			<TwoFactorSection enabled={twoFactorEnabled} />

			<InviteSection />

			<section className="overflow-hidden rounded-xl border bg-card">
				<div className="border-b px-5 py-3.5">
					<h2 className="text-[15px] font-bold">Offene Einladungen</h2>
				</div>
				{(invitations.data ?? []).length === 0 ? (
					<p className="p-5 text-sm text-muted-foreground">
						Keine offenen Einladungen.
					</p>
				) : (
					<Table>
						<TableHeader>
							<TableRow className="hover:bg-transparent">
								<TableHead className="px-5">E-Mail</TableHead>
								<TableHead className="px-5">Rolle</TableHead>
								<TableHead className="px-5">Läuft ab</TableHead>
								<TableHead className="px-5 text-right">Aktion</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{(invitations.data ?? []).map((invite) => (
								<TableRow key={invite.id}>
									<TableCell className="px-5">{invite.email}</TableCell>
									<TableCell className="px-5">
										{roleLabels[invite.role]}
									</TableCell>
									<TableCell className="px-5">
										{new Date(invite.expiresAt).toLocaleDateString("de-DE")}
									</TableCell>
									<TableCell className="px-5 text-right">
										<Button
											disabled={revoke.isPending}
											onClick={() => revoke.mutate(invite.id)}
											size="sm"
											variant="ghost"
										>
											Zurückziehen
										</Button>
									</TableCell>
								</TableRow>
							))}
						</TableBody>
					</Table>
				)}
			</section>
		</div>
	);
}

function InviteSection() {
	const invite = useInviteMember();
	const [email, setEmail] = useState("");
	const [role, setRole] = useState<OrganizationRole>("editor");
	const [created, setCreated] = useState<CreatedInvitation>();

	const submit = () => {
		if (!email) return;
		invite.mutate(
			{ email, role },
			{
				onSuccess: (result) => {
					setCreated(result);
					setEmail("");
				},
			},
		);
	};

	return (
		<section className="grid gap-3 rounded-xl border bg-card p-5">
			<h2 className="text-[15px] font-bold">Mitglied einladen</h2>
			<div className="flex flex-col gap-3 sm:flex-row sm:items-end">
				<Field className="flex-1">
					<FieldLabel>E-Mail</FieldLabel>
					<Input
						onChange={(event) => setEmail(event.target.value)}
						placeholder="person@firma.de"
						type="email"
						value={email}
					/>
				</Field>
				<Field className="sm:w-[160px]">
					<FieldLabel>Rolle</FieldLabel>
					<Select
						items={roleLabels}
						onValueChange={(value) =>
							value && setRole(value as OrganizationRole)
						}
						value={role}
					>
						<SelectTrigger>
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							{roles.map((option) => (
								<SelectItem key={option} value={option}>
									{roleLabels[option]}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</Field>
				<Button disabled={!email || invite.isPending} onClick={submit}>
					{invite.isPending ? (
						<Loader2 className="size-4 animate-spin" />
					) : (
						<UserPlus className="size-4" />
					)}
					Einladen
				</Button>
			</div>
			{created ? <InviteLink invitation={created} /> : null}
		</section>
	);
}

function InviteLink({ invitation }: { invitation: CreatedInvitation }) {
	const origin = typeof window !== "undefined" ? window.location.origin : "";
	const link = `${origin}/accept-invite?token=${invitation.token}`;

	return (
		<div className="grid gap-2 rounded-md bg-muted p-3 text-sm">
			<p>
				{invitation.mailDelivered ? (
					<>
						Einladung an <strong>{invitation.email}</strong> verschickt. Falls
						die E-Mail nicht ankommt, hier der Link:
					</>
				) : (
					<>
						Einladung für <strong>{invitation.email}</strong> erstellt. Es ist
						kein E-Mail-Versand konfiguriert — bitte den Link direkt
						weitergeben:
					</>
				)}
			</p>
			<div className="flex items-center gap-2">
				<Input className="font-mono text-xs" readOnly value={link} />
				<Button
					onClick={() => void navigator.clipboard?.writeText(link)}
					size="icon"
					variant="outline"
				>
					<Copy className="size-4" />
				</Button>
			</div>
		</div>
	);
}
