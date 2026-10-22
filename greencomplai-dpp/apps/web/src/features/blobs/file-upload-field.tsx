import { Download, Loader2, Paperclip, Trash2, Upload } from "lucide-react";
import { useId, useRef, useState } from "react";

import { Button } from "#/components/ui/button";
import { Field, FieldDescription, FieldLabel } from "#/components/ui/field";

import {
	type BlobMetadata,
	formatFileSize,
	openBlobDownload,
	useUploadBlob,
} from "./blobs-api";

export type UploadedFile = {
	blobObjectId: string;
	contentType: string;
	filename: string;
};

// Upload control for document elements. Uploading is a side effect that happens
// immediately (the file lands in object storage), while the resulting reference
// only reaches the DPP when the surrounding form is saved. An upload that is
// never saved is swept by the orphan cleanup.
export function FileUploadField({
	disabled,
	onChange,
	value,
}: {
	disabled?: boolean;
	onChange: (file: UploadedFile | undefined) => void;
	value: UploadedFile | undefined;
}) {
	const inputId = useId();
	const inputRef = useRef<HTMLInputElement>(null);
	const [error, setError] = useState<string | undefined>(undefined);
	const [size, setSize] = useState<number | undefined>(undefined);
	const upload = useUploadBlob();

	const handleFile = (file: File | undefined) => {
		if (!file) return;
		setError(undefined);
		upload.mutate(file, {
			onSuccess: (blob: BlobMetadata) => {
				setSize(blob.size);
				onChange({
					blobObjectId: blob.id,
					contentType: blob.contentType,
					filename: blob.filename,
				});
			},
			onError: (cause: Error) => setError(cause.message),
		});
	};

	const handleOpen = (blobObjectId: string) => {
		setError(undefined);
		openBlobDownload(blobObjectId).catch((cause: unknown) => {
			setError(
				cause instanceof Error ? cause.message : "Download fehlgeschlagen.",
			);
		});
	};

	const clear = () => {
		setSize(undefined);
		setError(undefined);
		onChange(undefined);
		if (inputRef.current) inputRef.current.value = "";
	};

	const hasFile = Boolean(value?.blobObjectId);

	return (
		<Field>
			<FieldLabel htmlFor={inputId}>Datei</FieldLabel>
			<input
				className="sr-only"
				disabled={disabled || upload.isPending}
				id={inputId}
				onChange={(event) => handleFile(event.target.files?.[0])}
				ref={inputRef}
				type="file"
			/>

			{hasFile && value ? (
				<div className="flex items-center gap-2 rounded-md border border-border bg-muted/40 px-3 py-2">
					<Paperclip className="size-3.5 shrink-0 text-muted-foreground" />
					<span className="truncate text-sm">{value.filename}</span>
					{size === undefined ? null : (
						<span className="shrink-0 text-xs text-muted-foreground">
							{formatFileSize(size)}
						</span>
					)}
					<div className="ml-auto flex shrink-0 items-center gap-1">
						<Button
							// Not a link: the presigned URL is only fetched on click. A
							// navigation can't attach the organization header, and without
							// it the API responds with ORGANIZATION_REQUIRED.
							aria-label={`${value.filename} öffnen`}
							onClick={() => handleOpen(value.blobObjectId)}
							size="xs"
							type="button"
							variant="ghost"
						>
							<Download className="size-3.5" />
							Öffnen
						</Button>
						{disabled ? null : (
							<>
								<Button
									onClick={() => inputRef.current?.click()}
									size="xs"
									type="button"
									variant="ghost"
								>
									Ersetzen
								</Button>
								<Button onClick={clear} size="xs" type="button" variant="ghost">
									<Trash2 className="size-3.5" />
								</Button>
							</>
						)}
					</div>
				</div>
			) : (
				<Button
					disabled={disabled || upload.isPending}
					onClick={() => inputRef.current?.click()}
					size="sm"
					type="button"
					variant="outline"
				>
					{upload.isPending ? (
						<Loader2 className="size-3.5 animate-spin" />
					) : (
						<Upload className="size-3.5" />
					)}
					{upload.isPending ? "Wird hochgeladen…" : "Datei auswählen"}
				</Button>
			)}

			{error ? (
				<FieldDescription className="text-destructive">
					{error}
				</FieldDescription>
			) : (
				<FieldDescription>
					PDF, Bild, CSV, XML oder JSON bis 25 MB. Die Datei wird erst
					öffentlich, wenn der Pass mit einem öffentlichen Dokumentelement
					veröffentlicht wird.
				</FieldDescription>
			)}
		</Field>
	);
}
