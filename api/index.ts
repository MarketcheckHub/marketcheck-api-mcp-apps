/**
 * Vercel serverless function — serves the Express app (gallery, proxy, health, MCP).
 */
import cors from "cors";
import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
app.use(cors());
app.use(express.json());

// ── CORS Proxy ──────────────────────────────────────────────────────────

const MC_API_HOST = "https://api.marketcheck.com";

// mcFetch: supports /v2/ prefix (standard) and no prefix (sold summary uses /api/v1/)
async function mcFetch(apiPath: string, authMode: string, authValue: string, params: Record<string, any> = {}, opts?: { noV2Prefix?: boolean }): Promise<any> {
  const basePath = opts?.noV2Prefix ? "" : (authMode === "oauth_token" ? "/oauth/v2" : "/v2");
  const url = new URL(`${MC_API_HOST}${basePath}${apiPath}`);
  if (authMode === "api_key") url.searchParams.set("api_key", authValue);
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== "") url.searchParams.set(k, String(v));
  }
  const headers: Record<string, string> = {};
  if (authMode === "oauth_token") headers["Authorization"] = `Bearer ${authValue}`;
  const res = await fetch(url.toString(), { headers });
  if (!res.ok) throw new Error(`MC API ${res.status}: ${await res.text()}`);
  return res.json();
}

// Proxy handlers — using correct MarketCheck API endpoints
async function handleDecodeVin(auth: any, args: any) {
  return mcFetch(`/decode/car/neovin/${args.vin}/specs`, auth.mode, auth.value);
}
async function handlePredictPrice(auth: any, args: any) {
  return mcFetch("/predict/car/us/marketcheck_price/comparables", auth.mode, auth.value, {
    vin: args.vin, miles: args.miles, dealer_type: args.dealer_type, zip: args.zip, is_certified: args.is_certified,
  });
}
async function handleSearchActive(auth: any, args: any) { return mcFetch("/search/car/active", auth.mode, auth.value, args); }
async function handleSearchPast90(auth: any, args: any) { return mcFetch("/search/car/recents", auth.mode, auth.value, args); }
async function handleCarHistory(auth: any, args: any) {
  return mcFetch(`/history/car/${args.vin}`, auth.mode, auth.value, { sort_order: args.sort_order });
}
async function handleSoldSummary(auth: any, args: any) {
  return mcFetch("/api/v1/sold-vehicles/summary", auth.mode, auth.value, args, { noV2Prefix: true });
}
async function handleIncentives(auth: any, args: any) {
  const params = { ...args };
  if (params.oem && !params.make) { params.make = params.oem; delete params.oem; }
  return mcFetch("/search/car/incentive/oem", auth.mode, auth.value, params);
}

