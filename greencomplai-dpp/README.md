# GreenComplAI DPP

An independently deployable Digital Product Passport application with an
organization dashboard, an HTTP API and an anonymous viewer. It supports
versioned dictionaries, passport review and publication, controlled fields,
documents and read-only imports from external systems.

The existing GreenComplAI application's `dpp-svc` provides its BaSyx integration.
This application is a separate stack with its own authentication and database.
The source is licensed under [Apache-2.0](LICENSE).

## Quick start

Prerequisites: Node.js 22, the pnpm version declared in `package.json`, Docker
Engine and the Compose plugin. Run from the repository root:

```sh
cd greencomplai-dpp
cp .env.example .env
pnpm install --frozen-lockfile
pnpm dev
```

`pnpm dev` builds the storage image from pinned MinIO/MinIO client sources,
starts Postgres and MinIO, applies migrations and starts API and web.
The UI is at `http://localhost:5173`, the API at `http://localhost:3000` and the
MinIO console at `http://localhost:9001`. `/health` reports API liveness;
`/ready` checks the database and object storage.

Registration is invitation-only by default. For a local demo, run
`pnpm db:seed` and sign in with the development credentials documented in
`.env.example`. The dataset is fictional. Production seeding requires an existing
`SEED_ORGANIZATION_ID` and does not create the development administrator.

## Stack and layout

- pnpm workspaces and Turborepo.
- React, TanStack Start/Router/Query, Vite, Nitro and Tailwind CSS.
- Hono on Node.js, Better Auth and Zod.
- Postgres with Drizzle, S3-compatible object storage and pg-boss jobs.

Application code lives in `apps/api` and `apps/web`; browser tests live in
`apps/e2e`. Shared domain logic, schemas, database code and connectors live in
`packages/`. See [Architecture](docs/architecture.md) for responsibilities and
request flow. The [web README](apps/web/README.md) covers routing and translations.

## Documentation

- [Installation and operations](docs/installation.md): configuration, TLS,
  backup/restore and upgrades.
- [User guide](docs/user-guide.md): master data, passports, publication and team access.
- [Connectors](docs/connectors.md): permissions, mapping and the local SIMPL mock.
- [Deployment modes](docs/deployment-modes.md): current behavior and future SaaS work.
- [Releases](docs/releases.md): independent GitHub releases and public GHCR images.
- [Contributing](CONTRIBUTING.md): development, checks and publication hygiene.
- [Design specification](SPEC.md): design requirements; the implementation guides
  above describe current behavior.

Documentation and code comments use English. UI translations remain available
in English and German; illustrative screenshots currently show the German UI.

## Checks

```sh
pnpm check:public-files
pnpm check:dependencies
pnpm format:check
pnpm typecheck
pnpm lint
pnpm test
pnpm build
```

`pnpm test:integration` needs Postgres and MinIO. `pnpm test:e2e` exercises the UI.
`pnpm test:smoke` builds and tests the container images. See the
[API test guide](apps/api/test/README.md) and [browser test guide](apps/e2e/README.md).

`pnpm build` produces API entry points in `apps/api/dist` and the web server in
`apps/web/.output`. Build the application and storage Dockerfiles with this workspace as context:

```sh
docker build -f apps/api/Dockerfile -t greencomplai-dpp-api:local .
docker build -f apps/web/Dockerfile -t greencomplai-dpp-web:local .
docker build -f docker/minio/Dockerfile -t greencomplai-dpp-minio:local .
```

## Configuration and publication

Only `.env.example` belongs in Git. Keep real environment files, credentials,
private keys, customer data, backups, dumps and licensed standards out of the
published tree. `VITE_*` variables are client-visible and must contain no secrets.
Production rejects the documented authentication placeholder and development defaults.

`pnpm check:secrets` requires [Gitleaks](https://github.com/gitleaks/gitleaks).
It scans tracked files from HEAD, excluding ignored local files. Run it after
preparing the final local commit and before pushing; staging alone is not enough.
CI also scans the proposed commit range, including secrets deleted in later
commits. Exceptions match an exact public fixture value and file.

Dependabot checks pnpm packages, GitHub Actions and Docker images weekly and
opens pull requests for review. It takes effect on the GitHub default branch.
The configuration lives in the repository root and targets this workspace
separately from the older applications.
