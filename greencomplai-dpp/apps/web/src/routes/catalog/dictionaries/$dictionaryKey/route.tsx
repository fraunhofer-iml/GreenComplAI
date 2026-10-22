import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/catalog/dictionaries/$dictionaryKey")({
	component: DictionaryRouteLayout,
});

function DictionaryRouteLayout() {
	return <Outlet />;
}
