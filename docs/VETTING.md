# Vetting & safety model

The standing rule for this marketplace — the same rule Rene runs across the whole fleet: **anything listed as safe must be validated with real checks.** A badge here is a claim with evidence behind it, not a vibe.

## What "vetted" means

`safety.vetted: true` on a listing means a reviewer (not the author) ran the full checklist below against the exact bytes in the PR, and the `safety.notes` field records what was checked. Until then a listing ships as `vetted: false` and the site/CLI display it as *unvetted* — visible, installable, but honestly labeled.

## Automated gates (run in CI and by `validate` / `install`)

1. **Schema** — every required SPEC field present and well-formed; slug == folder; semver valid.
2. **Allowlisted media types only** — SVG/PNG/JPEG/GIF/WebP, markdown, plain text, JSON, and audio (mp3/wav/ogg/webm). Anything else fails.
3. **No executables** — a blocked-extension list (`.exe`, `.sh`, `.js`, `.py`, …) is rejected even if the declared media type lies.
4. **Checksums** — every file's sha256 + byte size recomputed and compared. Mismatch = invalid listing; install refuses it before copying, and re-verifies after copying.
5. **Path safety** — absolute paths, drive letters, and `..` segments are rejected in `files[]`, mode assets, and previews. Install destinations cannot escape the caller's `--dest` (CLI) or the current working directory (MCP).
6. **Index integrity** — `registry/index.json` must be exactly what the generator produces from the listings on disk.

## Reviewer checklist (human, per PR)

- [ ] Ran `muse-marketplace validate <slug>` and `npm test` locally — both green.
- [ ] Opened every asset: SVGs are self-contained (no `<script>`, no external `href`/`url()` references, no embedded foreign content); images are what the listing says they are.
- [ ] Read every text asset **in full** — for personas this is the whole review: voice and habits only, no instructions to override host safety rules, no exfiltration or deception patterns.
- [ ] Checked the artwork/text is original or properly licensed, and `license` matches.
- [ ] Confirmed modes: avatars genuinely change expression/prop/motion per mode (not the same file four times — checksums would collide, which is itself a smell).
- [ ] Set `safety.vetted: true` and wrote `safety.notes` naming what was checked and when — in the reviewer's commit, not the author's.

## What vetting is not

- Not a guarantee about taste, quality, or how a persona will behave in every host. It is a guarantee about *contents*: the bytes are what the manifest claims, they are inert media/text, and a human read them.
- Not permanent. A follow-up PR that changes any asset returns the listing to unvetted until re-reviewed.

## Reporting a problem

Found a listing that is malicious, mislabeled, or infringing? See [SECURITY.md](../SECURITY.md) — report privately first; confirmed-bad listings are pulled, not debated in public issues.
