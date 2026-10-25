import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { join } from "node:path";
import { findListing, loadAllListings, searchListings, validateListing, installListing } from "./registry.js";

export async function runMcp(): Promise<void> {
  const server = new McpServer({ name: "muse-marketplace", version: "0.1.0" });

  server.tool("marketplace_search", "Search the Muse Marketplace by name, tag, slug, author, or description.", {
    query: z.string().describe("Search query matched against slug, name, description, tags, and author."),
  }, async ({ query }) => {
    return { content: [{ type: "text", text: JSON.stringify(searchListings(query), null, 2) }] };
  });

  server.tool("marketplace_list", "List Muse Marketplace listings, optionally filtered by kind or tag.", {
    kind: z.enum(["avatar", "persona", "voice", "bundle"]).optional().describe("Only list this kind."),
    tag: z.string().optional().describe("Only list listings carrying this tag."),
  }, async ({ kind, tag }) => {
    let items = loadAllListings().map((x) => x.listing);
    if (kind) items = items.filter((l) => l.kind === kind);
    if (tag) items = items.filter((l) => l.tags.includes(tag));
    return { content: [{ type: "text", text: JSON.stringify(items, null, 2) }] };
  });

  server.tool("marketplace_show", "Show the full listing record for one slug.", {
    slug: z.string().describe("Listing slug, e.g. jolly."),
  }, async ({ slug }) => {
    const found = findListing(slug);
    if (!found) return { content: [{ type: "text", text: JSON.stringify({ error: `listing not found: ${slug}` }) }], isError: true };
    return { content: [{ type: "text", text: JSON.stringify(found.listing, null, 2) }] };
  });

  server.tool("marketplace_validate", "Validate a listing: schema, file existence, sha256 checksums, allowed media types, and path safety.", {
    slug: z.string().describe("Listing slug to validate."),
  }, async ({ slug }) => {
    const found = findListing(slug);
    if (!found) return { content: [{ type: "text", text: JSON.stringify({ slug, valid: false, problems: [`listing not found: ${slug}`] }, null, 2) }], isError: true };
    const problems = validateListing(found.listing, found.dir);
    return { content: [{ type: "text", text: JSON.stringify({ slug, valid: problems.length === 0, problems }, null, 2) }] };
  });

  server.tool("marketplace_install", "Install a listing into a destination directory under the current working directory. Verifies checksums before and after copy and refuses tampered listings.", {
    slug: z.string().describe("Listing slug to install."),
    dest: z.string().optional().describe("Destination base directory, relative to the current working directory. Defaults to ./muse-assets. Must stay under the current working directory."),
  }, async ({ slug, dest }) => {
    const base = dest ?? "./muse-assets";
    const absBase = join(process.cwd(), base);
    // Confine installs to under cwd.
    const { resolve } = await import("node:path");
    if (!resolve(absBase).startsWith(resolve(process.cwd()))) {
      return { content: [{ type: "text", text: JSON.stringify({ error: "dest must stay under the current working directory" }) }], isError: true };
    }
    try {
      const result = installListing(slug, absBase);
      return { content: [{ type: "text", text: JSON.stringify({ slug, dest: result.dest, receipt: result.receiptPath, verified: true }, null, 2) }] };
    } catch (err) {
      return { content: [{ type: "text", text: JSON.stringify({ error: err instanceof Error ? err.message : String(err) }) }], isError: true };
    }
  });

  const transport = new StdioServerTransport();
  await server.connect(transport);
}
