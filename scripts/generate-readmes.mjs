#!/usr/bin/env node
/**
 * Generate README.md for each app in packages/apps/.
 * Usage: node scripts/generate-readmes.mjs
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { APPS, SEGMENTS, MC_API_ENDPOINTS, DERIVATIVE_APIS } from "./page-data.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

const SEGMENT_AUDIENCES = {
  "Consumer": "Car shoppers and buyers looking for market intelligence",
  "Dealer": "Used car dealers, inventory managers, and pricing analysts",
  "Appraiser": "Professional vehicle appraisers, valuation specialists",
  "Dealership Group": "Multi-location dealer group operators and managers",
  "Lender": "Auto lenders, underwriters, and portfolio risk managers",
  "Analyst": "Financial analysts covering automotive stocks",
  "Insurer": "Insurance adjusters, underwriters, and claims managers",
  "Manufacturer": "OEM product planners, regional sales managers",
  "Auction House": "Auction operators, consignment managers",
  "Wholesaler": "Wholesale vehicle buyers and routers",
  "Cross-Segment": "Anyone in the automotive industry",
  "Consumer (UK)": "UK car shoppers and buyers",
  "Dealer (UK)": "UK car dealers",
  "Auto Media": "Automotive journalists and market reporters",
  "Fleet Manager": "Fleet operators and procurement managers",
  "Rental/Subscription": "Rental car companies and subscription fleet managers",
  "Lender Sales": "Floor plan lender sales representatives",
  "Chat Demos": "Developers exploring AI chat integrations with MarketCheck data",
};

// Build a lookup of derivative APIs by name
const derivativeByName = {};
for (const d of DERIVATIVE_APIS) {
  derivativeByName[d.name] = d;
}

function isUkApp(app) {
  return app.segment === "Consumer (UK)" || app.segment === "Dealer (UK)" ||
    app.apiEndpoints.some(e => e.startsWith("uk"));
}

function isChatApp(app) {
  return app.tool === "chat";
}

function generateReadme(app) {
  const seg = SEGMENTS.find(s => s.name === app.segment);
  const segBadge = seg ? `![${app.segment}](https://img.shields.io/badge/${encodeURIComponent(app.segment).replace(/-/g, "--")}-${seg.color.replace("#", "")}?style=flat-square)` : "";

  const lines = [];

  // 1. Title
  lines.push(`# ${app.name} ${segBadge}`);
  lines.push("");

  // 2. Screenshot
  lines.push(`![Screenshot](../../../static/screenshots/${app.id}.png)`);
  lines.push("");

  // 3. Overview
  lines.push("## Overview");
  lines.push("");
  lines.push(app.description);
  lines.push("");

  // 4. Who Is This For
  lines.push("## Who Is This For");
  lines.push("");
  lines.push(SEGMENT_AUDIENCES[app.segment] || "Automotive industry professionals");
  lines.push("");

  // 5. MarketCheck API Endpoints Used
  lines.push("## MarketCheck API Endpoints Used");
  lines.push("");
  lines.push("| Endpoint | Name | Docs |");
  lines.push("|----------|------|------|");
  for (const key of app.apiEndpoints) {
    const ep = MC_API_ENDPOINTS[key];
    if (ep) {
      lines.push(`| \`${ep.path}\` | ${ep.name} | [View docs](${ep.docs}) |`);
    }
  }
  lines.push("");

  // 6. Parameters
  if (app.inputParams && app.inputParams.length > 0) {
    lines.push("## Parameters");
    lines.push("");
    lines.push("| Name | Type | Required | Description |");
    lines.push("|------|------|----------|-------------|");
    for (const p of app.inputParams) {
      lines.push(`| \`${p.name}\` | ${p.type} | ${p.required ? "Yes" : "No"} | ${p.desc} |`);
    }
    lines.push("");
  }

  // 7. Derivative API Endpoint
  const toolNames = app.tool.split(",").map(t => t.trim());
  const derivativeTools = toolNames.filter(t => t !== "chat");
  if (derivativeTools.length > 0) {
    lines.push("## Derivative API Endpoint");
    lines.push("");
    for (const toolName of derivativeTools) {
      const d = derivativeByName[toolName];
      if (d) {
        lines.push(`**\`POST https://apps.marketcheck.com/api/proxy/${toolName}\`**`);
        lines.push("");
        lines.push(`> This is a composite endpoint that orchestrates multiple MarketCheck API calls into a single response. It is provided for reference and experimentation purposes only and is not under LTS (Long-Term Support).`);
        lines.push("");
      } else {
        lines.push(`**\`POST https://apps.marketcheck.com/api/proxy/${toolName}\`**`);
        lines.push("");
        lines.push(`> This endpoint is provided for reference and experimentation purposes only and is not under LTS (Long-Term Support).`);
        lines.push("");
      }
    }
  }

  // 8. How to Run
  lines.push("## How to Run");
  lines.push("");

  // Browser
  lines.push("### Browser (standalone)");
  lines.push("");
  lines.push("Open the app directly in a browser with your MarketCheck API key:");
  lines.push("");
  lines.push("```");
  lines.push(`https://apps.marketcheck.com/app/${app.id}/?api_key=YOUR_API_KEY`);
  lines.push("```");
  lines.push("");

  // MCP
  lines.push("### MCP (Model Context Protocol)");
  lines.push("");
  lines.push("Add to your MCP client configuration (e.g. Claude Desktop):");
  lines.push("");
  lines.push("```json");
  lines.push(JSON.stringify({
    "mcpServers": {
      "marketcheck": {
        "command": "npx",
        "args": ["-y", "@anthropic/marketcheck-mcp"],
        "env": {
          "MARKETCHECK_API_KEY": "YOUR_API_KEY"
        }
      }
    }
  }, null, 2));
  lines.push("```");
  lines.push("");

  // Embed
  lines.push("### Embed (iframe)");
  lines.push("");
  lines.push("Embed in any webpage:");
  lines.push("");
  lines.push("```html");
  lines.push(`<iframe src="https://apps.marketcheck.com/app/${app.id}/?api_key=YOUR_API_KEY" width="100%" height="800" frameborder="0"></iframe>`);
  lines.push("```");
  lines.push("");

  // 9. Limitations
  lines.push("## Limitations");
  lines.push("");
  lines.push("- Demo mode shows mock data");
  lines.push("- Requires MarketCheck API key for live data");
  lines.push("- Browser-based — no server required for standalone use");
  if (isChatApp(app)) {
    lines.push("- Chat apps require an LLM API key (Anthropic, OpenAI, or Google Gemini)");
  }
  if (isUkApp(app)) {
    lines.push("- Data covers UK market");
  } else {
    lines.push("- Data covers US market (95%+ of dealer inventory)");
  }
  lines.push("");

  // 10. Links
  lines.push("## Links");
  lines.push("");
  lines.push(`- [MarketCheck Developer Portal](https://developers.marketcheck.com)`);
  lines.push(`- [API Documentation](https://apidocs.marketcheck.com)`);
  lines.push(`- [${app.name} App](https://apps.marketcheck.com/app/${app.id}/)`);
  lines.push(`- [GitHub Repository](https://github.com/anthropics/marketcheck-mcp-apps)`);
  lines.push("");

  return lines.join("\n");
}

let count = 0;
for (const app of APPS) {
  const dir = join(ROOT, "packages", "apps", app.id);
  mkdirSync(dir, { recursive: true });
  const readmePath = join(dir, "README.md");
  const content = generateReadme(app);
  writeFileSync(readmePath, content, "utf-8");
  count++;
  console.log(`  wrote ${readmePath.replace(ROOT + "/", "")}`);
}

console.log(`\nGenerated ${count} README files.`);
