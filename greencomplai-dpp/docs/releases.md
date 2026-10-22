# Releases and distribution

## Public distribution

The DPP application has its own tags and GitHub releases in
`fraunhofer-iml/GreenComplAI`. API, web and storage are one DPP release unit, independent of
the older applications. A release tag is `greencomplai-dpp/v1.2.3`; the image tag
is `1.2.3`.

The public images are:

- `ghcr.io/fraunhofer-iml/greencomplai-dpp/api`
- `ghcr.io/fraunhofer-iml/greencomplai-dpp/web`
- `ghcr.io/fraunhofer-iml/greencomplai-dpp/minio`

Release assets contain `install.sh`, `docker-compose.selfhost.yml` and
`SHA256SUMS`. The installer defaults to that exact release version. All downloads
work without credentials. See [installation](installation.md) for the download
and checksum commands. The first public release becomes available after import
and a successful release workflow; adding these files does not publish it.

## Storage image

`docker/minio/Dockerfile` builds MinIO and its bucket-setup client from pinned
upstream commits. The image includes their original licenses. The application
is Apache-2.0; the upstream storage components retain AGPL-3.0-or-later.

- [MinIO server source](https://github.com/minio/minio/tree/9e49d5e7a648f00e26f2246f4dc28e6b07f8c84a), release `RELEASE.2025-10-15T17-29-55Z`.
- [MinIO client source](https://github.com/minio/mc/tree/7394ce0dd2a80935aded936b09fa12cbb3cb8096), release `RELEASE.2025-08-13T08-35-41Z`.

Local Compose and CI build this image from source. Releases publish it alongside
the application images so the installer can pull the complete stack from GHCR.

## Release workflow

The root `.github/workflows/dpp-release.yml` responds only to `greencomplai-dpp/v*` tag
pushes. It verifies that the version matches the DPP root `package.json`, runs
the reusable CI checks, builds native amd64 and arm64 images, and smoke-tests
both platforms before pushing those exact images. Multi-platform manifests
reference the tested images without rebuilding them.

Stable versions receive full, minor, major and `latest` image tags. Prereleases
receive only their exact version. Publish stable versions in ascending order;
the workflow updates the mutable aliases to the version being released.
GitHub releases use `--latest=false` so a DPP release does not change the shared
repository's global latest-release selection. DPP downloads use the full tag,
never the repository-wide `/releases/latest` URL.

The workflow authenticates publishing with GitHub's built-in `GITHUB_TOKEN` and
job-scoped `contents: write` / `packages: write` permissions. No manually stored
registry token is needed. Organization policy must allow these permissions.

New GHCR packages initially have private visibility. After the first image push,
a package administrator must set **all three** DPP packages to public in their package
settings. The workflow checks anonymous manifest access and stops before release
publication if a package is inaccessible. Set the visibility and rerun the
workflow. This is a publisher setup step; users never log into a registry.
See [GitHub's container registry documentation](https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-container-registry).

## Preparing a release

1. Update the DPP root `package.json` version and `CHANGELOG.md` through review.
2. Run the checks and inspect local artifacts with
   `node scripts/prepare-release.mjs greencomplai-dpp/v1.2.3`.
3. Push the matching DPP tag on the reviewed commit. The workflow handles images,
   checksums and the GitHub release.
4. Confirm the release assets and anonymous image pulls before announcing it.

The helper rejects unrelated tags, malformed versions and package-version
mismatches. It writes artifacts into the ignored `build/release/` directory.

## Repository layout

The application lives in `greencomplai-dpp/` with its own pnpm workspace,
Turborepo configuration and lockfile. The public import adds one commit without
the previous repository history. The older `apps/dpp-svc` remains the BaSyx
integration of the existing application.

The root `.github/workflows/dpp-ci.yml` runs only for `greencomplai-dpp/**` or
`.github/workflows/dpp-*.yml` changes. It calls `dpp-checks.yml` with
`workspace: greencomplai-dpp`. The older `test_and_build.yaml` ignores both DPP
paths, while mixed pull requests run both applications' checks.

DPP publishing accepts only `greencomplai-dpp/v*` tags. The older publishing
workflow accepts its existing `frontend/v*`, `entity-management-svc/v*` and
`bff/v*` tags. Neither release workflow runs for the other application's tags.
GitHub does not apply path filters to tag pushes; tag patterns provide the
release isolation.

`.nxignore`, the root ESLint configuration and the root `.prettierignore`
exclude the DPP workspace from the older toolchain. DPP checks use its own
configuration. Root Dependabot entries target the nested pnpm workspace and
Dockerfiles; GitHub Actions updates are managed centrally.
