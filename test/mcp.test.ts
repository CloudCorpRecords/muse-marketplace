import { test } from "node:test";
import assert from "node:assert/strict";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

test("MCP server handshake lists the 5 marketplace tools and search works", async () => {
  const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: [join(repoRoot, "node_modules", "tsx", "dist", "cli.mjs"), join(repoRoot, "src", "cli.ts"), "mcp"],
    cwd: repoRoot,
    stderr: "ignore",
  });
  const client = new Client({ name: "mmkt-test", version: "0.1.0" }, { capabilities: {} });
  try {
    await client.connect(transport);
    const { tools } = await client.listTools();
    const names = tools.map((t) => t.name).sort();
    assert.deepEqual(names, ["marketplace_install", "marketplace_list", "marketplace_search", "marketplace_show", "marketplace_validate"]);
    const res = await client.callTool({ name: "marketplace_search", arguments: { query: "jolly" } });
    const text = (res.content as { type: string; text: string }[])[0].text;
    assert.ok(text.includes("jolly"), "search via MCP should find jolly");
    const val = await client.callTool({ name: "marketplace_validate", arguments: { slug: "jolly" } });
    const valText = (val.content as { type: string; text: string }[])[0].text;
    assert.ok(JSON.parse(valText).valid === true);
  } finally {
    await client.close().catch(() => {});
  }
});
