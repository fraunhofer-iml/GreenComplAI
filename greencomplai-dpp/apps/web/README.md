# Web application

React dashboard and anonymous product passport viewer, built with TanStack
Start, Router and Query, Vite, Nitro and Tailwind CSS. Better Auth handles
sessions through the API. This application is part of the pnpm workspace;
install dependencies from the repository root.

## Development

From the workspace root, copy `.env.example` to `.env`, then run:

```sh
pnpm install --frozen-lockfile
pnpm dev
```

The UI runs at `http://localhost:5173` and the API at `http://localhost:3000`.
Use `pnpm --filter web dev` only when the API and infrastructure are already
running. See the [architecture guide](../../docs/architecture.md) for package
boundaries and [CONTRIBUTING.md](../../CONTRIBUTING.md) for checks.

## Source map

- `src/routes`: file-based routes and route guards.
- `src/features`: API clients, queries and screens grouped by feature.
- `src/components`: shared UI components.
- `src/lib`: authentication and deployment helpers.
- `messages`: English and German Paraglide messages.
- `src/paraglide` and `src/routeTree.gen.ts`: generated output; do not edit manually.

API calls use `src/features/api/client.ts`. Include the verified organization's
selection in authenticated requests; the API independently checks access.
Public viewer requests use the public API without an authenticated session.

## API origin

`API_ORIGIN` supplies the browser-facing API address at runtime. Server rendering
injects it before client modules initialize, so one image can serve different
installations. `API_ORIGIN_INTERNAL` overrides the address used by server-side
requests. `VITE_API_ORIGIN` is the build-time development fallback.

Do not put secrets in `VITE_*` variables: their values are client-visible.
Do not modify compiled assets to inject configuration, because Nitro records
asset metadata in its server bundle.

## Translations and errors

Comments and documentation use English. UI translations remain in
`messages/en.json` and `messages/de.json`. `pnpm --filter web codegen` regenerates
Paraglide output; development and build commands also generate it.

The API returns stable error codes with a fallback message.
`src/features/api/error-messages.ts` maps known codes to localized messages.
Retain the API fallback for unknown codes so the client can work with a newer API.

## Checks and production

```sh
pnpm --filter web typecheck
pnpm --filter web lint
pnpm --filter web format:check
pnpm --filter web test
pnpm --filter web build
```

Biome formats and lints this app. The root Prettier configuration excludes it.
The production build lives in `.output`; run it with
`node .output/server/index.mjs`. The Dockerfile uses the workspace root as its
build context. Browser and container tests live in `apps/e2e`.

## Shared UI styles

`src/vendor/shadcn-tailwind.css` contains the shadcn 4.7.0 stylesheet used by the
existing components. Its MIT license is kept alongside it. The shadcn generator
CLI is not installed as an application dependency; run it separately when adding
components. The stylesheet is imported locally from `src/styles.css`.
