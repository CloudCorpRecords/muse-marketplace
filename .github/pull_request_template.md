## What this PR does

<!-- One or two sentences. If it's a listing, name the slug and kind. -->

## For listing submissions

- [ ] Scaffolded with `muse-marketplace init <slug> --kind <kind>` (or followed the same layout)
- [ ] `muse-marketplace validate <slug>` is clean
- [ ] `muse-marketplace index` run; regenerated `registry/index.json` is included — not hand-edited
- [ ] `npm test` is green locally
- [ ] Assets are original or properly licensed; `license` in listing.json matches
- [ ] No executable/script files; SVGs are self-contained (no scripts or external references)
- [ ] Persona files (if any) read as voice/habits only — no instructions to override host safety rules
- [ ] `safety.vetted` is **false** in this PR (a reviewer flips it after the VETTING.md checklist)
- [ ] `version` and `updatedAt` bumped if this changes an existing listing

## For code changes

- [ ] `npm run build` and `npm test` are green
- [ ] New behavior has a test
- [ ] Validation changes (if any) are in `src/registry.ts` only — CLI, MCP, install, and doctor all share it
