import { useSyncExternalStore } from "react";

import { env } from "#/env";

// The active organization is the tenant every API request is scoped to. It is
// selected by the user (OrganizationSwitcher), persisted in localStorage and
// read by the API client at request time via getActiveOrganizationId(). The
// build-time VITE_ORGANIZATION_ID is only a first-run fallback, never the
// authority — a user may belong to several organizations and switch between
// them at runtime.
const STORAGE_KEY = "dpp.activeOrganizationId";
const fallbackOrganizationId = env.VITE_ORGANIZATION_ID ?? "";

function readStored(): string {
	if (typeof window === "undefined") return fallbackOrganizationId;
	return window.localStorage.getItem(STORAGE_KEY) ?? fallbackOrganizationId;
}

let current: string | null = null;
const listeners = new Set<() => void>();

export function getActiveOrganizationId(): string {
	if (current === null) current = readStored();
	return current;
}

export function setActiveOrganizationId(id: string): void {
	const next = id || "";
	if (current === null) current = readStored();
	if (next === current) return;
	current = next;
	if (typeof window !== "undefined") {
		if (next) window.localStorage.setItem(STORAGE_KEY, next);
		else window.localStorage.removeItem(STORAGE_KEY);
	}
	for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
	listeners.add(listener);
	return () => {
		listeners.delete(listener);
	};
}

export function useActiveOrganizationId(): string {
	return useSyncExternalStore(
		subscribe,
		getActiveOrganizationId,
		() => fallbackOrganizationId,
	);
}
