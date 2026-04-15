/**
 * Helper to register an MCP App tool + resource pair.
 * Converts JSON Schema inputSchema to Zod schemas for MCP SDK compatibility.
 */
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import fs from "node:fs/promises";
import path from "node:path";

let extApps: any = null;
try {
  extApps = await import("@modelcontextprotocol/ext-apps/server");
} catch {
  console.warn("  ext-apps/server not available — MCP App registration disabled");
}

/**
 * Convert a JSON Schema properties object to a Zod shape.
 * Handles: string, number, integer, boolean, array (of strings), enums.
 */
function jsonSchemaToZod(
  properties: Record<string, any>,
  required: string[] = [],
): Record<string, z.ZodTypeAny> {
  const shape: Record<string, z.ZodTypeAny> = {};

  for (const [key, prop] of Object.entries(properties)) {
    let field: z.ZodTypeAny;
    const desc = prop.description || undefined;

    switch (prop.type) {
      case "number":
      case "integer":
        field = z.number();
        if (desc) field = field.describe(desc);
        break;
      case "boolean":
        field = z.boolean();
        if (desc) field = field.describe(desc);
        break;
      case "array":
        field = z.array(z.string());
        if (desc) field = field.describe(desc);
        break;
      case "string":
      default:
        if (prop.enum) {
          field = z.enum(prop.enum as [string, ...string[]]);
        } else {
          field = z.string();
        }
        if (desc) field = field.describe(desc);
        if (prop.default !== undefined) field = field.default(prop.default);
        break;
    }

    if (!required.includes(key)) {
      field = field.optional();
    }

    shape[key] = field;
  }

  return shape;
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

  // Convert JSON Schema to Zod
  const properties = (inputSchema as any).properties ?? {};
  const required = (inputSchema as any).required ?? [];
  const zodShape = jsonSchemaToZod(properties, required);

  try {
    extApps.registerAppTool(
      server,
      toolName,
      {
        title,
        description,
        inputSchema: zodShape,
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
    throw e; // Re-throw so caller's try-catch can log it
  }
}
