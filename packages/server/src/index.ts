console.log("Starting MarketCheck MCP Apps server...");

import cors from "cors";
import express from "express";
import path from "node:path";
import { registerProxy } from "./proxy.js";

const app = express();
app.use(cors());
app.use(express.json());

// ── CORS Proxy for standalone/embed mode ────────────────────────────────
registerProxy(app);

// ── MCP endpoint (graceful — if SDK schema issues, skip MCP but keep serving) ──
let mcpReady = false;
try {
  const { McpServer } = await import("@modelcontextprotocol/sdk/server/mcp.js");
  const { StreamableHTTPServerTransport } = await import("@modelcontextprotocol/sdk/server/streamableHttp.js");

  const server = new McpServer({ name: "MarketCheck MCP Apps", version: "1.0.0" });

  // Try registering all tools — if inputSchema format is wrong, catch per-tool
  const toolModules = [
    "./tools/used-car-market-index.js", "./tools/trade-in-estimator.js",
    "./tools/deal-evaluator.js", "./tools/car-search-compare.js",
    "./tools/lot-pricing-dashboard.js", "./tools/stocking-intelligence.js",
    "./tools/oem-incentives-explorer.js", "./tools/appraiser-workbench.js",
    "./tools/claims-valuation-workbench.js", "./tools/group-operations-center.js",
    "./tools/inventory-balancer.js", "./tools/location-benchmarking.js",
    "./tools/watchlist-monitor.js", "./tools/earnings-signal-dashboard.js",
    "./tools/dealer-group-scorecard.js", "./tools/portfolio-risk-monitor.js",
    "./tools/ev-collateral-risk.js", "./tools/brand-command-center.js",
    "./tools/regional-demand-allocator.js", "./tools/ev-market-monitor.js",
    "./tools/auction-lane-planner.js", "./tools/territory-pipeline.js",
    "./tools/comparables-explorer.js", "./tools/depreciation-analyzer.js",
    "./tools/market-trends-dashboard.js",
  ];

  let registered = 0;
  for (const mod of toolModules) {
    try {
      const m = await import(mod);
      const fn = Object.values(m)[0] as (s: any) => void;
      fn(server);
      registered++;
    } catch (e: any) {
      console.warn(`  ⚠ Skipped ${mod}: ${e.message?.slice(0, 80)}`);
    }
  }

  if (registered > 0) {
    app.post("/mcp", async (req, res) => {
      const transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: undefined,
        enableJsonResponse: true,
      });
      res.on("close", () => transport.close());
      await server.connect(transport);
      await transport.handleRequest(req, res, req.body);
    });
    mcpReady = true;
    console.log(`  MCP: ${registered}/25 tools registered.`);
  }
} catch (e: any) {
  console.warn(`  MCP disabled: ${e.message?.slice(0, 100)}`);
}

// ── Static file serving for gallery + apps ──────────────────────────────
const rootDir = path.join(import.meta.dirname, "..", "..", "..");
app.use("/apps", express.static(path.join(rootDir, "packages", "apps")));
app.use("/", express.static(path.join(rootDir, "packages", "gallery", "dist")));

app.get("/health", (_req, res) => {
  res.json({ status: "ok", apps: 25, mcp: mcpReady });
});

const PORT = parseInt(process.env.PORT ?? "3001", 10);
app.listen(PORT, () => {
  console.log(`\nMarketCheck MCP Apps server on http://localhost:${PORT}`);
  console.log(`  Gallery:    http://localhost:${PORT}/`);
  console.log(`  Apps:       http://localhost:${PORT}/apps/{app-name}/dist/index.html`);
  console.log(`  Proxy:      http://localhost:${PORT}/api/proxy/`);
  if (mcpReady) console.log(`  MCP:        http://localhost:${PORT}/mcp`);
  console.log(`  Health:     http://localhost:${PORT}/health`);
});
