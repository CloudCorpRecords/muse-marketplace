# Contributing

Thanks for helping build the Muse Marketplace. Two kinds of contributions matter here: **code** (CLI, MCP, validation, site) and **listings** (avatars, personas, voices, bundles).

## Listings

Follow [docs/PUBLISHING.md](docs/PUBLISHING.md) exactly — scaffold with `init`, validate clean, regenerate the index, keep `safety.vetted: false` (reviewers set it), and fill in the PR template checklist. Original or properly licensed assets only.

## Code

```bash
npm install
npm run build
npm test
```

- TypeScript, Node ≥ 20, ESM. Runtime deps stay at `@modelcontextprotocol/sdk` + `zod` — argue hard before adding a third.
- Validation logic lives in `src/registry.ts` and is shared by CLI, MCP, install, doctor, and tests. Do not fork a second validator.
- Every behavior change ships with a test. The seed registry must always validate clean and the generated index must match (`muse-marketplace index`).
- After writing any JSON by hand, parse-check it before committing.

## Ground rules

- No executable content in listings — the allowlist in docs/SPEC.md is final.
- Never hand-edit `registry/index.json` or `site/data.json`; they are generated.
- Be kind; see CODE_OF_CONDUCT.md.
