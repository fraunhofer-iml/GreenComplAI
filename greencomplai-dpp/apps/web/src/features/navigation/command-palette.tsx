import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { BookOpen, Database, LayoutDashboard, Package } from "lucide-react";
import { useEffect, useState } from "react";

import {
	Command,
	CommandDialog,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
} from "#/components/ui/command";
import { listDpps } from "#/features/dashboard/dashboard-api";

export function CommandPalette({
	open,
	onOpenChange,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
}) {
	const navigate = useNavigate();
	const [query, setQuery] = useState("");

	// Global ⌘K / Ctrl+K toggle.
	useEffect(() => {
		const handler = (event: KeyboardEvent) => {
			if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
				event.preventDefault();
				onOpenChange(!open);
			}
		};
		document.addEventListener("keydown", handler);
		return () => document.removeEventListener("keydown", handler);
	}, [open, onOpenChange]);

	const results = useQuery({
		queryKey: ["command-search", query],
		queryFn: () => listDpps({ search: query, limit: 8 }),
		enabled: open && query.trim().length >= 1,
	});

	const go = (action: () => void) => {
		onOpenChange(false);
		setQuery("");
		action();
	};

	const dpps = results.data?.dpps ?? [];

	return (
		<CommandDialog
			open={open}
			onOpenChange={onOpenChange}
			title="Suche"
			description="Produktpässe suchen oder navigieren"
		>
			<Command shouldFilter={false}>
				<CommandInput
					onValueChange={setQuery}
					placeholder="Produktpässe suchen oder navigieren …"
					value={query}
				/>
				<CommandList>
					<CommandEmpty>
						{query.trim().length >= 1
							? "Keine Treffer."
							: "Tippen zum Suchen …"}
					</CommandEmpty>

					{dpps.length > 0 ? (
						<CommandGroup heading="Produktpässe">
							{dpps.map((dpp) => (
								<CommandItem
									key={dpp.digitalProductPassportId}
									value={`dpp:${dpp.digitalProductPassportId}`}
									onSelect={() =>
										go(() =>
											navigate({
												to: "/dpps/$dppId",
												params: { dppId: dpp.publicId },
											}),
										)
									}
								>
									<Package className="size-4" />
									<span className="font-medium">{dpp.productId}</span>
									<span className="ml-auto truncate font-mono text-xs text-muted-foreground">
										{dpp.digitalProductPassportId}
									</span>
								</CommandItem>
							))}
						</CommandGroup>
					) : null}

					<CommandGroup heading="Navigation">
						<CommandItem
							value="nav:dashboard"
							onSelect={() => go(() => navigate({ to: "/dashboard" }))}
						>
							<LayoutDashboard className="size-4" />
							Übersicht
						</CommandItem>
						<CommandItem
							value="nav:dpps"
							onSelect={() => go(() => navigate({ to: "/dpps" }))}
						>
							<Package className="size-4" />
							Produktpässe
						</CommandItem>
						<CommandItem
							value="nav:operators"
							onSelect={() => go(() => navigate({ to: "/catalog/operators" }))}
						>
							<Database className="size-4" />
							Wirtschaftsakteure
						</CommandItem>
						<CommandItem
							value="nav:dictionaries"
							onSelect={() =>
								go(() => navigate({ to: "/catalog/dictionaries" }))
							}
						>
							<BookOpen className="size-4" />
							Dictionaries
						</CommandItem>
					</CommandGroup>
				</CommandList>
			</Command>
		</CommandDialog>
	);
}
