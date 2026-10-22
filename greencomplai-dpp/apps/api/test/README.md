# API tests

| Suite                            | Command from workspace root               | Dependencies         |
| -------------------------------- | ----------------------------------------- | -------------------- |
| Unit, `src/**/*.test.ts`         | `pnpm --filter @dpp/api test`             | No external services |
| Integration, `test/**/*.test.ts` | `pnpm --filter @dpp/api test:integration` | Postgres and MinIO   |

Start infrastructure with `pnpm dev:infra`. `pnpm test` runs unit tests without
starting infrastructure.

## Integration setup

`global-setup.ts` recreates a disposable test database and applies real SQL
migrations. Use `TEST_DATABASE_URL` to select the test server and database. Never
point it at a database containing data you need. The suite also creates its test
storage bucket. Document tests use real object storage and verify downloads.

Requests run through `app.fetch()` and the real middleware chain. Authentication
fixtures call the Better Auth handlers; invitations exercise the signup path.

The integration configuration disables rate limiting and allows open signup so
fixtures can create users. Registration tests also exercise invitation-only
signup. These settings are for the test process, not a deployment template.

## Isolation

Tests create organizations and users with distinct identifiers. Files execute
without parallelism because they share one database. Tests do not clear all
rows between cases. Create your own organization when asserting row counts or
permissions; do not rely on another test's data.

## Coverage by area

- `tenant-isolation.test.ts`: membership and untrusted organization headers.
- `element-policy.test.ts`: controlled reads and patch permissions.
- `public-projection.test.ts`: published data, ambiguity and archival.
- `dpp-workflow.test.ts`: transitions, review, revisions and version labels.
- `dictionary-versioning.test.ts`: versions pinned by existing passports.
- `din-contract.test.ts`: application API contracts and result envelopes.
- `db-integrity.test.ts`: constraints and transactional persistence.
- `auth-registration.test.ts`, `two-factor.test.ts`: signup and administrative MFA.
- `blob-upload.test.ts`, `blob-cleanup.test.ts`: storage and historical references.

Browser tests are documented in [apps/e2e](../../e2e/README.md).
