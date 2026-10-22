import type { UseQueryResult } from "@tanstack/react-query";
import { AlertTriangle, Leaf, Printer } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";

import { Badge } from "#/components/ui/badge";
import { Button } from "#/components/ui/button";
import { Skeleton } from "#/components/ui/skeleton";
import { ApiError } from "#/features/api/client";
import { DppDynamicCards } from "#/features/dpp/components/dpp-dynamic-cards";
import { DppSummaryRail } from "#/features/dpp/components/dpp-summary-rail";
import { resolveDpp } from "#/features/dpp/dpp-view";

import type { PublicDppPayload } from "./public-api";

function PublicShell({ children }: { children: React.ReactNode }) {
	return (
		<div className="min-h-screen bg-background">
			<header className="flex h-14 items-center gap-2.5 bg-[#12291d] px-4 text-white lg:px-7 print:hidden">
				<span className="flex size-6.5 items-center justify-center rounded-[7px] bg-[#35c477] text-[13px] font-extrabold text-[#12291d]">
					G
				</span>
				<span className="text-[15px] font-bold tracking-tight">
					GreenComplai
				</span>
				<span className="ml-2 rounded border border-white/20 px-1.5 py-px font-mono text-[10.5px] text-[#9db3a6]">
					Öffentlicher Produktpass
				</span>
			</header>
			<main className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6">
				{children}
			</main>
			<footer className="mx-auto w-full max-w-4xl px-4 pb-10 text-center text-xs text-muted-foreground sm:px-6">
				Digitaler Produktpass · bereitgestellt mit GreenComplai
			</footer>
		</div>
	);
}

export function PublicDppScreen({
	query,
}: {
	query: UseQueryResult<PublicDppPayload>;
}) {
	if (query.isLoading) {
		return (
			<PublicShell>
				<Skeleton className="h-40 w-full" />
				<Skeleton className="mt-4 h-64 w-full" />
			</PublicShell>
		);
	}

	if (query.error || !query.data) {
		const ambiguous =
			query.error instanceof ApiError &&
			query.error.code === "PUBLIC_DPP_AMBIGUOUS";
		return (
			<PublicShell>
				<div className="flex items-center gap-3 rounded-xl border bg-card p-6 text-sm">
					<AlertTriangle className="size-5 text-muted-foreground" />
					<div>
						<div className="font-semibold">Produktpass nicht verfügbar</div>
						<p className="mt-1 text-muted-foreground">
							{ambiguous
								? "Diese Produkt-ID ist mehrdeutig. Bitte den direkten Pass-Link (DPP-ID) verwenden."
								: "Der angeforderte Produktpass ist nicht veröffentlicht oder existiert nicht."}
						</p>
					</div>
				</div>
			</PublicShell>
		);
	}

	return <PublicDppView payload={query.data} />;
}

function PublicDppView({ payload }: { payload: PublicDppPayload }) {
	const model = resolveDpp(payload, "public");
	// Always the deterministic passport URL, never the current address: reaching
	// this view via /p/{productId} means the QR would otherwise carry a product
	// identifier that is only unique per organization .
	const canonicalUrl =
		typeof window === "undefined"
			? ""
			: `${window.location.origin}/dpp/${payload.publicId}`;

	return (
		<PublicShell>
			<section className="grid gap-6 rounded-xl border bg-card p-6 sm:grid-cols-[1fr_auto] sm:items-start">
				<div className="min-w-0">
					<div className="flex flex-wrap items-center gap-2">
						<Badge variant="secondary">Veröffentlicht</Badge>
						<span className="flex items-center gap-1 text-xs text-muted-foreground">
							<Leaf className="size-3.5 text-primary" />
							{model.dpp.dppSchemaVersion}
						</span>
					</div>
					<h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
						{model.dpp.productId}
					</h1>
					<p className="mt-1 break-all font-mono text-xs text-muted-foreground">
						{model.dpp.digitalProductPassportId}
					</p>
					<div className="mt-4 flex gap-4 text-sm">
						<span>
							<span className="font-semibold">{model.publicCount}</span>{" "}
							<span className="text-muted-foreground">
								öffentliche Datenpunkte
							</span>
						</span>
						<span>
							<span className="font-semibold">
								{model.relationships.length}
							</span>{" "}
							<span className="text-muted-foreground">Beziehungen</span>
						</span>
					</div>
				</div>
				<div className="flex flex-col items-center gap-2 print:hidden">
					<div className="rounded-lg border bg-white p-2">
						<QRCodeSVG size={116} value={canonicalUrl} />
					</div>
					<Button onClick={() => window.print()} size="sm" variant="outline">
						<Printer className="size-4" />
						Drucken
					</Button>
				</div>
			</section>

			<section className="mt-6">
				<DppSummaryRail facts={model.summaryFacts} />
			</section>

			<section className="mt-6">
				<DppDynamicCards
					collections={model.collections}
					core={model.core}
					metricGroups={model.metricGroups}
				/>
			</section>
		</PublicShell>
	);
}
