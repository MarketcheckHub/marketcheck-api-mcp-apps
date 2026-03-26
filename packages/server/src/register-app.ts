/**
 * Helper to register an MCP App tool + resource pair.
 * Gracefully handles SDK schema validation errors.
 */
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import fs from "node:fs/promises";
import path from "node:path";

let extApps: any = null;
try {
  extApps = await import("@modelcontextprotocol/ext-apps/server");
} catch {
  console.warn("  ext-apps/server not available — MCP App registration disabled");
}

interface AppRegistration {
  server: McpServer;
  toolName: string;
  title: string;
  description: string;
  inputSchema: Record<string, unknown>;
  handler: (args: any) => Promise<{ content: Array<{ type: string; text: string }> }>;
  htmlFileName: string;
}

export function registerApp({
  server,
  toolName,
  title,
  description,
  inputSchema,
  handler,
  htmlFileName,
}: AppRegistration) {
  if (!extApps) return;

  const resourceUri = `ui://marketcheck/${htmlFileName}`;

  try {
    extApps.registerAppTool(
      server,
      toolName,
      {
        title,
        description,
        inputSchema,
        _meta: { ui: { resourceUri } },
      },
      handler,
    );

    extApps.registerAppResource(
      server,
      resourceUri,
      resourceUri,
      { mimeType: extApps.RESOURCE_MIME_TYPE },
      async () => {
        const htmlPath = path.join(
          import.meta.dirname,
          "..",
          "..",
          "apps",
          htmlFileName,
          "dist",
          "index.html",
        );
        const html = await fs.readFile(htmlPath, "utf-8");
        return {
          contents: [{ uri: resourceUri, mimeType: extApps.RESOURCE_MIME_TYPE, text: html }],
        };
      },
    );
  } catch (e: any) {
    // Silently skip — MCP tool registration failed but server continues
    throw e; // Re-throw so caller's try-catch can log it
  }
}
