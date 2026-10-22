# Digital Product Passport Application Specification

> Design requirements from the initial specification. Some sections describe future
> work. For current behavior, start with [Architecture](docs/architecture.md) and
> [Deployment modes](docs/deployment-modes.md).

## 1. Project Overview

This project is a generic Digital Product Passport (DPP) management platform for companies that need to create, validate, publish, maintain, and expose product passports. The application consists of an independently hostable backend API, a company dashboard, and a public viewer for published passport data.

The first version is a pragmatic, norm-aligned MVP. It implements the core lifecycle, data model, access control, audit, and public read capabilities needed for DPP management, while keeping external registry integration, certification, and product-sector-specific catalogues as later extensions.

Primary product capabilities:

- Manage DPPs across their lifecycle: draft, review, published, archived.
- Publish public DPP data through stable ProductID and QR-code based URLs.
- Maintain controlled DPP data with role-based access checks.
- Store flexible product data via versioned JSON Schemas and dictionary references.
- Record all DPP changes as audit/change events.
- Expose norm-aligned REST APIs with OpenAPI documentation.

## 2. Normative Context

The initial design references draft DPP standards EN 18222, EN 18223 and EN 18239
for API behavior, interoperability and access control. Licensed standards are not
distributed with this repository. These references are design context and do not
constitute certification or a claim of full conformance.

The implementation should align with the following norm-derived concepts:

- Lifecycle API operations such as reading by DPP ID, reading by ProductID, creating, updating, deleting, and reading or updating fine-grained data elements.
- Registry API boundary for registering new DPPs with product, backup/operator, and registry identifiers.
- DPP core attributes including globally unique DPP ID, ProductID, granularity, schema version, status, last update, economic operator ID, and optional facility ID.
- Semantic DPP content model based on `DataElementCollection`, `SinglevaluedDataElement`, `MultivaluedDataElement`, `ValueElement`, and document-like data elements.
- Change tracking for DPP updates including identifier, changed object, timestamp, actor, and changed properties.
- Separation of public data from controlled data, with unauthenticated public read access and authenticated access for controlled data.
- Security and resilience expectations such as access revocation, business continuity, secure-by-design implementation, incident detection/response, and protection of business confidential information.

## 3. Users, Roles, and Access Model

The application is multi-tenant and can be deployed as SaaS or as a dedicated company instance. All company-owned data must be scoped by organization.

### 3.1 User Types

- Public viewer: anonymous user who can read published public DPP data.
- Organization admin: manages organization settings, users, invitations, roles, and API access.
- Editor: creates and edits DPP drafts, data elements, documents, and schema-backed content.
- Internal viewer: reads company DPP data without edit permissions.
- Authority user: authenticated role intended for controlled-data access scenarios.

### 3.2 Authentication

Version 1 uses Better Auth with email/password authentication.

Authentication rules:

- Signup is invite-only.
- Sessions use secure HTTP-only cookies.
- The frontend and backend should support credentialed CORS for separate hostnames or subdomains.
- TOTP enrollment is implemented; administrative enforcement is configurable.
- OIDC is not part of v1. It remains a future extension for enterprise identity providers.

### 3.3 Authorization

Authorization combines organization membership, RBAC, and per-element visibility policies.

Required authorization dimensions:

- Organization boundary: users can access only organizations they belong to.
- Role permissions: admin, editor, internal viewer, authority.
- DPP status: draft and review DPPs are never publicly readable.
- Element visibility: each data element or document is marked as public or controlled.
- Element policy: controlled elements can restrict read/write access to selected roles.

Public access rules:

- Public endpoints return only published DPPs.
- Public endpoints return only data elements and documents marked as public.
- Public endpoints must not leak controlled element metadata unless explicitly marked public.

Controlled access rules:

- Authenticated users can read controlled data only if their role and organization context allow it.
- Editors can write controlled elements only when the DPP is editable.
- Authority users are modeled in v1, but high-assurance authentication is out of scope.