const compositeHandlers: Record<string, (auth: any, args: any) => Promise<any>> = {
  "estimate-trade-in": async (auth, args) => {
    const decode = await handleDecodeVin(auth, args);
    const [retail, wholesale] = await Promise.all([
      handlePredictPrice(auth, { ...args, dealer_type: "franchise" }),
      handlePredictPrice(auth, { ...args, dealer_type: "independent" }),
    ]);
    const soldComps = await handleSearchPast90(auth, { make: decode?.make, model: decode?.model, year: decode?.year ? `${decode.year - 1}-${decode.year + 1}` : undefined, zip: args.zip, radius: 100, rows: 10, stats: "price" });
    return { decode, retail, wholesale, soldComps };
  },
  "evaluate-deal": async (auth, args) => {
    const decode = await handleDecodeVin(auth, args);
    const [prediction, history] = await Promise.all([
      handlePredictPrice(auth, { ...args, dealer_type: "franchise" }),
      handleCarHistory(auth, args),
    ]);
    const activeComps = await handleSearchActive(auth, { make: decode?.make, model: decode?.model, year: decode?.year ? `${decode.year - 1}-${decode.year + 1}` : undefined, zip: args.zip, radius: 75, stats: "price,miles,dom", rows: 10, sort_by: "price", sort_order: "asc" });
    return { decode, prediction, activeComps, history };
  },
  "search-cars": async (auth, args) => handleSearchActive(auth, { ...args, stats: "price,miles", facets: "make,model,trim,body_type", include_dealer_object: true }),
  "compare-cars": async (auth, args) => {
    const vins: string[] = args.vins ?? [];
    const results = await Promise.all(vins.map(async (vin: string) => {
      const [decode, price] = await Promise.all([handleDecodeVin(auth, { vin }), handlePredictPrice(auth, { vin, dealer_type: "franchise", zip: args.zip })]);
      return { vin, decode, price };
    }));
    return { comparisons: results };
  },
  "appraiser-workbench": async (auth, args) => {
    const decode = await handleDecodeVin(auth, args);
    const [retail, wholesale, history] = await Promise.all([
      handlePredictPrice(auth, { ...args, dealer_type: "franchise" }),
      handlePredictPrice(auth, { ...args, dealer_type: "independent" }),
      handleCarHistory(auth, { vin: args.vin, sort_order: "asc" }),
    ]);
    const [activeComps, soldComps] = await Promise.all([
      handleSearchActive(auth, { make: decode?.make, model: decode?.model, zip: args.zip, radius: 100, stats: "price,miles,dom", rows: 25 }),
      handleSearchPast90(auth, { make: decode?.make, model: decode?.model, zip: args.zip, radius: 100, stats: "price", rows: 25 }),
    ]);
    return { decode, retail, wholesale, activeComps, soldComps, history };
  },
  "claims-valuation": async (auth, args) => {
    const decode = await handleDecodeVin(auth, args);
    const [fmvResult, soldComps, regionalData, replacements] = await Promise.all([
      handlePredictPrice(auth, { ...args, dealer_type: "franchise" }),
      handleSearchPast90(auth, { make: decode?.make, model: decode?.model, zip: args.zip, radius: 100, rows: 10, stats: "price" }),
      handleSoldSummary(auth, { make: decode?.make, model: decode?.model, summary_by: "state" }),
      handleSearchActive(auth, { make: decode?.make, model: decode?.model, zip: args.zip, radius: 50, rows: 5, sort_by: "price", sort_order: "asc" }),
    ]);
    return { decode, fmvResult, soldComps, regionalData, replacements };
  },
  "get-market-index": async (auth, args) => {
    const [summary, segments] = await Promise.all([
      handleSoldSummary(auth, { ranking_dimensions: "make", ranking_measure: "sold_count,average_sale_price", inventory_type: "Used", top_n: 25, ...(args.state ? { state: args.state } : {}) }),
      handleSoldSummary(auth, { ranking_dimensions: "body_type", ranking_measure: "sold_count,average_sale_price", inventory_type: "Used", ...(args.state ? { state: args.state } : {}) }),
    ]);
    return { summary, segments };
  },
  "scan-lot-pricing": async (auth, args) => {
    const [inventory, hotList] = await Promise.all([
      handleSearchActive(auth, { dealer_id: args.dealerId, rows: 50, stats: "price,miles,dom", facets: "body_type,make" }),
      handleSoldSummary(auth, { state: args.state, ranking_dimensions: "make,model", ranking_measure: "sold_count", ranking_order: "desc", top_n: 10 }),
    ]);
    return { inventory, hotList };
  },
  "stocking-intelligence": async (auth, args) => {
    const [demandData, segmentDemand] = await Promise.all([
      handleSoldSummary(auth, { state: args.state, ranking_dimensions: "make,model", ranking_measure: "sold_count", ranking_order: "desc", top_n: 30 }),
      handleSoldSummary(auth, { state: args.state, ranking_dimensions: "body_type", ranking_measure: "sold_count,average_sale_price,average_days_on_market" }),
    ]);
    return { demandData, segmentDemand };
  },
  "comparables-explorer": async (auth, args) => {
    let decode = null;
    if (args.vin) decode = await handleDecodeVin(auth, args);
    const make = args.make ?? decode?.make;
    const model = args.model ?? decode?.model;
    const [activeComps, soldComps] = await Promise.all([
      handleSearchActive(auth, { make, model, year: args.year, zip: args.zip, radius: args.radius ?? 100, stats: "price,miles,dom", rows: 50 }),
      handleSearchPast90(auth, { make, model, year: args.year, zip: args.zip, radius: args.radius ?? 100, stats: "price", rows: 25 }),
    ]);
    const prediction = args.vin ? await handlePredictPrice(auth, { vin: args.vin, zip: args.zip }) : null;
    return { decode, activeComps, soldComps, prediction };
  },
  "oem-incentives-explorer": async (auth, args) => {
    const incentives = await handleIncentives(auth, { oem: args.make, zip: args.zip, model: args.model });
    let compareIncentives: any[] = [];
    if (args.compareMakes?.length) {
      compareIncentives = await Promise.all(args.compareMakes.map(async (make: string) => ({ make, data: await handleIncentives(auth, { oem: make, zip: args.zip }) })));
    }
    return { make: args.make, incentives, compareIncentives };
  },
};

