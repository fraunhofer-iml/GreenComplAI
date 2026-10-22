import { useQueryClient } from "@tanstack/react-query";
import { Building2, Check, LogOut } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "#/components/ui/avatar";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "#/components/ui/dropdown-menu";
import { authClient } from "#/lib/auth-client";

import {
	setActiveOrganizationId,
	useActiveOrganizationId,
} from "../organization/organization-store";
import {
	type OrganizationRole,
	useOrganizations,
} from "../organization/organizations-api";

const roleLabels: Record<OrganizationRole, string> = {
	admin: "Admin",
	editor: "Editor",
	viewer: "Viewer",
	authority: "Behörde",
};

function initials(name: string | null | undefined): string {
	if (!name) return "U";
	return name
		.split(/\s+/)
		.slice(0, 2)
		.map((part) => part.charAt(0).toUpperCase())
		.join("");
}

export function UserMenu() {
	const { data: session } = authClient.useSession();
	const queryClient = useQueryClient();
	const { data: organizations } = useOrganizations();
	const activeId = useActiveOrganizationId();

	const user = session?.user;
	const orgs = organizations ?? [];
	const active = orgs.find((org) => org.id === activeId) ?? orgs[0];

	const switchOrg = (id: string) => {
		// Compared against the stored id, not the displayed one: `active` falls
		// back to the first organization for display, so comparing against it
		// swallowed the click that would have stored exactly that selection.
		if (id === activeId) return;
		setActiveOrganizationId(id);
		void queryClient.invalidateQueries();
	};

	return (
		<DropdownMenu>
			<DropdownMenuTrigger
				aria-label="Benutzermenü"
				className="flex size-[30px] items-center justify-center rounded-full outline-none focus-visible:ring-2 focus-visible:ring-[#8fe3b4]"
			>
				<Avatar className="size-[30px]">
					{user?.image ? <AvatarImage alt="" src={user.image} /> : null}
					<AvatarFallback className="bg-[#24513a] text-[11.5px] font-bold text-[#8fe3b4]">
						{initials(user?.name)}
					</AvatarFallback>
				</Avatar>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end" className="w-64">
				<div className="flex flex-col gap-0.5 px-1.5 py-1.5">
					<span className="truncate text-sm font-semibold">
						{user?.name ?? "Angemeldet"}
					</span>
					{user?.email ? (
						<span className="truncate text-xs text-muted-foreground">
							{user.email}
						</span>
					) : null}
				</div>

				{active ? (
					<>
						<DropdownMenuSeparator />
						<DropdownMenuGroup>
							<DropdownMenuLabel className="text-[11px] uppercase tracking-wide">
								Organisation
							</DropdownMenuLabel>
							{orgs.map((org) => (
								<DropdownMenuItem
									key={org.id}
									onClick={() => switchOrg(org.id)}
								>
									<Building2 className="size-4 text-muted-foreground" />
									<span className="truncate">{org.name}</span>
									{org.id === active.id ? (
										<Check className="ml-auto size-4 text-primary" />
									) : (
										<span className="ml-auto text-[11px] text-muted-foreground">
											{roleLabels[org.role]}
										</span>
									)}
								</DropdownMenuItem>
							))}
						</DropdownMenuGroup>
						<div className="px-2 py-1 text-[11px] text-muted-foreground">
							Rolle: {roleLabels[active.role]}
						</div>
					</>
				) : null}

				<DropdownMenuSeparator />
				<DropdownMenuItem
					onClick={() => {
						void authClient
							.signOut()
							.then(() => window.location.assign("/login"));
					}}
					variant="destructive"
				>
					<LogOut className="size-4" />
					Abmelden
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