## 4. Core Workflows

### 4.1 Organization and User Management

An organization admin can:

- Invite users by email.
- Assign roles.
- Disable users.
- View membership and invitation status.

The system must log security-relevant actions such as invitations, role changes, disabled users, and login-relevant account events where Better Auth exposes them.

### 4.2 DPP Creation

An editor creates a DPP in draft state.

Required draft data:

- ProductID.
- Granularity.
- DPP schema version.
- Economic operator ID.
- Optional facility ID.
- Initial data elements or collections.

The system generates or reserves:

- DigitalProductPassportID.
- Internal database ID.
- Initial DPP version.
- Initial audit event.

### 4.3 Editing and Validation

Editors can edit draft DPPs through the dashboard or REST API.

Validation must include:

- Required DPP core fields.
- Unique element paths inside a DPP.
- JSON Schema validation for schema-backed data elements.
- Status transition rules.
- Visibility and policy rules.

Validation should produce structured result messages with message type, text, code, optional correlation ID, and timestamp.

### 4.4 Review and Publishing

The MVP workflow is `Draft -> Review -> Published -> Archived`.

Status rules:

- Draft: editable by editors.
- Review: locked for normal editing except returning to draft or publishing by authorized users.
- Published: publicly readable through ProductID/QR routes for public elements.
- Archived: read-only and not treated as the active ProductID version.

Publishing requirements:

- Validate the complete DPP before publishing.
- Materialize a public projection containing only public data.
- Generate or update a QR target URL for the ProductID route.
- Create a publish audit event.

### 4.5 Public Viewing

The public viewer lets anonymous users access published public DPP data by ProductID or QR target.

The public view must:

- Show product identity and DPP metadata.
- Group data by collections.
- Display translated labels where available.
- Render documents as links or downloadable assets when public.
- Avoid exposing controlled data or internal workflow metadata.

### 4.6 Archiving

Archiving makes a published DPP read-only and removes it from active ProductID lookup unless a historical lookup is explicitly requested.

The current MVP must support archive status and audit events. Advanced legal retention policies and immutable signatures are future work.

## 5. Domain Model

### 5.1 Core Entities

Organization:

- `id`
- `name`
- `slug`
- `createdAt`
- `updatedAt`

User:

- Managed by Better Auth.
- Extended with organization membership and role assignment.

OrganizationMembership:

- `organizationId`
- `userId`
- `role`
- `status`
- `createdAt`
- `updatedAt`

DPP:

- `id`
- `organizationId`
- `digitalProductPassportId`
- `productId`
- `granularity`
- `dppSchemaVersion`
- `status`
- `lastUpdate`
- `economicOperatorId`
- `facilityId`
- `activeVersionId`
- `createdAt`
- `updatedAt`

DPPVersion:

- `id`
- `dppId`
- `versionNumber`
- `status`
- `snapshot`
- `createdBy`
- `createdAt`

DataElementCollection:

- `elementId`
- `dictionaryReference`
- `name`
- `dataElements`
- `visibility`
- `policy`

SinglevaluedDataElement:

- `elementId`
- `dictionaryReference`
- `name`
- `value`
- `valueDataType`
- `language`
- `visibility`
- `policy`

MultivaluedDataElement:

- `elementId`
- `dictionaryReference`
- `name`
- `valueList`
- `visibility`
- `policy`

ValueElement:

- `elementId`
- `dictionaryReference`
- `name`
- `value`
- `valueDataType`
- `language`

Document:

- Modeled as a specialized data element.
- References a blob object for stored files.
- Inherits visibility and policy behavior from data elements.

AuditEvent:

- `id`
- `organizationId`
- `dppId`
- `actorUserId`
- `eventType`
- `objectType`
- `objectId`
- `patch`
- `changedProperties`
- `timestamp`
- `correlationId`

SchemaDefinition:

- `id`
- `organizationId`
- `name`
- `version`
- `dictionaryReference`
- `jsonSchema`
- `status`
- `createdAt`
- `updatedAt`

BlobObject:

- `id`
- `organizationId`
- `storageKey`
- `filename`
- `contentType`
- `size`
- `checksum`
- `createdBy`
- `createdAt`

### 5.2 Visibility Model

Each data element, collection, and document must support:

- `visibility`: `public` or `controlled`.
- `policy.readRoles`: allowed roles for controlled reads.
- `policy.writeRoles`: allowed roles for controlled writes.
- `publicEligible`: optional flag to prevent accidental publication of sensitive element types.

The public projection must be derived from the stored DPP snapshot and must include only public-visible data.

### 5.3 Versioning Model

Versioning uses event-sourcing light:

- The latest DPP state is stored as a materialized snapshot for efficient reads.
- Every write operation records an audit/change event.
- Publishing creates a versioned snapshot.
- Updates are all-or-nothing. Partial failure must reject the whole update.

The system must retain enough information to reconstruct what changed, when, by whom, and which data elements were affected.

## 6. API Surface

The backend exposes REST APIs and OpenAPI documentation. API request/response DTOs use Zod. OpenAPI is generated from the route schemas where possible. Dynamic DPP payload validation uses Ajv against stored JSON Schemas.

### 6.0 Versioning and Deprecation Policy

The versioned surface is **`/v1`**. Its description is served, generated from the
same Zod schemas the endpoints use, at `GET /v1/openapi.json`.

The unversioned paths (`/dpps`, `/members`, …) answer the same requests and stay
in place for the pilot and the current frontend. Every unversioned response
carries its own notice:

- `Deprecation: true` (RFC 9745)
- `Sunset: <http-date>` (RFC 8594) — a date, not an intention. A sunset without
  a date is a mood, not a commitment.
- `Link: <…/v1/…>; rel="successor-version"` — the exact path that replaces it.

All three are in the CORS `exposeHeaders` list: a deprecation only a terminal
can see does not reach the people it concerns.

Rules that hold for `/v1`:

1. **Additive changes only.** New optional fields, new endpoints, new enum
   values on input. Anything that can break a correct client — removing a field,
   narrowing a type, changing a status code, making an optional field required —
   needs `/v2`.
2. **A new prefix is not a new trust boundary.** `/v1` runs through the same
   auth, membership, role and rate-limit chain. This is asserted, not assumed
   (`test/openapi-contract.test.ts`).
3. **Nothing exists on one prefix only.** A route reachable unversioned but not
   under `/v1` would be a dead end for anyone who migrates; the contract test
   fails on it.
4. **The catalogue is checked against the router**, not maintained beside it: a
   new route without an OpenAPI entry — or an entry without a route — fails the
   build. A hand-kept description is the third copy of the same fact, after the
   handler and the schema, and goes stale first.

### 6.0a Machine Access (G27)

Two ways in, one authorization model:

- **A session cookie** for people in the browser. The tenant comes from the
  `x-organization-id` header and is verified against an active membership.
- **An API key** for foreign systems (ERP, PLM, PIM, MES), sent as
  `Authorization: Bearer dpp_<prefix>_<secret>`. The tenant comes from the key
  itself; an organization header is _ignored_, because it is client-controlled
  and honouring it would let a key change tenants.

A key belongs to a **service account**, which is an actor of the organization
and carries the same role list a person does — a second permission hierarchy
would mean two answers to "who may do this". On top of the role sit **scopes**
(`read`, `write`), and both must agree: a nightly-import key on an admin account
still cannot write if it only carries `read`.

Key handling:

- Only a **hash** of the secret is stored (SHA-256). The plaintext exists once,
  in the response that creates it. SHA-256 rather than Argon2/bcrypt on purpose:
  slow hashing exists to make _guessable_ secrets expensive to try. A key here is
  256 random bits and is not guessable; a slow algorithm would only tax every
  legitimate call and turn the API itself into the target.
