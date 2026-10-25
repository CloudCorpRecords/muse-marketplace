import { createHash } from "node:crypto";
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, normalize, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import type { Listing, RegistryIndex } from "./types.js";

export const KINDS = ["avatar", "persona", "voice", "bundle"] as const;
export const REQUIRED_AVATAR_MODES = ["idle", "working", "thinking", "celebrating"] as const;
export const OPTIONAL_AVATAR_MODES = ["making", "milestone", "dance", "error"] as const;
export const ALLOWED_MEDIA_TYPES = new Set([
  "image/svg+xml", "image/png", "image/jpeg", "image/gif", "image/webp",
  "text/markdown", "text/plain", "application/json",
  "audio/mpeg", "audio/wav", "audio/ogg", "audio/webm",
]);
export const BLOCKED_EXTENSIONS = new Set([
  ".exe", ".dll", ".so", ".dylib", ".sh", ".bash", ".zsh", ".bat", ".cmd", ".ps1",
  ".js", ".mjs", ".cjs", ".ts", ".tsx", ".jsx", ".py", ".rb", ".pl", ".php",
  ".jar", ".class", ".com", ".scr", ".msi", ".app", ".deb", ".rpm", ".bin", ".run",
]);
const SEMVER = /^\d+\.\d+\.\d+(-[0-9A-Za-z.-]+)?(\+[0-9A-Za-z.-]+)?$/;
const SLUG_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export function sha256File(path: string): string {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}
export function sha256Buffer(buf: Buffer): string {
  return createHash("sha256").update(buf).digest("hex");
}

export function findRegistryRoot(explicit?: string): string {
  if (explicit) return resolve(explicit);
  if (process.env.MUSE_MARKETPLACE_REGISTRY) return resolve(process.env.MUSE_MARKETPLACE_REGISTRY);
  const here = dirname(fileURLToPath(import.meta.url));
  const candidates = [
    join(process.cwd(), "registry"),
    join(here, "..", "registry"),
    join(here, "../..", "registry"),
  ];
  for (const c of candidates) if (existsSync(c)) return c;
  return candidates[0];
}

export function kindDir(kind: string): string { return `${kind}s`; }

export function listListingDirs(root: string): string[] {
  const dirs: string[] = [];
  for (const kind of KINDS) {
    const kd = join(root, kindDir(kind));
    if (!existsSync(kd)) continue;
    for (const entry of readdirSync(kd).sort()) {
      const full = join(kd, entry);
      if (statSync(full).isDirectory() && existsSync(join(full, "listing.json"))) dirs.push(full);
    }
  }
  return dirs.sort();
}

export function loadListing(dir: string): Listing {
  return JSON.parse(readFileSync(join(dir, "listing.json"), "utf8")) as Listing;
}

export function loadAllListings(root?: string): { listing: Listing; dir: string }[] {
  const r = findRegistryRoot(root);
  return listListingDirs(r).map((dir) => ({ listing: loadListing(dir), dir }));
}

export function findListing(slug: string, root?: string): { listing: Listing; dir: string } | null {
  for (const item of loadAllListings(root)) if (item.listing.slug === slug) return item;
  return null;
}

function isPathTraversal(p: string): boolean {
  if (p.startsWith("/") || p.startsWith("\\")) return true;
  if (/^[a-zA-Z]:/.test(p)) return true;
  const parts = p.split(/[\\/]/);
  if (parts.includes("..")) return true;
  return false;
}

