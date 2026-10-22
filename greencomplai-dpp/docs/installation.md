# Installation and operations

For application workflows, see the [user guide](user-guide.md).

## Requirements

Supported installer targets are Debian/Ubuntu and RHEL/Fedora/Rocky/AlmaLinux,
on x86_64 or arm64. Plan for at least 2 CPU cores, 4 GB RAM and 20 GB free disk
space. The installer warns if less than 8 GB is available.

Docker Engine, the Compose plugin, curl and OpenSSL are required. The installer
can install missing prerequisites after confirmation and needs root or sudo for
those operations. Ports default to 8080 for the UI and 3000 for the API.

The installer and Compose file are public assets of the application's GitHub
releases. Images are public on GHCR under
`ghcr.io/fraunhofer-iml/greencomplai-dpp/api`,
`ghcr.io/fraunhofer-iml/greencomplai-dpp/web` and
`ghcr.io/fraunhofer-iml/greencomplai-dpp/minio`. Downloads require no account or token.
The first public release will become available after the repository import and
release workflow have completed.

## Install

Select an existing DPP release from the
[release list](https://github.com/fraunhofer-iml/GreenComplAI/releases).
Replace `1.2.3` below with that release's version. Download into an empty directory:

```sh
VERSION=1.2.3
RELEASE_URL="https://github.com/fraunhofer-iml/GreenComplAI/releases/download/greencomplai-dpp%2Fv$VERSION"
curl --fail --location --output install.sh "$RELEASE_URL/install.sh"
curl --fail --location --output docker-compose.selfhost.yml "$RELEASE_URL/docker-compose.selfhost.yml"
curl --fail --location --output SHA256SUMS "$RELEASE_URL/SHA256SUMS"
sha256sum --check SHA256SUMS
chmod +x install.sh
sudo ./install.sh \
  --host dpp.example.com \
  --org-name "Example organization" \
  --admin-email admin@example.com
```

Release installers default to their exact release version. The source checkout's
installer defaults to the latest stable DPP images; use `--version` to select an
explicit image tag. Avoid the repository-wide `/releases/latest` URL, which can
refer to one of the older applications.

The installer checks prerequisites, creates configuration with generated secrets,
pulls images, applies migrations and starts the stack. It then creates the first
organization and an administrator invitation if none exists.

Use `./install.sh --help` for all options. Common options:

| Option                     | Purpose                                               |
| -------------------------- | ----------------------------------------------------- |
| `--version TAG`            | Install a specific version rather than `latest`       |
| `--dir PATH`               | Override `/opt/greencomplai`                          |
| `--api-port`, `--web-port` | Override the public ports                             |
| `--scheme https`           | Use public HTTPS addresses behind a TLS reverse proxy |
| `--with-demo-data`         | Add fictional examples to the existing organization   |
| `--skip-bootstrap`         | Skip organization and invitation creation             |
| `--skip-pull`              | Use images loaded locally in advance                  |
| `--no-install`             | Report missing prerequisites without installing them  |
| `-y`                       | Answer confirmation prompts automatically             |

### Offline installation

On a connected machine, pull the API, web and storage images for the selected version
and export them with `docker save`. Transfer the archive and `install.sh` to the
target, then import it with `docker load` and run the installer with `--skip-pull`.
Use the same image version on both machines. Do not transfer a
production `.env` as an example configuration.

## First account

Use the invitation link printed by the installer. It expires after 30 days.
Register with the invited email address and a password of at least 12 characters.
The account becomes an administrator and can invite other users from Team.
Invitation-only registration remains enabled.

Repeated installer runs preserve an existing organization and do not issue a new
first-administrator invitation. Manage subsequent invitations through the UI.

## Configuration

The installer writes `/opt/greencomplai/.env` with mode 0600. Existing secrets and
public addresses are preserved on upgrades; image version settings are updated.
After editing configuration, recreate the services:

```sh
cd /opt/greencomplai
docker compose -f docker-compose.selfhost.yml up -d --force-recreate
```

| Setting                                         | Purpose                                                                     |
| ----------------------------------------------- | --------------------------------------------------------------------------- |
| `API_ORIGIN`, `BETTER_AUTH_URL`                 | Public API address, including scheme and port                               |
| `WEB_ORIGINS`                                   | Allowed UI origins                                                          |
| `BETTER_AUTH_SECRET`                            | Authentication secret; keep stable across restarts                          |
| `POSTGRES_PASSWORD`                             | Database credentials                                                        |
| `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`      | Object storage credentials                                                  |
| `CONNECTOR_SECRET_KEY`                          | Encrypts stored connector credentials; preserve it during recovery          |
| `SESSION_COOKIE_DOMAIN`                         | Optional shared parent domain when API and UI use sibling subdomains        |
| `SMTP_*`                                        | Optional invitation mail delivery                                           |
| `REQUIRE_ADMIN_TWO_FACTOR`                      | Require enrolled TOTP for administrative operations                         |
| `UPLOAD_MAX_BYTES`, `UPLOAD_ALLOWED_MIME_TYPES` | File size and type limits                                                   |
| `CLAMAV_HOST`, `CLAMAV_REQUIRED`                | Optional scanning; required mode rejects uploads if scanning is unavailable |

Without SMTP, invitations are still created; an administrator shares the link
manually. Enroll administrators in TOTP before enabling its enforcement.
The default upload limit is 25 MiB. See `.env.example` and
`apps/api/src/config.ts` for the full configuration.

## TLS and reverse proxy

Use TLS for production. With `--scheme https`, the installer expects the UI at
`https://<host>` and the API at `https://<host>:<api-port>`. Configure the proxy
and firewall accordingly; the installer does not obtain certificates.

API and web addresses must match the URLs users actually visit. Session cookies
must also reach the web server for authenticated server rendering. A shared
hostname works with the default host-only cookie. For sibling subdomains, set
`SESSION_COOKIE_DOMAIN` to the narrowest appropriate parent domain.

`API_ORIGIN_INTERNAL` lets the web container call `http://api:3000` internally
while browsers use the public address. The web server injects `API_ORIGIN` into
the rendered document at runtime; compiled assets are not rewritten.

## Operations and monitoring

```sh
cd /opt/greencomplai
docker compose -f docker-compose.selfhost.yml ps
docker compose -f docker-compose.selfhost.yml logs -f api
docker compose -f docker-compose.selfhost.yml down
docker compose -f docker-compose.selfhost.yml up -d
```

`/health` reports that the API process is alive. `/ready` checks Postgres and
object storage and returns 503 until both are reachable. Use `/ready` for
service readiness monitoring. Restart policies bring services back after a host
restart. Avoid `down -v` on installations whose data you need.

## Backup and recovery

Back up the database, object storage and `.env` together. Without
`CONNECTOR_SECRET_KEY`, restored connector credentials cannot be decrypted.
Keep backups private and outside the repository.

For a maintenance-window backup, stop application writers and MinIO before
copying storage. Postgres stays available for a logical dump:

```sh
cd /opt/greencomplai
docker compose -f docker-compose.selfhost.yml stop api web minio
docker compose -f docker-compose.selfhost.yml exec -T postgres \
  pg_dump -U dpp -d dpp | gzip > database.sql.gz
docker run --rm -v greencomplai_minio-data:/data:ro -v "$PWD":/backup alpine \
  tar czf /backup/documents.tar.gz -C /data .
docker compose -f docker-compose.selfhost.yml up -d
```

Also copy `.env` securely. Adjust database and volume names if your installation
uses different settings. Preserve its file permissions.

Restore into an isolated installation with empty target database and storage
volumes, using the matching configuration and image versions. Start Postgres,
restore the SQL dump through `psql`, restore `documents.tar.gz` into the MinIO
volume while MinIO is stopped, then start the stack. Verify readiness, login,
passport access and document downloads. Rehearse recovery on a test system.

## Upgrades

Download and verify the new release installer as described above, then run it
against the existing installation directory:

```sh
sudo ./install.sh --dir /opt/greencomplai --version 1.2.4
```

Back up first. The installer preserves configuration and data while replacing
images. Database migrations are applied before the API starts. A rollback may
require both the earlier images and the matching pre-upgrade database backup;
changing an image tag alone does not reverse migrations.

## Troubleshooting

- Image pull fails: verify the selected DPP version, connectivity to GHCR and
  public package visibility. No registry login is needed.
- API stays unready: inspect API logs for missing configuration, migration errors
  or unreachable database/storage services.
- UI loads but login fails: verify public origins, ports, proxy and cookie domain,
  then recreate containers after configuration changes.
- Port in use: use `--web-port` or `--api-port` to select another port.
- Upload rejected: check size, MIME type, content signature and scanner availability.
- Download fails after recovery: verify both the storage volume and its credentials.

The persistent volumes are `greencomplai_postgres-data` and
`greencomplai_minio-data` with the default Compose project name. `migrate` and
`createbuckets` are one-shot setup services; `api`, `web`, `postgres` and `minio`
are the long-running stack.
