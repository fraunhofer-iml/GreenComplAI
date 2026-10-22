import { Button } from "#/components/ui/button";
import type { OrganizationRole } from "#/features/organization/organizations-api";

import type { ElementPolicy } from "../dpp-view";

const allRoles: OrganizationRole[] = ["admin", "editor", "viewer", "authority"];

export const roleLabels: Record<OrganizationRole, string> = {
	admin: "Admin",
	authority: "Behörde",
	editor: "Editor",
	viewer: "Viewer",
};

const emptyPolicy: ElementPolicy = { readRoles: [], writeRoles: [] };

// Multi-select for the element access policy (readRoles/writeRoles) as
// toggleable role chips. Emits `undefined` when both lists are empty, so the
// fail-closed hint ("controlled without policy = admin-only") can key off the
// absence of a policy.
export function PolicyPicker({
	disabled = false,
	onChange,
	policy,
}: {
	disabled?: boolean;
	onChange: (policy: ElementPolicy | undefined) => void;
	policy: ElementPolicy | undefined;
}) {
	const current = policy ?? emptyPolicy;

	const toggle = (list: "readRoles" | "writeRoles", role: OrganizationRole) => {
		const values = current[list].includes(role)
			? current[list].filter((entry) => entry !== role)
			: [...current[list], role];
		const next = { ...current, [list]: values };
		onChange(
			next.readRoles.length === 0 && next.writeRoles.length === 0
				? undefined
				: next,
		);
	};

	return (
		<div className="grid gap-2">
			<PolicyRow
				disabled={disabled}
				label="Leserechte"
				onToggle={(role) => toggle("readRoles", role)}
				selected={current.readRoles}
			/>
			<PolicyRow
				disabled={disabled}
				label="Schreibrechte"
				onToggle={(role) => toggle("writeRoles", role)}
				selected={current.writeRoles}
			/>
		</div>
	);
}

function PolicyRow({
	disabled,
	label,
	onToggle,
	selected,
}: {
	disabled: boolean;
	label: string;
	onToggle: (role: OrganizationRole) => void;
	selected: OrganizationRole[];
}) {
	return (
		<div className="flex flex-wrap items-center gap-1.5">
			<span className="w-24 shrink-0 text-xs text-muted-foreground">
				{label}
			</span>
			{allRoles.map((role) => (
				<Button
					disabled={disabled}
					key={role}
					onClick={() => onToggle(role)}
					size="xs"
					type="button"
					variant={selected.includes(role) ? "default" : "outline"}
				>
					{roleLabels[role]}
				</Button>
			))}
		</div>
	);
}
