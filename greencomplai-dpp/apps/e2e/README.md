# Browser and container tests

Run from the workspace root:

```sh
pnpm dev:infra
# Create an isolated browser-test database once:
docker compose exec postgres createdb -U dpp dpp_e2e
DATABASE_URL=postgres://dpp:dpp@localhost:5432/dpp_e2e pnpm db:migrate
pnpm --filter @dpp/e2e exec playwright install --with-deps chromium
pnpm test:e2e
```

Migrations read `DATABASE_URL`. The browser test configuration reads
`E2E_DATABASE_URL` and passes it to its test servers. Keep both pointed at the
same disposable database when overriding the default.

## Server isolation

Playwright starts its own API on port 3100 and web server on port 5273, with
`reuseExistingServer: false`. Reusing a development server could run tests with
the wrong registration policy and write test data into the development database.

The suites cover passport creation, review, publication and anonymous viewing,
as well as master data, dictionary upgrades, collections and ESRS profiles.
Fixtures use the API to prepare records and the browser to exercise user flows.
Wait for hydration before interacting with server-rendered controls. The retry
around the initial login interaction handles a cold development server.

## Container smoke tests

`pnpm test:smoke` builds and starts the self-hosting stack with a separate Compose
project, temporary configuration and ports. It verifies behavior of the actual
images, including login rendering, public viewing and runtime API configuration.
Use `SMOKE_SKIP_BUILD=1` to reuse images and `SMOKE_HOST` when Docker runs on a
remote host. A running Docker daemon is required.

## Documentation screenshots

The repository's `docs-screenshots.mjs` captures the real UI. Run against an
isolated instance populated with the fictional demo data, not a customer system:

```sh
WEB_ORIGIN=http://localhost:8080 \
LOGIN_EMAIL=demo.admin@example.com \
LOGIN_PASSWORD='your-local-demo-password' \
pnpm --filter @dpp/e2e screenshots
```

`OUT_DIR` overrides `docs/screenshots`. Inspect every screenshot before
publication. The script follows the passport's public link and rejects an
unavailable-passport screen. The UI retains its existing translations; this
script captures the German locale used in the user guide illustrations.