app.post("/api/proxy/:toolName", async (req, res) => {
  try {
    const { _auth_mode, _auth_value, ...args } = req.body;
    if (!_auth_mode || !_auth_value) { res.status(401).json({ error: "Missing authentication" }); return; }
    const auth = { mode: _auth_mode, value: _auth_value };
    const handler = compositeHandlers[req.params.toolName];
    if (handler) {
      res.json(await handler(auth, args));
    } else {
      res.status(501).json({ error: `Tool '${req.params.toolName}' not available in standalone proxy mode` });
    }
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/auth/token", async (req, res) => {
  try {
    const { client_id, client_secret } = req.body;
    const r = await fetch("https://api.marketcheck.com/oauth2/token", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ grant_type: "client_credentials", client_id, client_secret }),
    });
    res.status(r.status).json(await r.json());
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", apps: 45, platform: "vercel", mcp: true });
});

// ── MCP Endpoint ──────────────────────────────────────────────────────────

let mcpInitialized = false;
let mcpServer: any = null;

async function initMcp() {
  if (mcpInitialized) return;
  mcpInitialized = true;
  try {
    const { McpServer } = await import("@modelcontextprotocol/sdk/server/mcp.js");
    const { z } = await import("zod");
    const extApps = await import("@modelcontextprotocol/ext-apps/server");

    mcpServer = new McpServer({ name: "MarketCheck MCP Apps", version: "1.0.0" });

    // Convert JSON Schema to Zod
    function toZod(properties: Record<string, any>, required: string[] = []): Record<string, any> {
      const shape: Record<string, any> = {};
      for (const [key, prop] of Object.entries(properties)) {
        let field: any;
        const desc = prop.description || undefined;
        switch (prop.type) {
          case "number": case "integer": field = z.number(); break;
          case "boolean": field = z.boolean(); break;
          case "array": field = z.array(z.string()); break;
          default:
            field = prop.enum ? z.enum(prop.enum) : z.string();
            if (prop.default !== undefined) field = field.default(prop.default);
        }
        if (desc) field = field.describe(desc);
        if (!required.includes(key)) field = field.optional();
        shape[key] = field;
      }
      return shape;
    }

    function getApiKey(args: any): string {
      return args._api_key || process.env.MARKETCHECK_API_KEY || "";
    }

    // Tool definitions: name, description, htmlFileName, schema, handler
    // IMPORTANT: descriptions must be distinctive from the MarketCheck Data Server tools
    // to ensure Claude picks these when users want visual/interactive dashboards
    const tools = [
      { name: "estimate-trade-in", html: "trade-in-estimator", desc: "INTERACTIVE DASHBOARD: Shows a visual trade-in estimator with 3-tier value gauge (private party, trade-in, cash offer), range bars, and sold comparable evidence table. Use this when the user wants to see what their car is worth.", schema: { vin: { type: "string", description: "17-char VIN" }, miles: { type: "number" }, zip: { type: "string" }, condition: { type: "string" } }, handler: async (args: any) => { const a = { mode: "api_key", value: getApiKey(args) }; const decode = await handleDecodeVin(a, args); const [retail, wholesale] = await Promise.all([handlePredictPrice(a, { ...args, dealer_type: "franchise" }), handlePredictPrice(a, { ...args, dealer_type: "independent" })]); const soldComps = await handleSearchPast90(a, { make: decode?.make, model: decode?.model, zip: args.zip, radius: 100, rows: 10, stats: "price" }); return { decode, retail, wholesale, soldComps }; } },
      { name: "evaluate-deal", html: "deal-evaluator", desc: "INTERACTIVE DASHBOARD: Shows a visual deal evaluator with Buy/Negotiate/Pass gauge, price position chart, negotiation toolkit, and comparable vehicles. Use this to evaluate whether a car deal is good.", schema: { vin: { type: "string", description: "17-char VIN" }, askingPrice: { type: "number" }, miles: { type: "number" }, zip: { type: "string" } }, handler: async (args: any) => { const a = { mode: "api_key", value: getApiKey(args) }; const decode = await handleDecodeVin(a, args); const [prediction, history] = await Promise.all([handlePredictPrice(a, { ...args, dealer_type: "franchise" }), handleCarHistory(a, args)]); const activeComps = await handleSearchActive(a, { make: decode?.make, model: decode?.model, year: decode?.year ? `${decode.year-1}-${decode.year+1}` : undefined, zip: args.zip, radius: 75, stats: "price,miles,dom", rows: 10 }); return { decode, prediction, activeComps, history }; } },
      { name: "search-cars", html: "car-search-compare", desc: "INTERACTIVE DASHBOARD: Visual car search with photo card grid, filter chips, deal badges, and side-by-side comparison. Use this to search and browse car listings visually.", schema: { make: { type: "string" }, model: { type: "string" }, year: { type: "string" }, body_type: { type: "string" }, price_range: { type: "string" }, miles_range: { type: "string" }, zip: { type: "string" }, radius: { type: "number" }, rows: { type: "number" } }, handler: async (args: any) => handleSearchActive({ mode: "api_key", value: getApiKey(args) }, { ...args, stats: "price,miles", facets: "make,model,trim,body_type", include_dealer_object: true, include_build_object: true }) },
      { name: "generate-vin-market-report", html: "vin-market-report", desc: "INTERACTIVE DASHBOARD: Complete VIN market report with deal score gauge, price prediction, depreciation chart, comparable vehicles carousel, and price history timeline. The most comprehensive vehicle analysis dashboard.", schema: { vin: { type: "string", description: "17-char VIN" }, price: { type: "number" }, miles: { type: "number" }, zip: { type: "string" } }, handler: async (args: any) => { const a = { mode: "api_key", value: getApiKey(args) }; const decode = await handleDecodeVin(a, args); const [retail, wholesale, history] = await Promise.all([handlePredictPrice(a, { ...args, dealer_type: "franchise" }), handlePredictPrice(a, { ...args, dealer_type: "independent" }), handleCarHistory(a, args)]); const mk = decode?.make, md = decode?.model, yr = decode?.year ? `${decode.year-1}-${decode.year+1}` : undefined; const [activeComps, soldComps] = await Promise.all([handleSearchActive(a, { make: mk, model: md, year: yr, zip: args.zip, radius: 100, stats: "price,miles,dom", rows: 10 }), handleSearchPast90(a, { make: mk, model: md, year: yr, zip: args.zip, radius: 100, stats: "price", rows: 10 })]); return { decode, retail, wholesale, history, activeComps, soldComps }; } },
      { name: "trace-vin-history", html: "vin-history-detective", desc: "INTERACTIVE DASHBOARD: Visual VIN history timeline showing dealer hops, price changes over time as a stepped-line chart, and red flag alerts. Use this to investigate a vehicle's listing history.", schema: { vin: { type: "string", description: "17-char VIN" }, miles: { type: "number" }, zip: { type: "string" } }, handler: async (args: any) => { const a = { mode: "api_key", value: getApiKey(args) }; const decode = await handleDecodeVin(a, args); const [history, prediction] = await Promise.all([handleCarHistory(a, { vin: args.vin, sort_order: "asc" }), handlePredictPrice(a, { vin: args.vin, miles: args.miles, dealer_type: "franchise", zip: args.zip })]); return { decode, history, prediction }; } },
      { name: "appraiser-workbench", html: "appraiser-workbench", desc: "INTERACTIVE DASHBOARD: Multi-panel vehicle valuation studio with retail/wholesale price bars, active and sold comps tables, and price history chart. Use this for professional vehicle appraisals.", schema: { vin: { type: "string", description: "17-char VIN" }, miles: { type: "number" }, zip: { type: "string" } }, handler: async (args: any) => { const a = { mode: "api_key", value: getApiKey(args) }; const decode = await handleDecodeVin(a, args); const [retail, wholesale, history] = await Promise.all([handlePredictPrice(a, { ...args, dealer_type: "franchise" }), handlePredictPrice(a, { ...args, dealer_type: "independent" }), handleCarHistory(a, { vin: args.vin, sort_order: "asc" })]); const [activeComps, soldComps] = await Promise.all([handleSearchActive(a, { make: decode?.make, model: decode?.model, zip: args.zip, radius: 100, stats: "price,miles,dom", rows: 25 }), handleSearchPast90(a, { make: decode?.make, model: decode?.model, zip: args.zip, radius: 100, stats: "price", rows: 25 })]); return { decode, retail, wholesale, activeComps, soldComps, history }; } },
      { name: "claims-valuation", html: "claims-valuation-workbench", desc: "INTERACTIVE DASHBOARD: Insurance total-loss determination with verdict banner, settlement range bar, comparable evidence table, and replacement vehicle options. Use for insurance claims valuation.", schema: { vin: { type: "string" }, miles: { type: "number" }, zip: { type: "string" }, condition: { type: "string" }, damageSeverity: { type: "string" } }, handler: async (args: any) => { const a = { mode: "api_key", value: getApiKey(args) }; const decode = await handleDecodeVin(a, args); const [fmvResult, soldComps, replacements] = await Promise.all([handlePredictPrice(a, { ...args, dealer_type: "franchise" }), handleSearchPast90(a, { make: decode?.make, model: decode?.model, zip: args.zip, radius: 100, rows: 10, stats: "price" }), handleSearchActive(a, { make: decode?.make, model: decode?.model, zip: args.zip, radius: 50, rows: 5, sort_by: "price", sort_order: "asc" })]); return { decode, fmvResult, soldComps, replacements }; } },
      { name: "get-market-index", html: "used-car-market-index", desc: "INTERACTIVE DASHBOARD: Stock-ticker-style used car market index with candlestick charts, segment indices, top movers table, sector heatmap, and geographic comparison. Use to track car market trends.", schema: { state: { type: "string" }, timeRange: { type: "string" } }, handler: async (args: any) => { const a = { mode: "api_key", value: getApiKey(args) }; const summary = await handleSoldSummary(a, { ranking_dimensions: "make", ranking_measure: "sold_count,average_sale_price", inventory_type: "Used", top_n: 25, ...(args.state ? { state: args.state } : {}) }); const segments = await handleSoldSummary(a, { ranking_dimensions: "body_type", ranking_measure: "sold_count,average_sale_price", inventory_type: "Used" }); return { summary, segments }; } },
      { name: "scan-lot-pricing", html: "lot-pricing-dashboard", desc: "INTERACTIVE DASHBOARD: Dealer lot inventory with market price gap table, aging heatmap, floor plan burn calculator, and stocking hot list. Use for dealer inventory pricing analysis.", schema: { dealerId: { type: "string" }, zip: { type: "string" }, state: { type: "string" } }, handler: async (args: any) => { const a = { mode: "api_key", value: getApiKey(args) }; const inventory = await handleSearchActive(a, { dealer_id: args.dealerId, rows: 50, stats: "price,miles,dom", facets: "body_type,make" }); const hotList = await handleSoldSummary(a, { state: args.state, ranking_dimensions: "make,model", ranking_measure: "sold_count", ranking_order: "desc", top_n: 10 }); return { inventory, hotList }; } },
      { name: "stocking-intelligence", html: "stocking-intelligence", desc: "INTERACTIVE DASHBOARD: Auction stocking guide with demand heatmap, buy/avoid recommendation lists, and VIN checker. Use to decide what to buy at auction.", schema: { state: { type: "string" }, zip: { type: "string" } }, handler: async (args: any) => { const a = { mode: "api_key", value: getApiKey(args) }; const [demandData, segmentDemand] = await Promise.all([handleSoldSummary(a, { state: args.state, ranking_dimensions: "make,model", ranking_measure: "sold_count", ranking_order: "desc", top_n: 30 }), handleSoldSummary(a, { state: args.state, ranking_dimensions: "body_type", ranking_measure: "sold_count,average_sale_price,average_days_on_market" })]); return { demandData, segmentDemand }; } },
    ];

    const BASE_URL = "https://apps.marketcheck.com";

    // Register each tool as an MCP UI App (with HTML resource)
    for (const t of tools) {
      const resourceUri = `ui://marketcheck/${t.html}`;
      const zodShape = toZod(t.schema);

      extApps.registerAppTool(
        mcpServer,
        t.name,
        {
          title: t.desc,
          description: t.desc,
          inputSchema: zodShape,
          _meta: { ui: { resourceUri } },
        },
        async (args: any) => {
          try {
            const result = await t.handler(args);
            return { content: [{ type: "text" as const, text: JSON.stringify(result) }] };
          } catch (e: any) {
            return { content: [{ type: "text" as const, text: JSON.stringify({ error: e.message }) }] };
          }
        },
      );

      // Register the HTML resource — fetch from our own static hosting
      extApps.registerAppResource(
        mcpServer,
        resourceUri,
        resourceUri,
        { mimeType: extApps.RESOURCE_MIME_TYPE },
        async () => {
          const htmlUrl = `${BASE_URL}/apps/${t.html}/dist/index.html`;
          const res = await fetch(htmlUrl);
          const html = await res.text();
          return { contents: [{ uri: resourceUri, mimeType: extApps.RESOURCE_MIME_TYPE, text: html }] };
        },
      );
    }
  } catch (e: any) {
    console.error("MCP init failed:", e.message);
  }
}

