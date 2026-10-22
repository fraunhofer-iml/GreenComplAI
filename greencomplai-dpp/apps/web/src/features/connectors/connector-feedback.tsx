import { CheckCircle2 } from "lucide-react";

import { ApiError } from "#/features/api/client";

// What the server said, not what the client assumes: the API delivers its
// rejections as a result envelope with a code, and `ApiError` has already
// turned that code into the sentence for the reader's language.
//
// Shared by the connector's settings and its import screen. Both report the
// outcome of a call in the same place and the same shape; two copies would
// drift on the first change to either.
export function Feedback({
	error,
	success,
}: {
	error: unknown;
	success?: string;
}) {
	if (error instanceof ApiError) {
		return <p className="text-[12.5px] text-destructive">{error.message}</p>;
	}
	if (error) {
		return (
			<p className="text-[12.5px] text-destructive">
				Die Anfrage ist fehlgeschlagen.
			</p>
		);
	}
	if (success) {
		return (
			<p className="flex items-center gap-1.5 text-[12.5px] text-emerald-600 dark:text-emerald-400">
				<CheckCircle2 className="size-3.5" />
				{success}
			</p>
		);
	}

	return null;
}
