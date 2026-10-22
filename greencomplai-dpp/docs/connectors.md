# External-system connectors

The operator ships connector modules; each organization installs and configures
the modules it needs. The bundled SIMPL module reads asset and part information.
The connector code is licensed under Apache-2.0 with the application.

## Components

| Location                                        | Responsibility                                                       |
| ----------------------------------------------- | -------------------------------------------------------------------- |
| `packages/connector-sdk`                        | Module types, authentication declarations and restricted HTTP client |
| `packages/connector-simpl`                      | SIMPL routes, normalization and development mock                     |
| `apps/api/src/connectors/registry.ts`           | Modules available to the instance                                    |
| `apps/api/src/services/connectors.ts`           | Installation, lookup and import                                      |
| `apps/api/src/services/connector-mapping.ts`    | Module-independent field and document mapping                        |
| `apps/api/src/services/connector-dictionary.ts` | Dictionary proposals from source fields                              |
| `apps/api/src/services/secret-box.ts`           | Credential encryption                                                |
| `organization_connectors`                       | Organization-specific module configuration                           |
| `connector_field_mappings`                      | Mapping by organization, module, record type and field               |
| `apps/web/src/features/connectors`              | Configuration, lookup and import screens                             |

Register new bundled modules in the API registry. Modules depend on the SDK,
not the platform database or HTTP routes. Their manifest describes their host,
allowed paths, authentication, configuration fields and capabilities.

## Outbound permissions

The supplied client exposes `get`, `tryGet` and `getBinary`. It does not expose a
request body, method override or general request function. It validates paths
against the manifest's allowlist before sending any request.

Path placeholders match one segment. Traversal, encoded slashes, foreign origins,
query strings embedded in a path and redirects are rejected. The module cannot
set authorization headers; the platform supplies them. An optional Accept value
selects response format without changing the request method.

Authentication is a declaration handled by the platform, which may send a token
request such as POST. Modules receive neither stored secrets nor access tokens.
The supplied data client remains read-only even if the source credentials could
write. New upstream routes remain inaccessible until explicitly allowed.

This is an interface restriction for reviewed, bundled code. It does not sandbox
untrusted JavaScript that could call Node's global `fetch`. Running third-party
modules would require separate process and network isolation.

## Credentials and access

Generate `CONNECTOR_SECRET_KEY` with `openssl rand -base64 32` and keep it outside
the database. The platform encrypts connector credentials using AES-256-GCM.
Without the key, installation with secret fields is rejected. Back up the key
with deployment configuration; a database backup alone cannot recover it.

Empty secret fields in an update preserve their saved values. Removing an
installation deletes its saved configuration and credentials; audit records remain.
Administrators manage installations and test credentials. Import and mapping
operations allow the appropriate editor/admin roles. These routes also enforce
organization access and the applicable administrative authentication checks.

## Lookup, mapping and import

Lookup returns a normalized product preview. The import page has its own route,
`/connectors/:key/import/:externalId`, and reloads that preview. There is no
full-text search: lookup uses a source identifier.

Core identity fields map to the product catalog. Additional fields have three
destinations:

| Destination | Effect                                                                     |
| ----------- | -------------------------------------------------------------------------- |
| `ignore`    | Omit the source field                                                      |
| `attribute` | Keep it as source metadata; this is the default                            |
| `element`   | Create a dictionary-referenced passport element with visibility and policy |

Mapping is saved per record type, not per individual asset. Only submitted fields
are updated; unseen fields keep their mappings. Fields absent from the preview
cannot be used to insert arbitrary mapping records.

Source lists produce multivalued elements. Selecting a dictionary entry can
prefill category, visibility and unit. Suggestions use normalized labels and
units, with a confidence score; users must explicitly accept them. A missing
dictionary reference leaves an incomplete element mapping as source metadata.

The dictionary wizard can draft a new vocabulary or add entries to an editable
one from source labels, descriptions, types, units and allowed values. Review
inferred types and proposed keys before saving. Existing versions pinned by
passports retain their versioning protections.

Import creates or updates the catalog product using the external identifier.
Manually maintained identifiers are merged; an existing economic operator is
not overwritten. Creating a passport is optional and uses the same reference,
validation and authorization checks as manual creation. If passport creation
fails after catalog import, the response reports `dppError` and preserves the
valid catalog entry.

## Attachments

Source attachments have stable external identifiers. A document mapping can
retain metadata, ignore the attachment or import it into a document element.
Bytes are fetched only when a complete element mapping requests them.

Imported files pass the normal upload checks, including MIME type, size,
signature, checksum and configured malware scanning. Failed files are reported
in `skippedDocuments`. A single import is limited to 20 attachments. The platform
handles this flow through SDK-normalized documents, independently of the module.

## SIMPL module

The production host is fixed in the manifest at `https://api.simpltech.de`.
The module reads these paths:

| Path                       | Purpose                                         |
| -------------------------- | ----------------------------------------------- |
| `/v1/assets/{id}`          | Asset lookup, optionally by external identifier |
| `/v1/asset-types/{id}`     | Source field descriptions and schema            |
| `/v1/parts/by-external-id` | Part lookup fallback                            |
| `/v1/organizations/{id}`   | Manufacturer details and primary address        |
| `/v1/resources/{id}/file`  | Explicitly requested document bytes             |

The platform performs the manifest-declared client-credentials exchange at
`/v1/auth`. The manifest limits data requests to 2.5 per second with a burst of 10.
Lookup tries the external asset identifier, internal asset identifier, then a
part. Custom fields retain their source values, including free-text units;
normalization does not silently turn them into validated numeric measurements.

The SIMPL OpenAPI specification is not distributed. Local allowlist tests verify
request restrictions; connector and integration tests verify mappings and flows.
They do not establish completeness or compatibility with every upstream API version.

## Local mock

Set the development override in the workspace `.env`:

```dotenv
CONNECTOR_BASE_URL_OVERRIDES=simpl=http://localhost:4010
```

Run in separate terminals:

```sh
pnpm dev:simpl-mock
pnpm dev
```

The mock accepts `dev-client` and `dev-secret`. It provides fictional assets,
a part, organizations and attachments with valid file signatures. `DEMO-UNIT-01`
corresponds to the seeded demo product and dictionary. Other records exercise
shared record types, different types and records without a type.

The API logs the effective host. Check that it points at localhost before using
the mock credentials. Multiple overrides use comma-separated `connectorKey=url`
entries. Production startup rejects this setting because it changes the recipient
of a tenant's stored credentials. The UI also marks an overridden connector as
a test server.

`demo-import.test.ts` checks that mock imports remain consistent with the seeded
examples. Source free text and the passport can intentionally differ where an
import requires an explicit normalization or multivalue decision.

## Entitlements

`EntitlementsProvider.checkConnectorAllowed` is the extension point for deployment
or plan restrictions. The bundled provider currently allows connector use without
a billing gate. This does not imply a separate license for the bundled module.