// MCP GET — endpoint discovery (support both /mcp and /api/mcp for Vercel routing)
app.get("/mcp", (_req, res) => {
  res.writeHead(405, { Allow: "POST" }).end(JSON.stringify({ jsonrpc: "2.0", error: { code: -32000, message: "Use POST" }, id: null }));
});
app.get("/api/mcp", (_req, res) => {
  res.writeHead(405, { Allow: "POST" }).end(JSON.stringify({ jsonrpc: "2.0", error: { code: -32000, message: "Use POST" }, id: null }));
});

// MCP DELETE — session cleanup
app.delete("/mcp", (_req, res) => { res.status(200).json({ ok: true }); });
app.delete("/api/mcp", (_req, res) => { res.status(200).json({ ok: true }); });

// MCP POST — handle tool calls
app.post("/mcp", mcpHandler);
app.post("/api/mcp", mcpHandler);

async function mcpHandler(req: any, res: any) {
  await initMcp();
  if (!mcpServer) { res.status(500).json({ error: "MCP not initialized" }); return; }
  try {
    const { StreamableHTTPServerTransport } = await import("@modelcontextprotocol/sdk/server/streamableHttp.js");
    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true });
    res.on("close", () => transport.close());
    await mcpServer.connect(transport);
    await transport.handleRequest(req, res, req.body);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
}

export default app;
