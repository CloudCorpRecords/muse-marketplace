# Publishing a listing

Listings land by pull request. There is no upload form and no central account — the registry *is* this repo.

## Steps

1. **Scaffold**

   ```bash
   npm install && npm run build
   node dist/cli.js init my-avatar --kind avatar   # or persona | voice | bundle
   ```

   This creates `registry/avatars/my-avatar/` with a template `listing.json` and placeholder assets whose checksums are already correct.

2. **Make it yours**
   - Replace the placeholder SVGs (avatars: one per mode — `idle`, `working`, `thinking`, `celebrating` required) or write your `persona.md` / voice samples / bundle manifest.
   - Edit `listing.json`: real `name`, `description`, `longDescription`, `tags`, your `author` name + handle.
   - Keep `safety.vetted` as `false`. Vetting is a review step (see VETTING.md), not a self-declaration.

3. **Fix the checksums.** Any time you change an asset, its `sha256` and `bytes` in `files[]` must match. The fastest loop: edit, run validate, copy the actual values it reports — or regenerate your entries with a sha256 tool.

4. **Validate + regenerate the index**

   ```bash
   node dist/cli.js validate my-avatar   # must be clean
   node dist/cli.js index                # rebuilds registry/index.json
   node dist/cli.js doctor               # whole registry still healthy
   npm test                              # the full suite, including your listing
   ```

5. **Open the PR** against this repo with the PR template filled in. Include: the listing folder, the regenerated `registry/index.json`, and (for the site) a regenerated `site/data.json` — run the same commands CI runs:

   ```bash
   npm run build && npm test
   ```

   CI re-runs install/build/test, validates the whole registry, and rebuilds the index and **fails on drift** — if it fails, you skipped step 4.

## Rules that will get a PR sent back

- Executable or script files of any kind. The allowlist is media + text + JSON only (SPEC.md).
- Hand-edited `registry/index.json`.
- `safety.vetted: true` in a first submission.
- Assets you don't have the rights to ship, or artwork copied from another avatar. Original or properly licensed only; state the license in `listing.json`.
- Persona files containing instructions designed to override a host's safety rules. A persona is a voice and a set of habits, not a jailbreak.
- External references inside SVGs (remote images/fonts/scripts). SVGs must be self-contained.

## Versioning

Bump `version` (semver) and `updatedAt` whenever you change a listing's assets or manifest in a follow-up PR. Breaking visual changes (different character) = major; new modes = minor; fixes = patch.