- The `dpp_` marker is not decoration — secret scanners recognise keys by such
  patterns, so one accidentally committed gets noticed.
- **Rotation** is what multiple keys per account are for: mint the new one, roll
  it out, revoke the old. Revoking keeps the row (when access was withdrawn is
  part of "who had access when"); disabling the account stops all its keys at
  once.
- Every rejection looks identical. Whether a key is unknown, revoked, expired or
  its account disabled, the answer is the same 401 — otherwise it is an oracle
  for which prefixes exist. The secret is compared in constant time, and _before_
  the state checks, so the response time does not leak existence either.
- Managing accounts and keys requires a **session**, never a key. A key that can
  mint keys is not a limited permission; it is one that extends itself.

### 6.1 Auth API

Better Auth owns the auth route integration.

Required auth capabilities:

- Login with email/password.
- Logout.
- Current session.
- Accept invitation or complete invited account setup.

### 6.2 Organization API

Representative routes:

- `GET /organizations`
- `GET /organizations/{organizationId}`
- `GET /organizations/{organizationId}/members`
- `POST /organizations/{organizationId}/invitations`
- `PATCH /organizations/{organizationId}/members/{userId}`

### 6.3 DPP Lifecycle API

Two surfaces, deliberately:

**The internal API follows REST.** It is what the application and any ordinary
integration speak:

- `GET /dpps?productId=&status=&search=&limit=&offset=` — list and filter.
- `GET /dpps/{dppId}`, `POST /dpps`, `PATCH /dpps/{dppId}`.
- `PUT /dpps/{dppId}/status` — the status is a resource that gets set, not four
  verbs. Allowed transitions are decided server-side; publish and archive are
  admin-only (four eyes).
- `POST /dpps/{dppId}/revisions` — open a new editable revision.
- `POST /dpps/ids-by-products` — the one normative shape kept internally
  (EN 18222 table 17 puts the ID set in the body).
- `GET /dpps/{dppId}/versions-at?date=` — the published version that was current
  at that instant. Only published versions qualify: a draft that existed then was
  never the passport's statement. The timestamp must carry a timezone; without
  one the same text is a different instant depending on who reads it, and here an
  hour decides which version answers.
- `DELETE /dpps/{dppId}` — deletes a draft that was **never published**;
  anything else is refused with a pointer to archiving. A published passport is a
  statement already made: its QR code is on products in circulation, and removing
  it turns a reference into an error instead of turning a statement into a
  withdrawn one. Retention rules and the revision protection of G26 say the same.
  An open revision of a previously published passport counts as published — its
  history has been outside.

**The norm facade follows EN 18222 section 8**, under `/en18222/v1` — see 6.4a.

The paths in table 17 (`dppsByProductId/{productId}`) are RPC in REST clothing.
Adopting them internally would have spoiled the internal style; ignoring them
would have missed the contract. Keeping them apart means that if the norm
changes its drafting style, only the facade changes.

### 6.4 Fine-Grained Data Element API

Table 19 is genuinely RESTful, so these live in the internal API and the facade
merely delegates to them:

- `GET /dpps/{dppId}/collections/{collectionId}`
- `GET /dpps/{dppId}/elements/{elementPath}`
- `PATCH /dpps/{dppId}/collections/{collectionId}`
- `PATCH /dpps/{dppId}/elements/{elementPath}`

`elementPath` is `elementId` or `collectionId/elementId` — the same notation the
diff, the policy check and the validation report already use. There is no third
level: a collection holds elements, not collections, so a path with two
separators is a wrong path and is rejected rather than truncated.

Patch behavior:

- **RFC 7396 merge patch.** `null` deletes a key; arrays are replaced, not
  merged. This differs from the internal whole-passport `PATCH`, which overlays
  flatly and expects complete arrays — there `null` is a value like any other.
  Both semantics coexist on purpose: the flat one belongs to the editor, which
  sends whole lists; the merge one to the norm. Mixing them would mean guessing,
  per request, what a `null` means.
