import { cva, type VariantProps } from "class-variance-authority";
import { createContext, useContext, useId, useMemo, useRef } from "react";
import { Label } from "#/components/ui/label.tsx";
import { Separator } from "#/components/ui/separator.tsx";
import { cn } from "#/lib/utils.ts";

function FieldSet({ className, ...props }: React.ComponentProps<"fieldset">) {
	return (
		<fieldset
			data-slot="field-set"
			className={cn(
				"flex flex-col gap-4 has-[>[data-slot=checkbox-group]]:gap-3 has-[>[data-slot=radio-group]]:gap-3",
				className,
			)}
			{...props}
		/>
	);
}

function FieldLegend({
	className,
	variant = "legend",
	...props
}: React.ComponentProps<"legend"> & { variant?: "legend" | "label" }) {
	return (
		<legend
			data-slot="field-legend"
			data-variant={variant}
			className={cn(
				"mb-1.5 font-medium data-[variant=label]:text-sm data-[variant=legend]:text-base",
				className,
			)}
			{...props}
		/>
	);
}

function FieldGroup({ className, ...props }: React.ComponentProps<"div">) {
	return (
		<div
			data-slot="field-group"
			className={cn(
				"group/field-group @container/field-group flex w-full flex-col gap-5 data-[slot=checkbox-group]:gap-3 *:data-[slot=field-group]:gap-4",
				className,
			)}
			{...props}
		/>
	);
}

const fieldVariants = cva(
	"group/field flex w-full gap-2 data-[invalid=true]:text-destructive",
	{
		variants: {
			orientation: {
				vertical: "flex-col *:w-full [&>.sr-only]:w-auto",
				horizontal:
					"flex-row items-center has-[>[data-slot=field-content]]:items-start *:data-[slot=field-label]:flex-auto has-[>[data-slot=field-content]]:[&>[role=checkbox],[role=radio]]:mt-px",
				responsive:
					"flex-col *:w-full @md/field-group:flex-row @md/field-group:items-center @md/field-group:*:w-auto @md/field-group:has-[>[data-slot=field-content]]:items-start @md/field-group:*:data-[slot=field-label]:flex-auto [&>.sr-only]:w-auto @md/field-group:has-[>[data-slot=field-content]]:[&>[role=checkbox],[role=radio]]:mt-px",
			},
		},
		defaultVariants: {
			orientation: "vertical",
		},
	},
);

// A `Field` assigns an id and hands it to its children: `FieldLabel` takes it
// as `htmlFor`, the control as `id`. Without this, the label was just text
// next to the control - clicking it focused nothing, screen readers announced
// an unnamed field, and `getByLabel` could not find it. Wiring this here
// instead of in every form means it cannot be forgotten. An explicit
// `htmlFor`/`id` still takes precedence.
// The id is assigned **once**: a `Field` describes one control, and two
// elements sharing the same `id` would be worse than no link at all - invalid
// HTML, and the label pointing at the wrong one. Whoever asks second gets
// nothing and is left where it would be without this mechanism (a separate
// `id` or `aria-label` is then the caller's responsibility). `Field` is not
// meant for groups of multiple inputs anyway - see `identifier-fields.tsx`.
type FieldControlIdClaim = { claimed: boolean; id: string };

const FieldControlIdContext = createContext<FieldControlIdClaim | undefined>(
	undefined,
);

// For controls: claims the id. The first element gets it, every further one
// gets nothing - two identical `id`s would be invalid HTML.
//
// The outcome is fixed **once** per element. Without this, the link was
// ineffective in development mode: React invokes every render function twice
// there, the second call found the id already claimed, and the second call is
// the one that sticks. A test without StrictMode does not catch this - which
// is why the one in `field.test.tsx` runs with it deliberately.
export function useFieldControlId(explicitId?: string) {
	const claim = useContext(FieldControlIdContext);
	const claimed = useRef<string | null>(null);

	if (explicitId) return explicitId;
	if (claimed.current === null) {
		if (claim && !claim.claimed) {
			claim.claimed = true;
			claimed.current = claim.id;
		} else {
			claimed.current = "";
		}
	}

	return claimed.current || undefined;
}

// For the label: reads the same id without claiming it. It thus points at the
// field's first control - and not at itself, which used to happen when the
// label was counted as a claimant too.
function useFieldLabelTarget(explicitFor?: string) {
	const claim = useContext(FieldControlIdContext);
	return explicitFor ?? claim?.id;
}

