# Architecture

One repo, three surfaces, one source of truth: the listing folders on disk.

```
registry/            SOURCE OF TRUTH — one folder per listing (manifest + assets)
registry/index.json  GENERATED aggregate (never hand-edited; CI fails on drift)
src/registry.ts      All registry logic: load, validate, search, index, install, doctor, scaffold
src/cli.ts           Human CLI (muse-marketplace / mmkt) — thin wrapper over registry.ts
src/mcp.ts           MCP server (same bin, `mcp` subcommand) — same functions, agent surface
src/types.ts         The Listing/Index types mirroring docs/SPEC.md
site/                Zero-build static site; renders site/data.json (a generated copy of
                     the index joined with per-listing detail + asset paths)
test/                node:test suites run via tsx: registry behavior + a live MCP stdio handshake
```

## Design decisions

- **Files are the database.** A listing is a folder anyone can read, diff, and PR. No server, no accounts, no hidden state — the marketplace works from a git clone, a static host, or an npm tarball.
- **Generated index, deterministic.** `buildIndex()` sorts by slug and derives `generatedAt` from the newest `updatedAt`, so rebuilding an unchanged registry is byte-identical and CI drift checks are meaningful.
- **Validation is one function.** CLI `validate`, MCP `marketplace_validate`, `install`'s pre-flight, `doctor`, and the test suite all call the same `validateListing()`. There is no second, weaker check anywhere.
- **Install is paranoid by default.** Validate → verify source checksum → copy → verify copied checksum → write receipt. Any failure aborts; a tampered listing installs nothing.
- **MCP is read-mostly.** Four of five tools only read. `marketplace_install` is confined to a caller-provided destination under the process working directory.
- **Fleet factory pattern.** TypeScript, Node ≥ 20, CLI + MCP in one bin, only `@modelcontextprotocol/sdk` + `zod` as runtime deps, tests via `tsx --test`, `server.json` + `Dockerfile` (with the MCP Registry name label) — the same shape as ProdForge and the rest of the CloudCorpRecords fleet, so contributors who know one repo know them all.
- **The site is a view, not a fork.** `site/data.json` is generated from the registry; the page renders whatever the registry contains, including mode assets straight from the listing folders (paths are rewritten to `../registry/…` for local use and can be re-based for GitHub Pages).
