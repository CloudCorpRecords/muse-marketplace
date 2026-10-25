# Changelog

## 0.1.0 — 2026-10-25

Initial release — built the day Muse avatar sharing was announced as coming, because a sharing feature needs an open registry to land in.

- Registry format + `docs/SPEC.md`: listing folders with manifests, sha256 + byte-size per file, media-type allowlist, no executables, path-traversal rejection.
- Launch catalog (9 listings, all original): avatars **Jolly**, **Tree**, **Straw Hat Explorer**, **Neon Founder**, **Cozy Scholar**, **Pixel Sprite** (animated SVG per mode: idle/working/thinking/celebrating + extras); personas **Sharp Operator** and **Warm Companion**; **Starter Pack** bundle.
- CLI `muse-marketplace` (alias `mmkt`): `list`, `search`, `show`, `validate`, `install` (checksum-verified before and after copy, receipt written, tampered listings refused), `init`, `index`, `doctor`.
- MCP server (same bin): `marketplace_search`, `marketplace_list`, `marketplace_show`, `marketplace_validate`, `marketplace_install`.
- Static site in `site/`: searchable/filterable grid, animated mode switcher, copyable install commands. Zero build step.
- Generated `registry/index.json` with deterministic output; CI validates the registry and fails on index drift.
- Docs: SPEC, PUBLISHING, VETTING, MODES, ARCHITECTURE, ROADMAP.