- `elementId` is the address, not payload: a patch cannot rename the element it
  addresses.
- An unknown path is a 404 — `UpdateElement` updates, it does not create.
- Writes go through the **same path as a whole-passport patch**, so element
  policies, reference integrity, dictionary validation, versioning, optimistic
  locking and audit all apply unchanged. Implementing them a second time here
  would be the obvious shortcut, and it is how two write paths end up with one
  of them checking less.
- Reads are role-filtered. An element a role may not read answers 404, not 403:
  a 403 would confirm that it exists.

### 6.4a Norm Facade (EN 18222 section 8)

Served under **`/en18222/v1`**, it is a _delegation layer_, not a second
application: every request is rewritten onto the internal route and sent through
the same app. Authentication, tenancy, role gates, policies, validation and
audit therefore apply unchanged — they cannot be forgotten here because they are
not here.

It does exactly three things:

1. **Translate paths** (tables 17 and 19 → internal REST paths).
2. **Reshape errors** into the norm's result object (6.7).
3. **Pass successes through unchanged** — table 16 marks every `Success*` code
   with "carries result object: no", so a success is the payload itself, not an
   envelope around it.

`apps/api/test/openapi-contract.test.ts` holds the facade against a transcript
of tables 17 and 19: an operation the norm defines and we do not serve fails the
build, and so does a route we serve that the norm does not define. The facade is
the outward contract, not a second way into the whole application.

### 6.5 Registry Adapter API

Version 1 provides an internal adapter boundary, not real external registry integration.

Route:

- `POST /registry/dpps`

Input:

- Product ID.
- Operator ID.
- Optional backup operator ID.
- DPP header subset.

Output:

- Internal registry identifier.
- Status/result object.

The implementation should isolate this behind an interface so a real registry client can replace the internal adapter later.

### 6.6 Public API

Public routes:

- `GET /public/products/{productId}`
- `GET /public/dpps/{digitalProductPassportId}`
- `GET /public/files/{fileId}`

Public routes require no authentication and must serve only published public projections.

### 6.7 Result and Error Objects

All API errors and validation failures must return structured result messages.
Successful responses must NOT carry a result object: EN 18222 Table 16 marks
`Success`, `SuccessCreated`, `SuccessAccepted` and `SuccessNoContent` as
"weist Ergebnisobjekt auf: Nein". A success returns its payload and a status
code, nothing else.

Result shape:

```json
{
  "messages": [
    {
      "messageType": "Error",
      "text": "ProductID is required",
      "code": "DPP_VALIDATION_REQUIRED_FIELD",
      "path": "productId",
      "correlationId": "optional-correlation-id",
      "timestamp": "2026-04-27T00:00:00.000Z"
    }
  ]
}
```

`messageType` values (EN 18222 Table 15):

- `Info`
- `Warning`
- `Error`
- `Exception` — internal and/or unhandled exception. The response text stays
  opaque and carries only a correlation id; the detail belongs in the log, not
  in a payload that may quote connection strings or row contents.

Deviations from EN 18222 on the **internal** surface, deliberate and listed so
they stay visible. The norm facade (6.4a) carries none of them:

- **`path`** is our addition; Table 14 does not define it. Without a field
  reference a client cannot place a validation message at the input that caused
  it, which is what a usable form needs. The facade folds it into `text`
  (`"productId: must not be empty"`) rather than inventing an attribute or
  dropping the reference.
- **`messages`** is plural; Table 13 names the attribute `message` with
  cardinality `0..*` — a singular name carrying many. The facade uses `message`.

Where the generic status code from Table 16 belongs is answered by two places
together: Table 12 lists `statusCode` as a _method output parameter_, and
section 8 maps the logical model onto HTTPS/REST — so the generic status code is
the HTTP status. Table 14's `code` is something else, "a technology-dependent
status or error code", and that is our internal code (`DPP_NOT_FOUND`). Putting
the generic code into `code` would destroy information: it is already in the
HTTP status, the internal one is nowhere else.

