# Deployment modes

`DEPLOYMENT_MODE` selects `self-hosted` or `saas`; the default is `self-hosted`.
Both use the same API, domain model and storage implementation. Selecting `saas`
does not provision a hosted service, billing, corporate SSO or database isolation.

## Current implementation

- Organization-owned records are scoped by organization. Membership middleware
  verifies active access before organization routes execute.
- Service-account keys are bound to an organization and explicit read/write scopes.
- Element policies refine role permissions for controlled passport data.
- Organization creation grants the creator administrator membership atomically.
- Organization lifecycle state can deny access to suspended tenants.
- Registration is invitation-only unless `ALLOW_OPEN_SIGNUP=true` is explicitly set.
- Authentication uses Better Auth email/password sessions with TOTP support.
- Object storage keys include the organization prefix; upload and download paths
  enforce the corresponding access rules.
- The public resolver exposes published data without an organization login.
- `EntitlementsProvider` is replaceable; the bundled provider is unlimited.

## Isolation and future extensions

Tenants share Postgres with organization checks in application and repository
code. Do not assume Postgres row-level security is enabled: RLS hardening,
per-tenant schemas and separate databases are not implemented by this mode flag.

Billing, plan quotas, enterprise identity providers, custom-domain provisioning
and an external registry connection require separate implementations and tests.
The mode flag and entitlement interface provide integration points, not those
services themselves.

For configuration and backups, see [Installation and operations](installation.md).
For connector boundaries, see [Connectors](connectors.md).