export function validateListing(listing: Listing, dir: string): string[] {
  const problems: string[] = [];
  const push = (m: string) => problems.push(m);
  if (!listing || typeof listing !== "object") return ["listing is not an object"];
  if (!listing.slug) push("missing slug");
  else if (!SLUG_RE.test(listing.slug)) push(`slug is not kebab-case: ${listing.slug}`);
  const folder = dir.split(sep).pop();
  if (folder && listing.slug && folder !== listing.slug) push(`slug ${listing.slug} does not match folder ${folder}`);
  if (!listing.name) push("missing name");
  if (!KINDS.includes(listing.kind as never)) push(`invalid kind: ${listing.kind}`);
  if (!listing.version || !SEMVER.test(listing.version)) push(`invalid semver version: ${listing.version}`);
  if (!listing.author?.name || !listing.author?.handle) push("missing author.name or author.handle");
  if (!listing.description) push("missing description");
  if (!listing.longDescription) push("missing longDescription");
  if (!Array.isArray(listing.tags)) push("tags must be an array");
  if (!listing.license) push("missing license");
  if (!listing.compatibility?.muse) push("missing compatibility.muse");
  if (!listing.safety || typeof listing.safety.vetted !== "boolean") push("missing safety.vetted boolean");
  if (!listing.createdAt || !listing.updatedAt) push("missing createdAt/updatedAt");
  if (!listing.preview?.static || !listing.preview?.animated) push("missing preview.static/preview.animated");
  if (!Array.isArray(listing.files) || listing.files.length === 0) push("files must be a non-empty array");

  const filePaths = new Set<string>();
  for (const f of listing.files ?? []) {
    if (!f.path) { push("file entry missing path"); continue; }
    filePaths.add(f.path);
    if (isPathTraversal(f.path)) { push(`path traversal in file path: ${f.path}`); continue; }
    const ext = (f.path.includes(".") ? "." + f.path.split(".").pop()!.toLowerCase() : "");
    if (BLOCKED_EXTENSIONS.has(ext)) push(`executable/blocked file type not allowed: ${f.path}`);
    if (!ALLOWED_MEDIA_TYPES.has(f.mediaType)) push(`media type not allowed: ${f.mediaType} (${f.path})`);
    const abs = resolve(join(dir, f.path));
    const dirAbs = resolve(dir);
    if (!abs.startsWith(dirAbs + sep) && abs !== dirAbs) { push(`file escapes listing dir: ${f.path}`); continue; }
    if (!existsSync(abs)) { push(`file missing on disk: ${f.path}`); continue; }
    const actualBytes = statSync(abs).size;
    if (f.bytes !== actualBytes) push(`byte size mismatch for ${f.path}: listing says ${f.bytes}, actual ${actualBytes}`);
    const actualSha = sha256File(abs);
    if (f.sha256 !== actualSha) push(`sha256 mismatch for ${f.path}: listing says ${f.sha256}, actual ${actualSha}`);
    if (!/^[a-f0-9]{64}$/.test(f.sha256 ?? "")) push(`sha256 is not lowercase hex for ${f.path}`);
  }

  if (listing.preview) {
    for (const key of ["static", "animated"] as const) {
      const p = listing.preview[key];
      if (p && !filePaths.has(p)) push(`preview.${key} (${p}) is not listed in files[]`);
    }
  }

  if (listing.kind === "avatar") {
    if (!Array.isArray(listing.modes) || listing.modes.length === 0) push("avatar must define modes[]");
    else {
      const ids = listing.modes.map((m) => m.id);
      for (const req of REQUIRED_AVATAR_MODES) if (!ids.includes(req)) push(`avatar missing required mode: ${req}`);
      for (const m of listing.modes) {
        if (!m.id || !m.label || !m.asset) push(`mode missing id/label/asset: ${JSON.stringify(m)}`);
        else if (!filePaths.has(m.asset)) push(`mode ${m.id} asset ${m.asset} is not listed in files[]`);
        if (isPathTraversal(m.asset ?? "")) push(`path traversal in mode asset: ${m.asset}`);
        if (typeof m.loop !== "boolean") push(`mode ${m.id} loop must be boolean`);
      }
    }
  }

  if (listing.kind === "bundle") {
    if (!Array.isArray(listing.bundleContents) || listing.bundleContents.length === 0) push("bundle must define bundleContents[]");
  }
  return problems;
}

export function validateBySlugOrPath(target: string, root?: string): { listing: Listing; dir: string; problems: string[] } {
  // If target is a path to a listing dir or listing.json, validate that.
  const asPath = resolve(target);
  let dir: string | null = null;
  if (existsSync(asPath)) {
    if (statSync(asPath).isDirectory() && existsSync(join(asPath, "listing.json"))) dir = asPath;
    else if (asPath.endsWith("listing.json")) dir = dirname(asPath);
  }
  if (!dir) {
    const found = findListing(target, root);
    if (!found) return { listing: null as never, dir: "", problems: [`listing not found: ${target}`] };
    return { listing: found.listing, dir: found.dir, problems: validateListing(found.listing, found.dir) };
  }
  const listing = loadListing(dir);
  return { listing, dir, problems: validateListing(listing, dir) };
}

