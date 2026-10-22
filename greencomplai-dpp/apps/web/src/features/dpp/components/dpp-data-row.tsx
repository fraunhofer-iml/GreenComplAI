import { CheckCircle2, ExternalLink, FileText, Lock } from "lucide-react";
import { useState } from "react";

import { Button, buttonVariants } from "#/components/ui/button";
import { openBlobDownload } from "#/features/blobs/blobs-api";
import type { ResolvedElement } from "../dpp-view";

export function DppDataRow({ element }: { element: ResolvedElement }) {
	const Icon =
		element.kind === "document"
			? FileText
			: element.visibility === "public"
				? CheckCircle2
				: Lock;

	return (
		<article className="flex flex-wrap items-center gap-3 border-b px-5 py-3 last:border-b-0">
			<Icon className="size-4 shrink-0 text-muted-foreground" />
			<div className="min-w-0 flex-1">
				<div className="text-[13.5px] font-semibold">{element.label}</div>
				<div className="font-mono text-[11px] text-muted-foreground">
					{element.valueType}
					{element.visibility === "controlled" ? " · controlled" : ""}
				</div>
			</div>
			<ElementValue element={element} />
		</article>
	);
}

function ElementValue({ element }: { element: ResolvedElement }) {
	if (element.kind === "document" && element.url) {
		return (
			<a
				className={buttonVariants({
					className: "shrink-0",
					size: "sm",
					variant: "outline",
				})}
				href={element.url}
				rel="noreferrer"
				target="_blank"
			>
				{element.value}
				<ExternalLink className="size-4" />
			</a>
		);
	}

	if (element.kind === "document" && element.blobObjectId) {
		return (
			<DocumentDownloadButton
				blobObjectId={element.blobObjectId}
				label={element.value}
			/>
		);
	}

	return (
		<strong className="break-words text-right text-sm">
			{element.value}
			{element.unit ? (
				<span className="font-normal text-muted-foreground">
					{" "}
					{element.unit}
				</span>
			) : null}
		</strong>
	);
}

// Fetch the signed URL on click: ordinary navigation cannot send the organization header.
function DocumentDownloadButton({
	blobObjectId,
	label,
}: {
	blobObjectId: string;
	label: string;
}) {
	const [error, setError] = useState<string | undefined>(undefined);
	const [pending, setPending] = useState(false);

	const handleClick = async () => {
		setError(undefined);
		setPending(true);
		try {
			await openBlobDownload(blobObjectId);
		} catch (cause) {
			setError(
				cause instanceof Error ? cause.message : "Download fehlgeschlagen.",
			);
		} finally {
			setPending(false);
		}
	};

	return (
		<div className="flex shrink-0 flex-col items-end gap-1">
			<Button
				className="shrink-0"
				disabled={pending}
				onClick={handleClick}
				size="sm"
				type="button"
				variant="outline"
			>
				{label}
				<ExternalLink className="size-4" />
			</Button>
			{error ? <span className="text-xs text-destructive">{error}</span> : null}
		</div>
	);
}
