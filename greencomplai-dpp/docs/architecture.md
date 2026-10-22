# Architecture

GreenComplAI DPP is an independently deployable product passport application.
It has its own API, web UI, database, authentication and release lifecycle. The
older GreenComplAI application's `dpp-svc` integrates with BaSyx; this application
does not depend on that service.

## Repository map

| Location                         | Responsibility                                                                         |
| -------------------------------- | -------------------------------------------------------------------------------------- |
| `apps/api`                       | Hono HTTP API, authentication, authorization, application services and background jobs |
| `apps/web`                       | React UI, TanStack Start server rendering, TanStack Router and Query, translations     |
| `apps/e2e`                       | Browser tests, container smoke tests and documentation screenshots                     |
| `packages/domain`                | Passport lifecycle, visibility policies, validation and other pure domain logic        |
| `packages/schemas`               | Shared Zod request, response and passport schemas                                      |
| `packages/db`                    | Drizzle schema, SQL migrations, repositories and demo seed                             |
| `packages/connector-sdk`         | Connector contracts and the restricted outbound HTTP client                            |
| `packages/connector-simpl`       | SIMPL mapping, read allowlist and local mock server                                    |
| `packages/ui`, `packages/config` | Shared UI helpers and TypeScript configuration                                         |

The workspace uses pnpm and Turborepo. Run commands from this workspace root.
After integration into the parent repository, that root is `greencomplai-dpp/`.

## Request flow

1. The browser calls the API through `apps/web/src/features/api/client.ts`.
2. API middleware verifies a session or service-account key, then active
   organization membership, role and key scope where required.
3. Routes validate input and delegate to application services. Domain helpers
   implement policy and validation rules; repositories persist data in Postgres.
4. Response schemas validate the outgoing payload. Public routes expose the
   published snapshot with controlled elements filtered out.

`x-organization-id` selects an organization; it does not grant access. An API
key is bound to its own organization. Never pass an unverified tenant header
straight to a repository.

## Passports and dictionaries

A passport references a product, an economic operator and a dictionary version.
Dictionary entries define field meaning, type, unit and validation constraints.
The normal lifecycle is `draft -> review -> published`; archival removes public
access. Published data changes through a new revision. The active published
version remains distinct from the revision being edited.

Public links use `/dpp/<publicId>`. The legacy `/p/<productId>` lookup can be
ambiguous across organizations; use the public ID for QR codes and shared links.

## Files and connectors

Postgres stores metadata and references; an S3-compatible service stores file
bytes. Upload validation checks size, MIME type and content signatures. Downloads
use short-lived signed URLs. The API controls release of public documents.

Connector credentials are encrypted with `CONNECTOR_SECRET_KEY`, supplied by the
operator separately from the database. Bundled connectors use an allowlisted
read client. Authentication requests are handled by the platform. This interface
is not a sandbox for untrusted third-party JavaScript. See [Connectors](connectors.md).

## Deployment boundaries

API, web and MinIO storage ship as separate images. The storage image builds
MinIO and its bucket-setup client from pinned upstream source; see
[Releases](releases.md) for source versions and licenses. Postgres and object storage are required;
SMTP and ClamAV are optional. pg-boss runs jobs in Postgres. Enable
`WORKER_ENABLED` on the designated worker instance.

`API_ORIGIN` is the browser-facing API address, injected into the rendered
page at runtime. `API_ORIGIN_INTERNAL` is the web server's internal API address.
Do not rewrite compiled assets to change deployment addresses.

Apply database migrations once before starting a new API version. Back up the
database, object storage and configuration together. See
[Installation and operations](installation.md).

## Where to make changes

Keep business rules in `packages/domain` when they can be expressed without
HTTP or storage. Update shared schemas when changing an API contract. Add SQL
migrations instead of editing already applied migrations. Keep localized UI
copy in the existing translation system.

Use unit tests for policy and mapping changes, integration tests for tenant and
storage boundaries, browser tests for user flows, and smoke tests for container
behavior. [CONTRIBUTING.md](../CONTRIBUTING.md) lists commands and publication checks.
