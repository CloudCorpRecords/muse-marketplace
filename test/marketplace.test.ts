import { test } from "node:test";
import assert from "node:assert/strict";
import { cpSync, existsSync, mkdtempSync, readFileSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  loadAllListings, validateListing, buildIndex, writeIndex, searchListings,
  installListing, findListing, scaffoldListing, doctorRegistry, findRegistryRoot,
} from "../src/registry.js";
import type { Listing } from "../src/types.js";

const root = findRegistryRoot();

test("registry has at least 8 seed listings: 6 avatars, 2 personas, 1 bundle", () => {
  const all = loadAllListings(root);
  assert.ok(all.length >= 8, `expected >=8 listings, got ${all.length}`);
  const byKind = (k: string) => all.filter((x) => x.listing.kind === k).length;
  assert.equal(byKind("avatar"), 6);
  assert.equal(byKind("persona"), 2);
  assert.equal(byKind("bundle"), 1);
});

test("every seed listing validates clean", () => {
  for (const { listing, dir } of loadAllListings(root)) {
    assert.deepEqual(validateListing(listing, dir), [], `${listing.slug} should validate clean`);
  }
});

test("every avatar has the 4 required modes", () => {
  for (const { listing } of loadAllListings(root).filter((x) => x.listing.kind === "avatar")) {
    const ids = (listing.modes ?? []).map((m) => m.id);
    for (const req of ["idle", "working", "thinking", "celebrating"]) assert.ok(ids.includes(req), `${listing.slug} missing ${req}`);
  }
});

test("index generation is deterministic and matches registry/", () => {
  const a = buildIndex(root);
  const b = buildIndex(root);
  assert.deepEqual(a, b);
  const onDisk = JSON.parse(readFileSync(join(root, "index.json"), "utf8"));
  assert.deepEqual(onDisk, a, "registry/index.json is stale — run `muse-marketplace index`");
  assert.equal(a.listings.length, loadAllListings(root).length);
});

test("search finds by name, tag, and description", () => {
  assert.ok(searchListings("Jolly", root).some((l) => l.slug === "jolly"));
  assert.ok(searchListings("nature", root).some((l) => l.slug === "tree"));
  assert.ok(searchListings("forest spirit", root).some((l) => l.slug === "tree"));
  assert.ok(searchListings("persona", root).length >= 2);
  assert.equal(searchListings("zzz-no-such-thing", root).length, 0);
});

test("install copies files, writes receipt, checksums verify", () => {
  const dest = mkdtempSync(join(tmpdir(), "mmkt-install-"));
  try {
    const result = installListing("jolly", dest, root);
    assert.ok(existsSync(join(result.dest, "assets/idle.svg")));
    assert.ok(existsSync(result.receiptPath));
    const receipt = JSON.parse(readFileSync(result.receiptPath, "utf8"));
    assert.equal(receipt.slug, "jolly");
    assert.equal(receipt.verified, true);
    assert.equal(receipt.files.length, findListing("jolly", root)!.listing.files.length);
  } finally { rmSync(dest, { recursive: true, force: true }); }
});

test("install REFUSES a tampered listing", () => {
  const tmpRoot = mkdtempSync(join(tmpdir(), "mmkt-reg-"));
  const dest = mkdtempSync(join(tmpdir(), "mmkt-dest-"));
  try {
    cpSync(root, tmpRoot + "/registry", { recursive: true });
    const tamperedPath = join(tmpRoot, "registry", "avatars", "jolly", "assets", "idle.svg");
    writeFileSync(tamperedPath, readFileSync(tamperedPath, "utf8") + "<!-- tampered -->");
    assert.throws(() => installListing("jolly", dest, join(tmpRoot, "registry")), /tampered|checksum|byte size/);
  } finally { rmSync(tmpRoot, { recursive: true, force: true }); rmSync(dest, { recursive: true, force: true }); }
});

test("validate rejects an executable file entry", () => {
  const tmp = mkdtempSync(join(tmpdir(), "mmkt-exe-"));
  try {
    const dir = scaffoldListing("exe-test", "avatar", tmp);
    const { listing } = { listing: JSON.parse(readFileSync(join(dir, "listing.json"), "utf8")) as Listing };
    writeFileSync(join(dir, "evil.js"), "console.log(1)");
    listing.files.push({ path: "evil.js", sha256: "0".repeat(64), bytes: 15, mediaType: "text/javascript" });
    const problems = validateListing(listing, dir);
    assert.ok(problems.some((p) => p.includes("evil.js")), `expected rejection, got: ${problems.join("; ")}`);
  } finally { rmSync(tmp, { recursive: true, force: true }); }
});

test("validate rejects a path-traversal entry", () => {
  const tmp = mkdtempSync(join(tmpdir(), "mmkt-trav-"));
  try {
    const dir = scaffoldListing("trav-test", "avatar", tmp);
    const listing = JSON.parse(readFileSync(join(dir, "listing.json"), "utf8")) as Listing;
    listing.files.push({ path: "../escape.svg", sha256: "0".repeat(64), bytes: 1, mediaType: "image/svg+xml" });
    const problems = validateListing(listing, dir);
    assert.ok(problems.some((p) => p.toLowerCase().includes("traversal") || p.includes("escape")), `expected traversal rejection, got: ${problems.join("; ")}`);
  } finally { rmSync(tmp, { recursive: true, force: true }); }
});

test("init scaffolds a valid listing", () => {
  const tmp = mkdtempSync(join(tmpdir(), "mmkt-init-"));
  try {
    // scaffoldListing expects a registry root; build one inside tmp.
    const regRoot = join(tmp, "registry");
    const dir = scaffoldListing("brand-new", "avatar", regRoot);
    const listing = JSON.parse(readFileSync(join(dir, "listing.json"), "utf8")) as Listing;
    assert.deepEqual(validateListing(listing, dir), []);
    assert.equal(listing.slug, "brand-new");
  } finally { rmSync(tmp, { recursive: true, force: true }); }
});

test("doctor reports a healthy registry", () => {
  const report = doctorRegistry(root);
  assert.equal(report.broken.length, 0);
  assert.equal(report.total, loadAllListings(root).length);
});

test("writeIndex round-trips", () => {
  const idx = writeIndex(root);
  const onDisk = JSON.parse(readFileSync(join(root, "index.json"), "utf8"));
  assert.deepEqual(onDisk, idx);
});
