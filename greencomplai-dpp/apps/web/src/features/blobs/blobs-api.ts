import type { DocumentDownloadResponse, DocumentResponse } from "@dpp/schemas";
import { useMutation } from "@tanstack/react-query";

import { ApiError, apiOrigin, apiRequest } from "#/features/api/client";
import { getActiveOrganizationId } from "#/features/organization/organization-store";

// From the response schema: `storageKey` is deliberately missing there, and
// what isn't in it can't be expected here either.
export type BlobMetadata = DocumentResponse;

// The download behind login goes through two steps: fetch the presigned URL,
// then navigate there. A plain link can't send the organization header - the
// API would answer with ORGANIZATION_REQUIRED and the user would see an error
// instead of their file.
export async function fetchBlobDownloadUrl(
	blobObjectId: string,
): Promise<string> {
	const payload = await apiRequest<{ result: DocumentDownloadResponse }>(
		`/documents/${encodeURIComponent(blobObjectId)}/download-url`,
	);

	return payload.result.url;
}

// The presigned URL returns `Content-Disposition: attachment`, so the browser
// downloads it and stays on the page. No new window: that would fail on the
// popup blocker after the await.
export async function openBlobDownload(blobObjectId: string): Promise<void> {
	window.location.href = await fetchBlobDownloadUrl(blobObjectId);
}

// Anonymous download for the public viewer. Only resolves for files a publish
// has released.
export function publicBlobDownloadUrl(blobObjectId: string): string {
	return `${apiOrigin}/public/documents/${encodeURIComponent(blobObjectId)}/content`;
}

export async function uploadBlob(file: File): Promise<BlobMetadata> {
	const body = new FormData();
	body.append("file", file);

	// No Content-Type header: the browser has to set the multipart boundary.
	const response = await fetch(`${apiOrigin}/documents`, {
		method: "POST",
		credentials: "include",
		headers: { "x-organization-id": getActiveOrganizationId() },
		body,
	});

	const payload = (await response.json().catch(() => undefined)) as
		| { result?: BlobMetadata; messages?: { code?: string; text?: string }[] }
		| undefined;

	// The upload doesn't go through apiRequest: multipart needs the boundary
	// header set by the browser. The error shape is still the same as elsewhere.
	if (!response.ok || !payload?.result) {
		const message = payload?.messages?.[0];
		throw new ApiError(response.status, [
			{
				messageType: response.status >= 500 ? "Exception" : "Error",
				text: message?.text ?? `Upload fehlgeschlagen (${response.status})`,
				code: message?.code ?? "UPLOAD_FAILED",
			},
		]);
	}

	return payload.result;
}

export function useUploadBlob() {
	return useMutation({ mutationFn: uploadBlob });
}

export function formatFileSize(bytes: number): string {
	if (bytes < 1024) return `${bytes} B`;
	const units = ["KB", "MB", "GB"];
	let value = bytes / 1024;
	let unitIndex = 0;
	while (value >= 1024 && unitIndex < units.length - 1) {
		value /= 1024;
		unitIndex += 1;
	}

	return `${new Intl.NumberFormat("de-DE", { maximumFractionDigits: 1 }).format(value)} ${units[unitIndex]}`;
}
