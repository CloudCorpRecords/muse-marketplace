#!/usr/bin/env node
import { findListing, loadAllListings, searchListings, validateBySlugOrPath, installListing, scaffoldListing, writeIndex, doctorRegistry, findRegistryRoot, KINDS } from "./registry.js";

const VERSION = "0.1.0";
const args = process.argv.slice(2);
const cmd = args[0] || "help";
const asJson = args.includes("--json");
const positional = args.filter((a) => !a.startsWith("--"));

function flagValue(name: string): string | undefined {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
}
function printListingLine(l: { slug: string; name: string; kind: string; version: string; description: string; safety: { vetted: boolean } }): void {
  console.log(`${l.slug.padEnd(22)} [${l.kind}] v${l.version} ${l.safety.vetted ? "✓ vetted" : "○ unvetted"} — ${l.description}`);
}
function help(): void {
  console.log(`muse-marketplace ${VERSION}  (alias: mmkt)
The open marketplace & registry for shareable Muse assets — avatars, personas, voices, bundles.

Usage:
  muse-marketplace list [--kind avatar|persona|voice|bundle] [--tag <tag>] [--json]
  muse-marketplace search <query> [--json]
  muse-marketplace show <slug> [--json]
  muse-marketplace validate <slug|path> [--json]
  muse-marketplace install <slug> [--dest <dir>] [--json]
  muse-marketplace init <slug> --kind avatar|persona|voice|bundle
  muse-marketplace index [--json]        Rebuild registry/index.json from listings
  muse-marketplace doctor [--json]       Registry health: counts, broken, unvetted
  muse-marketplace mcp                   Run the MCP server (stdio)
  muse-marketplace --version
`);
}

