# Vendored Runtime Artifacts

- `vendor/cheerpx`: local CheerpX runtime files committed to the repo.
- `vendor/scramjet`: self-hosted Scramjet static bundle built by `.github/workflows/pages.yml`.

Place a CheerpX root filesystem image at `vendor/cheerpx/cheerpXImage.ext2` so the local runtime can initialize from a raw ext2 disk image.

The app entrypoint in `apps/preinstalled/terminal.html` now loads the native CheerpX terminal at `apps/native/terminal-native.html`.
