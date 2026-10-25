# Roadmap

## v0.1.0 — Launch (this release)

- Registry format + SPEC, generated index, full validation (schema, checksums, media allowlist, path safety).
- CLI: list / search / show / validate / install / init / index / doctor.
- MCP server: search / list / show / validate / install.
- Static site with animated mode switcher.
- Launch catalog: 6 avatars, 2 personas, 1 bundle — all original, all vetted.

## Next

- **Voice kind, for real** — voice listings ship audio samples; the site gets an inline player and validation adds duration/format sniffing.
- **`publish` command** — scaffold → validate → branch → PR, in one command, so publishing is not a git tutorial.
- **Signed listings** — author signatures over the manifest so checksums chain to an identity, not just to themselves.
- **Muse native sharing integration** — when Muse's avatar sharing ships, one-command export of a marketplace avatar into the native format (and import the other way).
- **Ratings & notes** — lightweight, file-based community signal stored in-repo, moderated like listings.

## Later

- **Federation** — other people run registries; this CLI searches across them, vetting status travels with the listing.
- **Preview rendering service** — server-side animated previews (GIF/WebP) generated in CI from the SVG modes, so clients that cannot run SVG animation still show motion.
- **Persona diffing & safety re-checks** — persona changes get a readable diff in the PR and an automated scan for override/exfiltration phrasing before human review.

## Non-goals

- No payments, no accounts, no hosted uploads. Files + PRs + checksums carry the whole thing until they demonstrably can't.
- No executable content, ever. That line does not move.