async function main(): Promise<void> {
  if (cmd === "--version" || cmd === "version") { console.log(VERSION); return; }
  if (cmd === "mcp") { const { runMcp } = await import("./mcp.js"); await runMcp(); return; }
  if (cmd === "help" || cmd === "--help" || cmd === "-h") { help(); return; }
  const root = flagValue("--root");

  if (cmd === "list") {
    const kind = flagValue("--kind");
    const tag = flagValue("--tag");
    let items = loadAllListings(root).map((x) => x.listing);
    if (kind) items = items.filter((l) => l.kind === kind);
    if (tag) items = items.filter((l) => l.tags.includes(tag));
    if (asJson) { console.log(JSON.stringify(items, null, 2)); return; }
    for (const l of items) printListingLine(l);
    console.log(`\n${items.length} listing(s).`);
    return;
  }
  if (cmd === "search") {
    const query = positional[1] ?? args[1] ?? "";
    if (!query) { console.error("Usage: muse-marketplace search <query>"); process.exitCode = 1; return; }
    const results = searchListings(query, root);
    if (asJson) { console.log(JSON.stringify(results, null, 2)); return; }
    for (const l of results) printListingLine(l);
    console.log(`\n${results.length} result(s) for "${query}".`);
    return;
  }
  if (cmd === "show") {
    const slug = positional[1];
    if (!slug) { console.error("Usage: muse-marketplace show <slug>"); process.exitCode = 1; return; }
    const found = findListing(slug, root);
    if (!found) { console.error(`Listing not found: ${slug}`); process.exitCode = 1; return; }
    if (asJson) { console.log(JSON.stringify(found.listing, null, 2)); return; }
    const l = found.listing;
    console.log(`${l.name} (${l.slug}) — ${l.kind} v${l.version}`);
    console.log(`By ${l.author.name} (${l.author.handle}) · License: ${l.license} · ${l.safety.vetted ? "✓ Vetted" : "○ Not vetted"}`);
    console.log(`\n${l.longDescription}`);
    console.log(`\nTags: ${l.tags.join(", ")}`);
    if (l.modes?.length) console.log(`Modes: ${l.modes.map((m) => m.id).join(", ")}`);
    if (l.bundleContents?.length) console.log(`Bundle contents: ${l.bundleContents.join(", ")}`);
    console.log(`Files: ${l.files.map((f) => f.path).join(", ")}`);
    console.log(`Install: npx @reneturcios/muse-marketplace install ${l.slug}`);
    return;
  }
  if (cmd === "validate") {
    const target = positional[1];
    if (!target) { console.error("Usage: muse-marketplace validate <slug|path>"); process.exitCode = 1; return; }
    const { listing, problems } = validateBySlugOrPath(target, root);
    if (asJson) { console.log(JSON.stringify({ slug: listing?.slug ?? target, valid: problems.length === 0, problems }, null, 2)); }
    else if (problems.length === 0) console.log(`✓ ${listing.slug} is valid — schema, files, checksums, media types, and paths all check out.`);
    else { console.log(`✗ ${target} is INVALID:`); for (const p of problems) console.log(`  - ${p}`); }
    process.exitCode = problems.length === 0 ? 0 : 1;
    return;
  }
  if (cmd === "install") {
    const slug = positional[1];
    if (!slug) { console.error("Usage: muse-marketplace install <slug> [--dest <dir>]"); process.exitCode = 1; return; }
    const dest = flagValue("--dest") ?? "./muse-assets";
    try {
      const result = installListing(slug, dest, root);
      if (asJson) console.log(JSON.stringify({ slug, dest: result.dest, receipt: result.receiptPath, verified: true }, null, 2));
      else console.log(`✓ Installed ${slug} v${result.listing.version} → ${result.dest}\n  Checksums verified before and after copy. Receipt: ${result.receiptPath}`);
    } catch (err) {
      console.error(err instanceof Error ? err.message : String(err));
      process.exitCode = 1;
    }
    return;
  }
  if (cmd === "init") {
    const slug = positional[1];
    const kind = flagValue("--kind") ?? "avatar";
    if (!slug) { console.error(`Usage: muse-marketplace init <slug> --kind ${KINDS.join("|")}`); process.exitCode = 1; return; }
    try {
      const dir = scaffoldListing(slug, kind, root);
      console.log(`✓ Scaffolded ${kind} listing "${slug}" in ${dir}\n  Edit listing.json, replace the placeholder assets, then run: muse-marketplace validate ${slug}`);
    } catch (err) { console.error(err instanceof Error ? err.message : String(err)); process.exitCode = 1; }
    return;
  }
  if (cmd === "index") {
    const idx = writeIndex(root);
    if (asJson) console.log(JSON.stringify(idx.counts, null, 2));
    else console.log(`✓ Rebuilt registry/index.json — ${idx.counts.total} listings (avatars ${idx.counts.avatar}, personas ${idx.counts.persona}, voices ${idx.counts.voice}, bundles ${idx.counts.bundle}). Registry root: ${findRegistryRoot(root)}`);
    return;
  }
  if (cmd === "doctor") {
    const report = doctorRegistry(root);
    if (asJson) { console.log(JSON.stringify(report, null, 2)); return; }
    console.log(`Registry health — ${report.total} listings`);
    console.log(`  avatars: ${report.counts.avatar} · personas: ${report.counts.persona} · voices: ${report.counts.voice} · bundles: ${report.counts.bundle}`);
    console.log(`  broken: ${report.broken.length}`);
    for (const b of report.broken) for (const p of b.problems) console.log(`    ✗ ${b.slug}: ${p}`);
    console.log(`  unvetted: ${report.unvetted.length}${report.unvetted.length ? ` (${report.unvetted.join(", ")})` : ""}`);
    console.log(report.broken.length === 0 ? "✓ Registry is healthy." : "✗ Registry has broken listings — see above.");
    process.exitCode = report.broken.length === 0 ? 0 : 1;
    return;
  }
  console.error(`Unknown command: ${cmd}`);
  help();
  process.exitCode = 1;
}
main().catch((err) => { console.error(err instanceof Error ? err.message : String(err)); process.exit(1); });
