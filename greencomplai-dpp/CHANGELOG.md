# Changelog

The 0.1.0 notes describe the application before its public repository import.
The import starts a new Git history; old internal commit links are omitted.

## 0.1.0

### Features

- **deploy**: add --with-demo-data to the installer
- **web**: add the German and English texts for the coded API errors
- **deploy**: add a self-hosting installer that pulls and starts the images
- **web**: add connector import, the dictionary wizard and coded error messages
- **api**: read .env from the repository root and extend catalog and DPP handling
- **connectors**: draft dictionaries from a record type instead of by hand
- **db**: extend the repositories for catalog, dictionaries and DPP records
- **schemas**: add lifecycle statuses, connector base URL state and dictionary diffs

### Bug Fixes

- **docs**: keep the screenshots inside the layout
- **ci**: install buildx for the smoke job
- **web**: resolve the API origin at runtime instead of rewriting the bundle
- **ci**: exempt the release merge request from the commit format check
- **e2e**: expect the confirmation the identifier panel actually renders
- **ci**: use the official minio image for the service containers
- **ci**: keep prettier out of the pnpm store
- **web**: generate the paraglide messages before typecheck and tests
- **web**: resolve the accessibility and correctness lint findings
