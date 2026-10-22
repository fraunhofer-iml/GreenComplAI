import { Link } from "@tanstack/react-router";
import { Search } from "lucide-react";
import type { ComponentProps, ReactNode } from "react";
import { useState } from "react";
import { useActiveOrganizationId } from "#/features/organization/organization-store";
import { useOrganizations } from "#/features/organization/organizations-api";
import { CommandPalette } from "./command-palette";
import { UserMenu } from "./user-menu";

const navItemBase =
	"rounded-[7px] px-[13px] py-[7px] text-[13.5px] transition-colors";
const navActive = "bg-[#35c477]/15 font-semibold text-[#8fe3b4]";
const navInactive = "text-[#9db3a6] hover:text-white";

function NavLink({
	children,
	to,
}: {
	children: ReactNode;
	to: ComponentProps<typeof Link>["to"];
}) {
	return (
		<Link
			activeProps={{ className: `${navItemBase} ${navActive}` }}
			inactiveProps={{ className: `${navItemBase} ${navInactive}` }}
			to={to}
		>
			{children}
		</Link>
	);
}

export function AppNavbar() {
	const [searchOpen, setSearchOpen] = useState(false);
	const { data: organizations } = useOrganizations();
	const activeId = useActiveOrganizationId();
	const active =
		organizations?.find((org) => org.id === activeId) ?? organizations?.[0];
	const isAdmin = active?.role === "admin";

	return (
		<nav className="flex h-14 items-center gap-6 bg-[#12291d] px-4 text-white lg:px-7">
			<Link className="flex items-center gap-2.5" to="/dashboard">
				<span className="flex size-6.5 items-center justify-center rounded-[7px] bg-[#35c477] text-[13px] font-extrabold text-[#12291d]">
					G
				</span>
				<span className="hidden text-[15px] font-bold tracking-tight text-white sm:inline">
					GreenComplai
				</span>
			</Link>

			<div className="flex items-center gap-1 overflow-x-auto">
				<NavLink to="/dashboard">Übersicht</NavLink>
				<NavLink to="/dpps">Produktpässe</NavLink>
				<NavLink to="/catalog/products">Produkte</NavLink>
				<NavLink to="/catalog/facilities">Standorte</NavLink>
				<NavLink to="/catalog/operators">Wirtschaftsakteure</NavLink>
				<NavLink to="/catalog/dictionaries">Dictionaries</NavLink>
				{isAdmin ? <NavLink to="/connectors">Anbindungen</NavLink> : null}
				{isAdmin ? <NavLink to="/team">Team</NavLink> : null}
			</div>

			<div className="ml-auto flex items-center gap-3.5">
				<button
					className="flex items-center gap-2 rounded-[7px] bg-white/[0.09] px-3 py-[7px] text-[12.5px] text-[#9db3a6] transition-colors hover:bg-white/[0.14] sm:w-[250px]"
					onClick={() => setSearchOpen(true)}
					type="button"
				>
					<Search className="size-3.5" />
					<span className="hidden sm:inline">Suchen</span>
					<span className="ml-auto hidden rounded border border-white/20 px-[5px] py-px font-mono text-[10.5px] sm:inline">
						⌘K
					</span>
				</button>
				<UserMenu />
			</div>

			<CommandPalette onOpenChange={setSearchOpen} open={searchOpen} />
		</nav>
	);
}