function Field({
	className,
	orientation = "vertical",
	...props
}: React.ComponentProps<"fieldset"> & VariantProps<typeof fieldVariants>) {
	const controlId = useId();
	// Once per field, never reset: which element holds the id must not change
	// over the field's lifetime.
	const claim = useMemo(() => ({ claimed: false, id: controlId }), [controlId]);

	return (
		<FieldControlIdContext.Provider value={claim}>
			<fieldset
				data-slot="field"
				data-orientation={orientation}
				className={cn(fieldVariants({ orientation }), className)}
				{...props}
			/>
		</FieldControlIdContext.Provider>
	);
}

function FieldContent({ className, ...props }: React.ComponentProps<"div">) {
	return (
		<div
			data-slot="field-content"
			className={cn(
				"group/field-content flex flex-1 flex-col gap-0.5 leading-snug",
				className,
			)}
			{...props}
		/>
	);
}

function FieldLabel({
	className,
	htmlFor,
	...props
}: React.ComponentProps<typeof Label>) {
	const controlId = useFieldLabelTarget(htmlFor);

	return (
		<Label
			data-slot="field-label"
			htmlFor={controlId}
			className={cn(
				"group/field-label peer/field-label flex w-fit gap-2 leading-snug group-data-[disabled=true]/field:opacity-50 has-data-checked:border-primary/30 has-data-checked:bg-primary/5 has-[>[data-slot=field]]:rounded-lg has-[>[data-slot=field]]:border *:data-[slot=field]:p-2.5 dark:has-data-checked:border-primary/20 dark:has-data-checked:bg-primary/10",
				"has-[>[data-slot=field]]:w-full has-[>[data-slot=field]]:flex-col",
				className,
			)}
			{...props}
		/>
	);
}

function FieldTitle({ className, ...props }: React.ComponentProps<"div">) {
	return (
		<div
			data-slot="field-label"
			className={cn(
				"flex w-fit items-center gap-2 text-sm font-medium group-data-[disabled=true]/field:opacity-50",
				className,
			)}
			{...props}
		/>
	);
}

function FieldDescription({ className, ...props }: React.ComponentProps<"p">) {
	return (
		<p
			data-slot="field-description"
			className={cn(
				"text-left text-sm leading-normal font-normal text-muted-foreground group-has-data-horizontal/field:text-balance [[data-variant=legend]+&]:-mt-1.5",
				"last:mt-0 nth-last-2:-mt-1",
				"[&>a]:underline [&>a]:underline-offset-4 [&>a:hover]:text-primary",
				className,
			)}
			{...props}
		/>
	);
}

function FieldSeparator({
	children,
	className,
	...props
}: React.ComponentProps<"div"> & {
	children?: React.ReactNode;
}) {
	return (
		<div
			data-slot="field-separator"
			data-content={!!children}
			className={cn(
				"relative -my-2 h-5 text-sm group-data-[variant=outline]/field-group:-mb-2",
				className,
			)}
			{...props}
		>
			<Separator className="absolute inset-0 top-1/2" />
			{children && (
				<span
					className="relative mx-auto block w-fit bg-background px-2 text-muted-foreground"
					data-slot="field-separator-content"
				>
					{children}
				</span>
			)}
		</div>
	);
}

function FieldError({
	className,
	children,
	errors,
	...props
}: React.ComponentProps<"div"> & {
	errors?: Array<{ message?: string } | undefined>;
}) {
	const content = useMemo(() => {
		if (children) {
			return children;
		}

		if (!errors?.length) {
			return null;
		}

		const uniqueErrors = [
			...new Map(errors.map((error) => [error?.message, error])).values(),
		];

		if (uniqueErrors?.length === 1) {
			return uniqueErrors[0]?.message;
		}

		return (
			<ul className="ml-4 flex list-disc flex-col gap-1">
				{uniqueErrors.map(
					(error) =>
						error?.message && <li key={error.message}>{error.message}</li>,
				)}
			</ul>
		);
	}, [children, errors]);

	if (!content) {
		return null;
	}

	return (
		<div
			role="alert"
			data-slot="field-error"
			className={cn("text-sm font-normal text-destructive", className)}
			{...props}
		>
			{content}
		</div>
	);
}

export {
	Field,
	FieldLabel,
	FieldDescription,
	FieldError,
	FieldGroup,
	FieldLegend,
	FieldSeparator,
	FieldSet,
	FieldContent,
	FieldTitle,
};
