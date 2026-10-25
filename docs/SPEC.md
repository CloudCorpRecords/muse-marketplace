# Muse Marketplace — Listing Specification (SPEC)

Version 1. This document is the contract every listing, validator, the CLI, the MCP server, and the site are built against.

## Layout

Each listing is one folder:

```
registry/<kind>s/<slug>/
  listing.json      # the manifest (this spec)
  <asset files>     # everything in files[] lives here, nothing else is installed
```

`<kind>` is one of `avatar`, `persona`, `voice`, `bundle`; the folder is the plural (`avatars/`, `personas/`, `voices/`, `bundles/`). The folder name MUST equal `slug`.

`registry/index.json` is a **generated** aggregate of all listings (plus counts), produced by `muse-marketplace index`. It is never hand-edited; CI rebuilds it and fails on drift. Generation is deterministic: listings are sorted by slug and `generatedAt` is the newest listing `updatedAt`, so unchanged registries rebuild byte-identically.

## listing.json schema

| Field | Type | Required | Notes |
|---|---|---|---|
| `slug` | string | yes | kebab-case (`^[a-z0-9]+(-[a-z0-9]+)*$`), equals the folder name |
| `name` | string | yes | Display name |
| `kind` | enum | yes | `avatar` \| `persona` \| `voice` \| `bundle` |
| `version` | string | yes | Semver (`1.0.0`, prerelease/build suffixes allowed) |
| `author` | object | yes | `{ name: string, handle: string }` — handle is the author's public handle (e.g. `@CloudCorpRecords`) |
| `description` | string | yes | One line; used in cards and search |
| `longDescription` | string | yes | Full detail-page copy |
| `tags` | string[] | yes | Lowercase search/filter tags |
| `license` | string | yes | SPDX-style identifier (launch catalog: `MIT`) |
| `modes` | object[] | avatars only | See below |
| `files` | object[] | yes | Non-empty. See below |
| `preview` | object | yes | `{ static: string, animated: string }` — both MUST be paths listed in `files[]` |
| `compatibility` | object | yes | `{ muse: string }` — a semver range for Muse, e.g. `">=1.0"` |
| `safety` | object | yes | `{ vetted: boolean, notes: string }` — `vetted` is set by reviewers per VETTING.md, never self-asserted in a first submission |
| `createdAt` / `updatedAt` | string | yes | ISO 8601 timestamps |
| `bundleContents` | string[] | bundles only | Slugs this bundle references |

### modes[] (avatars)

Each entry: `{ id: string, label: string, asset: string, loop: boolean }`.

- `asset` MUST be listed in `files[]`, MUST exist on disk, and MUST NOT contain path traversal.
- Avatars MUST define at minimum: `idle`, `working`, `thinking`, `celebrating`.
- Optional modes: `making`, `milestone`, `dance`, `error`. See [MODES.md](MODES.md).
- `loop` states whether the mode animation loops (ambient modes loop; one-shot modes like `celebrating` may still loop in preview — the flag is the author's intent for the host app).

### files[]

Each entry: `{ path: string, sha256: string, bytes: number, mediaType: string }`.

- `path` is relative to the listing folder. Absolute paths, drive letters, and any `..` segment are **rejected**.
- `sha256` is the lowercase hex SHA-256 of the file bytes; `bytes` is its exact size. Both are recomputed by validation and by install (before and after copy).
- `mediaType` MUST be on the allowlist:
  `image/svg+xml`, `image/png`, `image/jpeg`, `image/gif`, `image/webp`, `text/markdown`, `text/plain`, `application/json`, `audio/mpeg`, `audio/wav`, `audio/ogg`, `audio/webm`.
- Executable/script extensions are **rejected regardless of declared media type**: `.exe .dll .so .dylib .sh .bash .zsh .bat .cmd .ps1 .js .mjs .cjs .ts .tsx .jsx .py .rb .pl .php .jar .class .com .scr .msi .app .deb .rpm .bin .run`.

## Validation

`muse-marketplace validate <slug|path>` checks, in order: manifest presence and all required fields, slug/folder match, semver, `files[]` traversal + extension + media-type rules, file existence, byte size, sha256 match, `preview` membership in `files[]`, avatar mode completeness + mode asset membership, and bundle `bundleContents` presence. Any failure is reported individually and exits non-zero.

## Install semantics

`install <slug> --dest <dir>`:

1. Validates the listing. **Any problem → refuse, copy nothing.**
2. For each file: verify sha256 on the source, copy to `<dest>/<slug>/<path>`, verify sha256 on the copy.
3. Write `<dest>/<slug>/install-receipt.json` with the slug, version, timestamp, destination, the verified file list, and `verified: true`.

## Example (abridged — real listing: `registry/avatars/jolly/listing.json`)

```json
{
  "slug": "jolly",
  "name": "Jolly",
  "kind": "avatar",
  "version": "1.0.0",
  "author": { "name": "Rene Turcios", "handle": "@CloudCorpRecords" },
  "description": "The friendly green companion…",
  "tags": ["companion", "default", "friendly", "green"],
  "license": "MIT",
  "modes": [{ "id": "idle", "label": "Idle", "asset": "assets/idle.svg", "loop": true }],
  "files": [{ "path": "assets/idle.svg", "sha256": "<64 hex chars>", "bytes": 1234, "mediaType": "image/svg+xml" }],
  "preview": { "static": "assets/idle.svg", "animated": "assets/working.svg" },
  "compatibility": { "muse": ">=1.0" },
  "safety": { "vetted": true, "notes": "Original SVG artwork only…" },
  "createdAt": "2026-10-25T00:00:00.000Z",
  "updatedAt": "2026-10-25T00:00:00.000Z"
}
```