export function searchListings(query: string, root?: string): Listing[] {
  const q = query.trim().toLowerCase();
  const all = loadAllListings(root).map((x) => x.listing);
  if (!q) return all;
  return all.filter((l) =>
    l.slug.toLowerCase().includes(q) ||
    l.name.toLowerCase().includes(q) ||
    l.description.toLowerCase().includes(q) ||
    l.longDescription.toLowerCase().includes(q) ||
    l.tags.some((t) => t.toLowerCase().includes(q)) ||
    l.author.name.toLowerCase().includes(q) ||
    l.author.handle.toLowerCase().includes(q),
  );
}

export function buildIndex(root?: string): RegistryIndex {
  const r = findRegistryRoot(root);
  const items = loadAllListings(r);
  const listings = items.map((x) => x.listing).sort((a, b) => a.slug.localeCompare(b.slug));
  const counts: Record<string, number> = { total: listings.length };
  for (const kind of KINDS) counts[kind] = listings.filter((l) => l.kind === kind).length;
  // Deterministic: generatedAt is derived from the newest updatedAt so rebuilds are stable.
  const newest = listings.map((l) => l.updatedAt).sort().pop() ?? "2026-10-25T00:00:00.000Z";
  return {
    version: 1,
    generatedAt: newest,
    description: "Muse Marketplace registry index — generated from registry/*/listing.json. Do not hand-edit; run `muse-marketplace index`.",
    counts,
    listings,
  };
}

export function writeIndex(root?: string): RegistryIndex {
  const r = findRegistryRoot(root);
  const idx = buildIndex(r);
  writeFileSync(join(r, "index.json"), JSON.stringify(idx, null, 2) + "\n");
  return idx;
}

export function doctorRegistry(root?: string): { counts: Record<string, number>; broken: { slug: string; problems: string[] }[]; unvetted: string[]; total: number } {
  const r = findRegistryRoot(root);
  const items = loadAllListings(r);
  const broken: { slug: string; problems: string[] }[] = [];
  const unvetted: string[] = [];
  const counts: Record<string, number> = { total: items.length };
  for (const kind of KINDS) counts[kind] = items.filter((x) => x.listing.kind === kind).length;
  for (const { listing, dir } of items) {
    const problems = validateListing(listing, dir);
    if (problems.length) broken.push({ slug: listing.slug, problems });
    if (!listing.safety?.vetted) unvetted.push(listing.slug);
  }
  return { counts, broken, unvetted, total: items.length };
}

export function installListing(slug: string, destBase: string, root?: string): { dest: string; receiptPath: string; listing: Listing } {
  const found = findListing(slug, root);
  if (!found) throw new Error(`listing not found: ${slug}`);
  const { listing, dir } = found;
  const problems = validateListing(listing, dir);
  if (problems.length) throw new Error(`refusing to install tampered/invalid listing ${slug}: ${problems.join("; ")}`);
  const dest = resolve(join(destBase, slug));
  // Safety: dest must be under the caller-provided destBase.
  const baseAbs = resolve(destBase);
  if (!dest.startsWith(baseAbs + sep) && dest !== baseAbs) throw new Error("install destination escapes the provided dest directory");
  mkdirSync(dest, { recursive: true });
  for (const f of listing.files) {
    const src = join(dir, f.path);
    // Verify checksum BEFORE copy.
    if (sha256File(src) !== f.sha256) throw new Error(`checksum mismatch before copy: ${f.path}`);
    const out = join(dest, f.path);
    mkdirSync(dirname(out), { recursive: true });
    copyFileSync(src, out);
    // Verify checksum AFTER copy.
    if (sha256File(out) !== f.sha256) throw new Error(`checksum mismatch after copy: ${f.path}`);
  }
  const receipt = {
    slug: listing.slug, version: listing.version,
    installedAt: new Date().toISOString(), dest, files: listing.files, verified: true,
  };
  const receiptPath = join(dest, "install-receipt.json");
  writeFileSync(receiptPath, JSON.stringify(receipt, null, 2) + "\n");
  return { dest, receiptPath, listing };
}