Table 16 has no state for 422. The norm does not distinguish "unreadable
request" from "readable but rejected", so the facade maps 422 onto
`ClientErrorBadRequest` — the internal code survives in `code`, so the precision
is not lost.

## 7. Technical Architecture

### 7.1 Monorepo

Use `pnpm` workspaces and Turborepo.

Repository layout:

```text
apps/
  api/
  web/
packages/
  config/
  db/
  domain/
  schemas/
  ui/
```

### 7.2 Frontend

Use:

- Vite.
- React.
- TypeScript.
- TanStack Router.
- TanStack Query.
- TanStack Table.
- React Hook Form.
- Tailwind CSS v4.
- shadcn/ui.
- Radix/Base UI primitives where needed.

Frontend apps:

- Dashboard for authenticated company users.
- Public viewer for anonymous published DPP access.

Dashboard route groups:

- `/login`
- `/org`
- `/org/users`
- `/dpps`
- `/dpps/new`
- `/dpps/:dppId`
- `/dpps/:dppId/audit`
- `/schemas`
- `/files`

Public route groups:

- `/p/:productId`
- `/dpp/:digitalProductPassportId`

### 7.3 Backend

Use:

- Hono.
- `@hono/node-server`.
- TypeScript.
- Zod for route DTO validation.
- OpenAPI generation.
- Better Auth route integration.
- Drizzle ORM.
- Ajv for dynamic JSON Schema validation.

Backend module groups:

- `auth`
- `organizations`
- `memberships`
- `dpps`
- `data-elements`
- `schemas`
- `files`
- `registry-adapter`
- `audit`
- `jobs`

The backend is the only service allowed to access Postgres and blob storage directly.

### 7.4 Data Access

Use Postgres and Drizzle.

Postgres usage:

- Relational tables for organizations, users/memberships, DPP metadata, schema definitions, files, and audit events.
- JSONB for DPP snapshots, data element payloads, policies, and stored schema definitions.
- Indexes for organization scope, ProductID, DPP ID, status, last update, and JSONB fields needed for lookup.

Drizzle responsibilities:

- Schema definitions.
- Migrations through Drizzle Kit.
- Repository functions.
- Transaction boundaries for all write operations.

### 7.5 Files

Use S3-compatible blob storage.

Blob storage is used for:

- DPP documents.
- Public document downloads.
- Generated QR assets.
- Exports.
- Large attachments.

The database stores metadata and storage keys, not raw file content.

### 7.6 Jobs

Use `pg-boss` for background jobs.

Job categories:

- DPP validation jobs.
- Public projection generation.
- Publish and archive side effects.
- Export generation.
- File cleanup.
- Webhook retries when integrations are added.

Jobs must be idempotent where possible.

## 8. Validation and Publishing

Validation is split into fixed DPP validation and dynamic schema validation.

Fixed validation:

- Required DPP core fields.
- Status transition validity.
- Organization ownership.
- ProductID uniqueness rules.
- Element path uniqueness.
- Visibility and policy consistency.

Dynamic validation:

- Ajv validates data element payloads against the selected versioned JSON Schema.
- Schema definitions are immutable once used by a published DPP.
- New schema versions must be created instead of mutating published schema versions.

Publishing pipeline:

1. Load DPP draft/review snapshot.
2. Validate fixed model rules.
3. Validate dynamic schema-backed elements.
4. Validate visibility and public eligibility.
5. Create versioned snapshot.
6. Materialize public projection.
7. Generate or update QR target.
8. Mark DPP as published.
9. Record audit event.

## 9. Security, Resilience, and Confidentiality

Security requirements:

