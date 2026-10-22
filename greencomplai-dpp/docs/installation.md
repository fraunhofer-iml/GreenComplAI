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

## Install

Run on the target server:

```sh
curl -fsSL https://raw.githubusercontent.com/fraunhofer-iml/GreenComplAI/main/greencomplai-dpp/install.sh | bash
```

The installer asks for the hostname, organization name and administrator email.
It installs missing prerequisites after confirmation, generates configuration,
starts the latest stable DPP release and prints the first administrator's
invitation link. It uses sudo when required. No source checkout, separate
Compose download or GitHub account is needed.

Pass options with `bash -s --`, for example `bash -s -- --version 0.1.0`.
Use `bash -s -- --help` in the command above for all options. Common options:

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

### Download a specific release

For a version-pinned installer with checksum verification, download the assets
from a DPP [release](https://github.com/fraunhofer-iml/GreenComplAI/releases).
The Compose configuration is included in the installer:

```sh
VERSION=0.1.0
RELEASE_URL="https://github.com/fraunhofer-iml/GreenComplAI/releases/download/greencomplai-dpp%2Fv$VERSION"
curl -fsSL -o install.sh "$RELEASE_URL/install.sh"
curl -fsSL -o docker-compose.selfhost.yml "$RELEASE_URL/docker-compose.selfhost.yml"
curl -fsSL -o SHA256SUMS "$RELEASE_URL/SHA256SUMS"
sha256sum --check SHA256SUMS
bash install.sh
```

Release installers default to their exact version. Avoid the repository-wide
`/releases/latest` URL, which can refer to one of the older applications.

### Offline installation

On a connected machine, pull the API, web and storage images for the selected version
and export them with `docker save`. Transfer the archive and `install.sh` to the
target, then import it with `docker load` and run the installer with `--skip-pull`.
Use the same image version on both machines. Do not transfer a
production `.env` as an example configuration.

## First account

Use the invitation link printed by the installer. It expires after 30 days.
The link opens the login page. Select "Einladung erhalten? Konto erstellen"
(create account) to switch to registration.
Register with the invited email address and a password of at least 12 characters.
The account becomes an administrator and can invite other users from Team.
Invitation-only registration remains enabled.

In DPP 0.1.0, registering from the invitation link can show an already-used
invitation error after successful registration. Select "Zur Übersicht" to open
the dashboard; the administrator account and membership have already been created.

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

Run the installation command again to update to the latest stable DPP images.
For a specific version or a custom installation directory, pass options:

```sh
curl -fsSL https://raw.githubusercontent.com/fraunhofer-iml/GreenComplAI/main/greencomplai-dpp/install.sh | bash -s -- --dir /opt/greencomplai --version 1.2.4
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
