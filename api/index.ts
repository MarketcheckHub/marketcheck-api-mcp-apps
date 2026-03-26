/**
 * Vercel serverless function — serves the Express app (gallery, proxy, health).
 * MCP endpoint is excluded (requires persistent connections).
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

async function mcFetch(apiPath: string, authMode: string, authValue: string, params: Record<string, any> = {}, method: "GET" | "POST" = "GET", body?: any): Promise<any> {
  const basePath = authMode === "oauth_token" ? "/oauth/v2" : "/v2";
  const url = new URL(`${MC_API_HOST}${basePath}${apiPath}`);
  if (authMode === "api_key") url.searchParams.set("api_key", authValue);
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== "") url.searchParams.set(k, String(v));
  }
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (authMode === "oauth_token") headers["Authorization"] = `Bearer ${authValue}`;
  const res = await fetch(url.toString(), { method, headers, body: body ? JSON.stringify(body) : undefined });
  if (!res.ok) throw new Error(`MC API ${res.status}: ${await res.text()}`);
  return res.json();
}

// Proxy handlers
async function handleDecodeVin(auth: any, args: any) { return mcFetch("/decode/neovin", auth.mode, auth.value, {}, "POST", { vin: args.vin }); }
async function handlePredictPrice(auth: any, args: any) { return mcFetch("/pricing/predict", auth.mode, auth.value, { vin: args.vin, miles: args.miles, dealer_type: args.dealer_type, zip: args.zip, is_certified: args.is_certified }); }
async function handleSearchActive(auth: any, args: any) { return mcFetch("/search/car/active", auth.mode, auth.value, args); }
async function handleSearchPast90(auth: any, args: any) { return mcFetch("/search/car/past90", auth.mode, auth.value, args); }
async function handleCarHistory(auth: any, args: any) { return mcFetch("/history/listings", auth.mode, auth.value, { vin: args.vin, sort_order: args.sort_order }); }
async function handleSoldSummary(auth: any, args: any) { return mcFetch("/api/v1/sold-vehicles/summary", auth.mode, auth.value, args); }
async function handleIncentives(auth: any, args: any) { return mcFetch("/incentives/by-zip", auth.mode, auth.value, args); }

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
  res.json({ status: "ok", apps: 25, platform: "vercel" });
});

export default app;