- Secure HTTP-only session cookies.
- CSRF protection according to Better Auth recommendations and deployment topology.
- Credentialed CORS only for configured frontend origins.
- Password authentication through Better Auth, not custom password handling.
- RBAC and organization isolation on every non-public API route.
- Per-element authorization before controlled data is returned.
- No controlled data in public projections.
- Structured audit logs for security-relevant actions.

Resilience requirements:

- The backend must expose health and readiness endpoints.
- Jobs must be retryable and idempotent where possible.
- Publishing must be transactional around database state changes.
- Blob uploads must record checksums.
- Failed publish jobs must leave DPP status unchanged or marked with a recoverable failure state.

Confidentiality requirements:

- Data elements marked controlled must never appear in public responses.
- Public file links must be scoped to public documents only.
- Controlled files must require authenticated, authorized backend access.
- Audit logs must avoid storing secret values in plaintext patches when fields are marked sensitive.

## 10. Environment and Deployment

The app is deployed as separate services:

- `web`: static Vite build served by a web host or container.
- `api`: Hono Node container.
- `worker`: Node container running pg-boss workers.
- `postgres`: managed or containerized Postgres.
- `blob`: S3-compatible object storage.

Required environment variables:

- `DATABASE_URL`
- `BETTER_AUTH_SECRET`
- `BETTER_AUTH_URL`
- `WEB_ORIGIN`
- `API_ORIGIN`
- `S3_ENDPOINT`
- `S3_REGION`
- `S3_BUCKET`
- `S3_ACCESS_KEY_ID`
- `S3_SECRET_ACCESS_KEY`

Local development should use Docker Compose or equivalent for Postgres and S3-compatible storage.

## 11. MVP Scope

In scope:

- Invite-only email/password login.
- Organization and membership management.
- DPP CRUD for authenticated users.
- Draft-review-publish-archive workflow.
- Public viewer for published public DPP data.
- JSON Schema registry for flexible DPP data.
- Fine-grained data element read and patch operations.
- Per-element public/controlled visibility.
- Audit/change events for DPP modifications.
- S3-compatible document storage.
- OpenAPI documentation.

Out of scope for v1:

- Real external DPP registry integration.
- Real global operator ID verification.
- OIDC and enterprise SSO.
- MFA.
- Product-sector-specific mandatory catalogues.
- Legal certification.
- Cryptographic signing of immutable DPP versions.
- Advanced data retention and legal hold workflows.
- Native mobile app.

## 12. Test Plan

Unit tests:

- DPP status transitions.
- RBAC and per-element policy checks.
- DPP core validation.
- JSON Schema validation helpers.
- Public projection filtering.

API tests:

- Authenticated DPP CRUD.
- Public ProductID lookup.
- Controlled data blocked from anonymous access.
- Draft/review/publish/archive transitions.
- Fine-grained data element patching.
- Structured error/result responses.

Database tests:

- Drizzle migrations.
- Organization isolation.
- ProductID and DPP ID uniqueness.
- Audit event creation in write transactions.
- JSONB snapshot persistence.

E2E tests:

- Admin invites editor.
- Editor logs in.
- Editor creates DPP.
- Editor adds schema-backed elements and document.
- Editor submits for review.
- Authorized user publishes DPP.
- Anonymous public viewer can read public fields.
- Anonymous public viewer cannot read controlled fields.

Contract tests:

- OpenAPI output is generated and checked in CI.
- API DTO schemas remain compatible with route handlers.

## 13. Acceptance Criteria

The MVP is acceptable when:

- Backend and frontend are independently hostable.
- A user can be invited, log in, and manage DPPs in an organization.
- A DPP can move from draft to published and become visible in the public viewer.
- Public responses include only public elements.
- Controlled elements require authenticated authorization.
- All DPP changes create audit events.
- Dynamic DPP content validates against versioned JSON Schemas.
- The API exposes OpenAPI documentation.
- Files are stored in S3-compatible storage with database metadata.
- The system can run locally with Postgres and S3-compatible storage.
