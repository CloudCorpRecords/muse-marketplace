# Muse Marketplace

**The open marketplace & registry for shareable Muse assets.**

Muse users will soon be able to share Muse Avatars with each other — an avatar sharing pop-up, animated previews of avatar "modes" like *Working*, the works. But sharing needs somewhere to live: an open registry where anyone can publish an avatar, persona, voice, or bundle, where every file carries a checksum, and where "safe" means *actually checked*, not just claimed.

That is this repo. We are building the Muse Avatar marketplace — starting now, in the open.

```bash
npx @reneturcios/muse-marketplace list
npx @reneturcios/muse-marketplace search tree
npx @reneturcios/muse-marketplace show jolly
npx @reneturcios/muse-marketplace install jolly
npx @reneturcios/muse-marketplace doctor
```

Or browse it as a site: open `site/index.html` (or the GitHub Pages deploy) — a dark, searchable grid with an animated mode switcher on every avatar.

## What's inside

- **`registry/`** — The registry itself. Every listing is a folder `registry/<kind>s/<slug>/` with a `listing.json` + its asset files. Kinds: `avatar` (primary), `persona`, `voice`, `bundle`. `registry/index.json` is **generated** from the listings (`muse-marketplace index`), never hand-edited; CI fails on drift.
- **Launch catalog (9 listings, all original, all installable)** — 6 avatars: **Jolly** (the friendly green companion), **Tree** (a forest spirit), **Straw Hat Explorer**, **Neon Founder**, **Cozy Scholar**, **Pixel Sprite** — each with an original animated SVG per mode (idle / working / thinking / celebrating, plus extras like making, dance, milestone, error). 2 personas: **Sharp Operator**, **Warm Companion**. 1 bundle: **Starter Pack** (everything).
- **CLI + MCP in one bin** — `muse-marketplace` (alias `mmkt`) for humans; the same binary is an MCP server (`muse-marketplace mcp`) exposing `marketplace_search`, `marketplace_list`, `marketplace_show`, `marketplace_validate`, `marketplace_install`.
- **`site/`** — A zero-build static marketplace: search, filter by kind + tag, click a card for the animated mode switcher and a copyable install command.
- **`docs/`** — [SPEC](docs/SPEC.md) (the listing schema), [PUBLISHING](docs/PUBLISHING.md) (submit via PR), [VETTING](docs/VETTING.md) (the safety model), [MODES](docs/MODES.md), [ARCHITECTURE](docs/ARCHITECTURE.md), [ROADMAP](docs/ROADMAP.md).

## Quickstart

```bash
npm install
npm run build
npm test

node dist/cli.js list
node dist/cli.js install jolly --dest ./muse-assets   # copies files, verifies sha256 before AND after, writes install-receipt.json
node dist/cli.js init my-avatar --kind avatar          # scaffold a listing of your own
node dist/cli.js validate my-avatar
node dist/cli.js index                                  # rebuild registry/index.json
node dist/cli.js doctor                                 # registry health
```

## Publish a listing

1. `muse-marketplace init <your-slug> --kind avatar`
2. Replace the placeholder SVGs / `persona.md` with your real assets.
3. Run `muse-marketplace validate <your-slug>` until clean, then `muse-marketplace index`.
4. Open a PR. Full walkthrough: [docs/PUBLISHING.md](docs/PUBLISHING.md).

## The vetting / safety model (short version)

Nothing gets to call itself safe here without receipts — the same rule we run across the fleet: *anything listed as safe must be validated with real checks.*

- **No executables, ever.** Only allowlisted media types (SVG/PNG/JPEG/GIF/WebP, markdown, plain text, JSON, audio). Validation rejects executable extensions outright.
- **Checksums on everything.** Every file in every listing records its sha256 + byte size. `validate` recomputes them; `install` verifies before *and* after copying and **refuses tampered listings**.
- **Path safety.** Absolute paths and `..` traversal entries are rejected; installs stay inside the destination you name.
- **Vetted is earned.** `safety.vetted` flips to `true` only after the [VETTING.md](docs/VETTING.md) checklist is run by a reviewer — not by the author checking their own box.
- Personas are plain markdown you can read in full before using — the file *is* the payload, nothing hidden.

Full model: [docs/VETTING.md](docs/VETTING.md) · Security reports: [SECURITY.md](SECURITY.md)

## MCP usage

```json
{ "mcpServers": { "muse-marketplace": { "command": "npx", "args": ["-y", "@reneturcios/muse-marketplace", "mcp"] } } }
```

Tools: `marketplace_search` · `marketplace_list` · `marketplace_show` · `marketplace_validate` · `marketplace_install` (install is confined to a caller-provided destination under the current working directory).

## Roadmap

Ratings & reviews, signed listings, voice previews in the site player, a `publish` command that opens the PR for you, federation with other registries, and first-class wiring for Muse's native avatar sharing when it lands. Detail: [docs/ROADMAP.md](docs/ROADMAP.md).

MIT. By Rene Turcios / CloudCorpRecords. Fleet: https://github.com/CloudCorpRecords
