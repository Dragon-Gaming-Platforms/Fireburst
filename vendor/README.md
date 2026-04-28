# Vendored Runtime Artifacts

This directory is populated by `.github/workflows/pages.yml` during deployment.

- `vendor/webvm`: self-hosted WebVM build output
- `vendor/scramjet`: self-hosted Scramjet demo build output

The app entrypoints in `apps/preinstalled/terminal.html` and `apps/browsers/Scramjet.html` point here first, so GitHub Pages serves local copies instead of external demo hosts.
