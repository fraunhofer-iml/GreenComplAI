# Contributing

The source is licensed under Apache-2.0. Keep third-party copyright and license
notices when adding or changing dependencies and assets.

## Development

Run DPP commands from `greencomplai-dpp/`. Use the pnpm version declared in `package.json`, Node.js 22 and Docker Compose.
Copy `.env.example` to `.env`, run `pnpm install --frozen-lockfile`, then `pnpm dev`.
See [README.md](README.md) for the stack and [docs/installation.md](docs/installation.md)
for deployment. Demo credentials are only for local development.

Before opening a pull request, run:

```sh
pnpm check:public-files
pnpm check:dependencies
pnpm format:check
pnpm typecheck
pnpm lint
pnpm test
pnpm build
```

Run `pnpm test:integration` or `pnpm test:e2e` for changes involving storage,
authentication or user flows. Container and installer changes also need
`pnpm test:smoke`. These checks require the infrastructure described in the README.

Use Conventional Commits for commits and pull request titles. Explain the
behavior change and how you checked it. Add tests for changed behavior where
they can catch regressions. Dependency update pull requests require the same
review and checks as other code changes.

## Comments and documentation

Write comments and project documentation in English. Explain constraints, security
boundaries and non-obvious decisions. Avoid narrating the implementation or
keeping a change log in comments. Reference a public issue for unfinished work
instead of unexplained internal review identifiers. Keep UI copy in the existing
translation system. Update the relevant guide when behavior or setup changes.
Start with [Architecture](docs/architecture.md) for package responsibilities.

## Files intended for publication

Commit only example configuration. Do not add actual `.env` files, access
tokens, private keys, registry credentials, customer data, database dumps,
backups or licensed standards. Use synthetic examples and inspect screenshots
before committing them. Names, addresses and identifiers can identify a customer
even when no password is visible.

Install [Gitleaks](https://github.com/gitleaks/gitleaks) and run
`pnpm check:secrets` before publishing a commit. It scans tracked files from
HEAD, not ignored local environment files or uncommitted changes. CI also scans
the proposed commit range. A secret committed and later deleted is still in
that range. Remove it before pushing and replace the credential if it was exposed.

Known false positives in `.gitleaks.toml` must match both the exact public value
and its file. Do not exclude whole source or test directories. The SIMPL OpenAPI
specification is not distributed with this project. Connector tests use local
fixtures and validate the permitted requests without it.

Keep DPP checks and release tags separate from the existing applications.
The parent repository owns Git hooks; installing the nested workspace does not
change them. Run `pnpm lint:commit --edit <message-file>` when checking a DPP
commit message locally. Retain the parent repository's contribution rules.