export function placeholderSvg(label: string, bg: string, fg: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200"><rect width="200" height="200" rx="24" fill="${bg}"/><circle cx="100" cy="88" r="42" fill="${fg}"/><text x="100" y="160" text-anchor="middle" font-family="sans-serif" font-size="16" fill="#ffffff">${label}</text></svg>\n`;
}

export function scaffoldListing(slug: string, kind: string, root?: string): string {
  if (!SLUG_RE.test(slug)) throw new Error(`slug must be kebab-case: ${slug}`);
  if (!KINDS.includes(kind as never)) throw new Error(`kind must be one of ${KINDS.join(", ")}`);
  const r = findRegistryRoot(root);
  const dir = join(r, kindDir(kind), slug);
  if (existsSync(dir)) throw new Error(`listing already exists: ${dir}`);
  mkdirSync(dir, { recursive: true });
  const now = new Date().toISOString();
  const files: Listing["files"] = [];
  const addFile = (rel: string, content: string, mediaType: string) => {
    const abs = join(dir, rel);
    mkdirSync(dirname(abs), { recursive: true });
    writeFileSync(abs, content);
    const buf = Buffer.from(content);
    files.push({ path: rel, sha256: sha256Buffer(buf), bytes: buf.length, mediaType });
  };
  let modes: Listing["modes"];
  let preview: Listing["preview"];
  if (kind === "avatar") {
    modes = [];
    for (const mode of REQUIRED_AVATAR_MODES) {
      const rel = `assets/${mode}.svg`;
      addFile(rel, placeholderSvg(`${slug} ${mode}`, "#1a1a2e", "#7ee787"), "image/svg+xml");
      modes.push({ id: mode, label: mode[0].toUpperCase() + mode.slice(1), asset: rel, loop: true });
    }
    preview = { static: "assets/idle.svg", animated: "assets/working.svg" };
  } else if (kind === "persona") {
    addFile("persona.md", `# ${slug}\n\nDescribe this persona here.\n`, "text/markdown");
    preview = { static: "persona.md", animated: "persona.md" };
    // preview for non-avatar kinds points at the primary asset; keep SVG preview too for the site
    addFile("assets/preview.svg", placeholderSvg(slug, "#1a1a2e", "#7ee787"), "image/svg+xml");
    preview = { static: "assets/preview.svg", animated: "assets/preview.svg" };
  } else if (kind === "bundle") {
    addFile("bundle.json", JSON.stringify({ contents: [] }, null, 2) + "\n", "application/json");
    addFile("assets/preview.svg", placeholderSvg(slug, "#1a1a2e", "#7ee787"), "image/svg+xml");
    preview = { static: "assets/preview.svg", animated: "assets/preview.svg" };
  } else {
    addFile("assets/preview.svg", placeholderSvg(slug, "#1a1a2e", "#7ee787"), "image/svg+xml");
    preview = { static: "assets/preview.svg", animated: "assets/preview.svg" };
  }
  const listing: Listing = {
    slug, name: slug, kind: kind as Listing["kind"], version: "0.1.0",
    author: { name: "Your Name", handle: "@your-handle" },
    description: `A new ${kind} listing. Replace this description.`,
    longDescription: `A new ${kind} listing scaffolded by muse-marketplace init. Replace this long description with real detail.`,
    tags: [kind], license: "MIT", modes, files, preview,
    compatibility: { muse: ">=1.0" },
    safety: { vetted: false, notes: "Scaffold — not yet vetted. Run validate and complete the vetting checklist before marking vetted." },
    createdAt: now, updatedAt: now,
    ...(kind === "bundle" ? { bundleContents: [] } : {}),
  };
  // Sort files deterministically for stable listings.
  listing.files.sort((a, b) => a.path.localeCompare(b.path));
  writeFileSync(join(dir, "listing.json"), JSON.stringify(listing, null, 2) + "\n");
  return dir;
}

export { normalize };
