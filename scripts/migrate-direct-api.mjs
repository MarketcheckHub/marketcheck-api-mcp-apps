#!/usr/bin/env node
/**
 * Migrates all apps from proxy-based API calls to direct MarketCheck API calls.
 * Injects _mcApi() helper and _fetchDirect() per-app orchestration into each main.ts.
 * Modifies _callTool() to prefer direct API over proxy.
 */
import { readFileSync, writeFileSync, readdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const appsDir = join(__dirname, "..", "packages", "apps");

// ── Direct API helper (injected into every app) ──────────────────────────
const MC_API_HELPER = `
// ── Direct MarketCheck API Client (browser → api.marketcheck.com) ──────
const _MC = "https://api.marketcheck.com";
async function _mcApi(path, params = {}) {
  const auth = _getAuth();
  if (!auth.value) return null;
  const prefix = path.startsWith("/api/") ? "" : "/v2";
  const url = new URL(_MC + prefix + path);
  if (auth.mode === "api_key") url.searchParams.set("api_key", auth.value);
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== "") url.searchParams.set(k, String(v));
  }
  const headers = {};
  if (auth.mode === "oauth_token") headers["Authorization"] = "Bearer " + auth.value;
  const res = await fetch(url.toString(), { headers });
  if (!res.ok) throw new Error("MC API " + res.status);
  return res.json();
}
function _mcDecode(vin) { return _mcApi("/decode/car/neovin/" + vin + "/specs"); }
function _mcPredict(p) { return _mcApi("/predict/car/us/marketcheck_price/comparables", p); }
function _mcActive(p) { return _mcApi("/search/car/active", p); }
function _mcRecent(p) { return _mcApi("/search/car/recents", p); }
function _mcHistory(vin) { return _mcApi("/history/car/" + vin); }
function _mcSold(p) { return _mcApi("/api/v1/sold-vehicles/summary", p); }
function _mcIncentives(p) { return _mcApi("/incentives/by-zip", p); }
function _mcUkActive(p) { return _mcApi("/search/car/uk/active", p); }
function _mcUkRecent(p) { return _mcApi("/search/car/uk/recents", p); }
`;

// ── Per-tool direct fetch functions (mirrors proxy.ts composite handlers) ──
const TOOL_HANDLERS = {
  "estimate-trade-in": `async function _fetchDirect(args) {
  const decode = await _mcDecode(args.vin);
  const [retail, wholesale] = await Promise.all([_mcPredict({...args,dealer_type:"franchise"}), _mcPredict({...args,dealer_type:"independent"})]);
  const soldComps = await _mcRecent({make:decode?.make,model:decode?.model,year:decode?.year?\`\${decode.year-1}-\${decode.year+1}\`:undefined,zip:args.zip,radius:100,rows:10,stats:"price"});
  return {decode,retail,wholesale,soldComps};
}`,
  "evaluate-deal": `async function _fetchDirect(args) {
  const decode = await _mcDecode(args.vin);
  const [prediction, history] = await Promise.all([_mcPredict({...args,dealer_type:"franchise"}), _mcHistory(args.vin)]);
  const activeComps = await _mcActive({make:decode?.make,model:decode?.model,year:decode?.year?\`\${decode.year-1}-\${decode.year+1}\`:undefined,zip:args.zip,radius:75,stats:"price,miles,dom",rows:10,sort_by:"price",sort_order:"asc"});
  return {decode,prediction,activeComps,history};
}`,
  "search-cars": `async function _fetchDirect(args) {
  return _mcActive({...args,stats:"price,miles",facets:"make,model,trim,body_type",include_dealer_object:true,include_build_object:true,fetch_all_photos:true});
}`,
  "compare-cars": `async function _fetchDirect(args) {
  const vins = args.vins ?? [];
  const results = await Promise.all(vins.map(async (vin) => {
    const [decode, price] = await Promise.all([_mcDecode(vin), _mcPredict({vin,dealer_type:"franchise",zip:args.zip})]);
    return {vin,decode,price};
  }));
  return {comparisons:results};
}`,
  "appraiser-workbench": `async function _fetchDirect(args) {
  const decode = await _mcDecode(args.vin);
  const [retail,wholesale,history] = await Promise.all([_mcPredict({...args,dealer_type:"franchise"}),_mcPredict({...args,dealer_type:"independent"}),_mcHistory(args.vin)]);
  const [activeComps,soldComps] = await Promise.all([_mcActive({make:decode?.make,model:decode?.model,zip:args.zip,radius:100,stats:"price,miles,dom",rows:25}),_mcRecent({make:decode?.make,model:decode?.model,zip:args.zip,radius:100,stats:"price",rows:25})]);
  return {decode,retail,wholesale,activeComps,soldComps,history};
}`,
  "claims-valuation": `async function _fetchDirect(args) {
  const decode = await _mcDecode(args.vin);
  const [fmvResult,soldComps,regionalData,replacements] = await Promise.all([_mcPredict({...args,dealer_type:"franchise"}),_mcRecent({make:decode?.make,model:decode?.model,zip:args.zip,radius:100,rows:10,stats:"price"}),_mcSold({make:decode?.make,model:decode?.model,summary_by:"state"}),_mcActive({make:decode?.make,model:decode?.model,zip:args.zip,radius:50,rows:5,sort_by:"price",sort_order:"asc"})]);
  return {decode,fmvResult,soldComps,regionalData,replacements};
}`,
  "get-market-index": `async function _fetchDirect(args) {
  const summary = await _mcSold({ranking_dimensions:"make",ranking_measure:"sold_count,average_sale_price",inventory_type:"Used",top_n:25,...(args.state?{state:args.state}:{})});
  const segments = await _mcSold({ranking_dimensions:"body_type",ranking_measure:"sold_count,average_sale_price",inventory_type:"Used",...(args.state?{state:args.state}:{})});
  return {summary,segments};
}`,
  "scan-lot-pricing": `async function _fetchDirect(args) {
  const inventory = await _mcActive({dealer_id:args.dealerId,rows:50,stats:"price,miles,dom",facets:"body_type,make"});
  const hotList = await _mcSold({state:args.state,ranking_dimensions:"make,model",ranking_measure:"sold_count",ranking_order:"desc",top_n:10});
  return {inventory,hotList};
}`,
  "stocking-intelligence": `async function _fetchDirect(args) {
  const [demandData,segmentDemand] = await Promise.all([_mcSold({state:args.state,ranking_dimensions:"make,model",ranking_measure:"sold_count",ranking_order:"desc",top_n:30}),_mcSold({state:args.state,ranking_dimensions:"body_type",ranking_measure:"sold_count,average_sale_price,average_days_on_market"})]);
  return {demandData,segmentDemand};
}`,
  "comparables-explorer": `async function _fetchDirect(args) {
  let decode = null;
  if (args.vin) decode = await _mcDecode(args.vin);
  const make = args.make ?? decode?.make, model = args.model ?? decode?.model;
  const [activeComps,soldComps] = await Promise.all([_mcActive({make,model,year:args.year,zip:args.zip,radius:args.radius??100,stats:"price,miles,dom",rows:50}),_mcRecent({make,model,year:args.year,zip:args.zip,radius:args.radius??100,stats:"price",rows:25})]);
  const prediction = args.vin ? await _mcPredict({vin:args.vin,zip:args.zip}) : null;
  return {decode,activeComps,soldComps,prediction};
}`,
  "oem-incentives-explorer": `async function _fetchDirect(args) {
  const incentives = await _mcIncentives({oem:args.make,zip:args.zip,model:args.model});
  let compareIncentives = [];
  if (args.compareMakes?.length) {
    compareIncentives = await Promise.all(args.compareMakes.map(async (make) => {
      const data = await _mcIncentives({oem:make,zip:args.zip});
      return {make,data};
    }));
  }
  return {make:args.make,incentives,compareIncentives};
}`,
  "generate-vin-market-report": `async function _fetchDirect(args) {
  const decode = await _mcDecode(args.vin);
  const [retail,wholesale,history] = await Promise.all([_mcPredict({...args,dealer_type:"franchise"}),_mcPredict({...args,dealer_type:"independent"}),_mcHistory(args.vin)]);
  const make=decode?.make, model=decode?.model, yr=decode?.year?\`\${decode.year-1}-\${decode.year+1}\`:undefined;
  const [activeComps,soldComps,soldSummary] = await Promise.all([_mcActive({make,model,year:yr,zip:args.zip,radius:100,stats:"price,miles,dom",rows:10}),_mcRecent({make,model,year:yr,zip:args.zip,radius:100,stats:"price",rows:10}),_mcSold({make,model,ranking_dimensions:"make,model",ranking_measure:"sold_count,average_sale_price"})]);
  let incentives = null;
  if (decode?.year && decode.year >= new Date().getFullYear()-1) { try { incentives = await _mcIncentives({oem:make,zip:args.zip}); } catch {} }
  return {decode,retail,wholesale,history,activeComps,soldComps,soldSummary,incentives};
}`,
  "trace-vin-history": `async function _fetchDirect(args) {
  const decode = await _mcDecode(args.vin);
  const [history,prediction] = await Promise.all([_mcHistory(args.vin),_mcPredict({vin:args.vin,miles:args.miles,dealer_type:"franchise",zip:args.zip})]);
  return {decode,history,prediction};
}`,
  "generate-pricing-report": `async function _fetchDirect(args) {
  const decode = await _mcDecode(args.vin);
  const [prediction,activeComps,soldComps] = await Promise.all([_mcPredict({...args,dealer_type:"franchise"}),_mcActive({make:decode?.make,model:decode?.model,zip:args.zip,radius:75,stats:"price,miles,dom",rows:10}),_mcRecent({make:decode?.make,model:decode?.model,zip:args.zip,radius:100,stats:"price",rows:10})]);
  return {decode,prediction,activeComps,soldComps};
}`,
  "find-incentive-deals": `async function _fetchDirect(args) {
  const makes = (args.makes??"Toyota,Honda,Ford,Chevrolet,Hyundai,Kia,Nissan,BMW,Mercedes-Benz,Volkswagen").split(",");
  const results = await Promise.all(makes.map(async (make) => {
    try { const data = await _mcIncentives({oem:make.trim(),zip:args.zip}); return {make:make.trim(),data}; }
    catch { return {make:make.trim(),data:null}; }
  }));
  return {results};
}`,
  "route-wholesale-vehicles": `async function _fetchDirect(args) {
  const vins = (args.vins??"").split(",").map(v=>v.trim()).filter(Boolean);
  const results = await Promise.all(vins.map(async (vin) => {
    const [decode,prediction] = await Promise.all([_mcDecode(vin),_mcPredict({vin,dealer_type:"franchise",zip:args.zip})]);
    return {vin,decode,prediction};
  }));
  return {results};
}`,
  "score-dealer-fit": `async function _fetchDirect(args) {
  const vins = (args.vins??"").split(",").map(v=>v.trim()).filter(Boolean);
  const results = await Promise.all(vins.map(async (vin) => {
    const [decode,prediction] = await Promise.all([_mcDecode(vin),_mcPredict({vin,dealer_type:"franchise",zip:args.zip})]);
    return {vin,decode,prediction};
  }));
  return {dealerId:args.dealer_id,results};
}`,
  "search-uk-cars": `async function _fetchDirect(args) {
  const active = await _mcUkActive({make:args.make,model:args.model,year:args.year,postal_code:args.postal_code,radius:args.radius,price_range:args.price_range,miles_range:args.miles_range,rows:args.rows??25,stats:"price,miles",start:args.start});
  let recent = null;
  try { recent = await _mcUkRecent({make:args.make,model:args.model,rows:10,stats:"price"}); } catch {}
  return {active,recent};
}`,
  "get-uk-market-trends": `async function _fetchDirect(args) {
  const active = await _mcUkActive({rows:0,stats:"price,miles",...(args.make?{make:args.make}:{})});
  const recent = await _mcUkRecent({rows:0,stats:"price,miles",...(args.make?{make:args.make}:{})});
  return {active,recent};
}`,
  "evaluate-loan-application": `async function _fetchDirect(args) {
  const decode = await _mcDecode(args.vin);
  const [retail,wholesale,history,soldComps] = await Promise.all([_mcPredict({...args,dealer_type:"franchise"}),_mcPredict({...args,dealer_type:"independent"}),_mcHistory(args.vin),_mcRecent({make:decode?.make,model:decode?.model,zip:args.zip,radius:100,rows:8,stats:"price"})]);
  return {decode,retail,wholesale,history,soldComps};
}`,
  "benchmark-insurance-premiums": `async function _fetchDirect(args) {
  const [byBodyType,byFuelType,byState] = await Promise.all([_mcSold({ranking_dimensions:"body_type",ranking_measure:"sold_count,average_sale_price",inventory_type:"Used"}),_mcSold({ranking_dimensions:"body_type,fuel_type_category",ranking_measure:"sold_count,average_sale_price",inventory_type:"Used"}),_mcSold({ranking_dimensions:"state",ranking_measure:"sold_count,average_sale_price",inventory_type:"Used",top_n:15})]);
  return {byBodyType,byFuelType,byState};
}`,
  "evaluate-incentive-deal": `async function _fetchDirect(args) {
  const decode = await _mcDecode(args.vin);
  const [prediction,incentives,activeComps] = await Promise.all([_mcPredict({...args,dealer_type:"franchise"}),_mcIncentives({oem:decode?.make,zip:args.zip,model:decode?.model}),_mcActive({make:decode?.make,model:decode?.model,zip:args.zip,radius:75,rows:5,stats:"price"})]);
  return {decode,prediction,incentives,activeComps};
}`,
  "generate-market-briefing": `async function _fetchDirect(args) {
  const [byMake,byBodyType,byState] = await Promise.all([_mcSold({ranking_dimensions:"make",ranking_measure:"sold_count,average_sale_price",ranking_order:"desc",top_n:15,inventory_type:"Used"}),_mcSold({ranking_dimensions:"body_type",ranking_measure:"sold_count,average_sale_price",inventory_type:"Used"}),_mcSold({ranking_dimensions:"state",ranking_measure:"average_sale_price",ranking_order:"desc",top_n:10,inventory_type:"Used"})]);
  return {byMake,byBodyType,byState};
}`,
  "find-auction-arbitrage": `async function _fetchDirect(args) {
  const vins = (args.vins??"").split(",").map(v=>v.trim()).filter(Boolean);
  const results = await Promise.all(vins.map(async (vin) => {
    const [decode,retail,wholesale] = await Promise.all([_mcDecode(vin),_mcPredict({vin,dealer_type:"franchise",zip:args.zip}),_mcPredict({vin,dealer_type:"independent",zip:args.zip})]);
    return {vin,decode,retail,wholesale};
  }));
  return {results};
}`,
  "scan-uk-lot-pricing": `async function _fetchDirect(args) {
  const inventory = await _mcUkActive({dealer_id:args.dealer_id,rows:30,stats:"price,miles"});
  const recent = await _mcUkRecent({make:args.make,rows:10,stats:"price"});
  return {inventory,recent};
}`,
  "analyze-dealer-conquest": `async function _fetchDirect(args) {
  const myInventory = await _mcActive({dealer_id:args.dealer_id,rows:50,facets:"make,model,body_type"});
  const marketInventory = await _mcActive({zip:args.zip,radius:args.radius??50,rows:0,facets:"make,model,body_type"});
  const demand = await _mcSold({state:args.state,ranking_dimensions:"make,model",ranking_measure:"sold_count",ranking_order:"desc",top_n:20});
  return {myInventory,marketInventory,demand};
}`,
  "detect-market-anomalies": `async function _fetchDirect(args) {
  const results = await _mcActive({make:args.make,model:args.model,year:args.year,state:args.state,rows:50,stats:"price,miles,dom",sort_by:"price",sort_order:"asc"});
  return {results};
}`,
  "stress-test-portfolio": `async function _fetchDirect(args) {
  const vins = (args.vins??"").split(",").map(v=>v.trim()).filter(Boolean);
  const results = await Promise.all(vins.map(async (vin) => {
    const [decode,prediction] = await Promise.all([_mcDecode(vin),_mcPredict({vin,dealer_type:"franchise",zip:args.zip})]);
    return {vin,decode,prediction};
  }));
  return {results};
}`,
  "value-rental-fleet": `async function _fetchDirect(args) {
  const vins = (args.vins??"").split(",").map(v=>v.trim()).filter(Boolean);
  const results = await Promise.all(vins.map(async (vin) => {
    const [decode,prediction] = await Promise.all([_mcDecode(vin),_mcPredict({vin,dealer_type:"franchise",zip:args.zip})]);
    return {vin,decode,prediction};
  }));
  return {results};
}`,
  "manage-fleet-lifecycle": `async function _fetchDirect(args) {
  const vins = (args.vins??"").split(",").map(v=>v.trim()).filter(Boolean);
  const results = await Promise.all(vins.map(async (vin) => {
    const [decode,prediction] = await Promise.all([_mcDecode(vin),_mcPredict({vin,dealer_type:"franchise",zip:args.zip})]);
    return {vin,decode,prediction};
  }));
  const replacements = await _mcActive({zip:args.zip,radius:50,rows:10,sort_by:"price",sort_order:"asc"});
  return {results,replacements};
}`,
};

// ── Passthrough tools (apps whose proxy handler returns 501 — these call MCP server tools with their own data structure) ──
// For these, _fetchDirect just returns null so they fall back to MCP mode or mock data
const PASSTHROUGH_TOOLS = [
  "group-operations-center", "inventory-balancer", "location-benchmarking",
  "watchlist-monitor", "earnings-signal-dashboard", "dealer-group-scorecard",
  "portfolio-risk-monitor", "ev-collateral-risk", "brand-command-center",
  "regional-demand-allocator", "ev-market-monitor", "auction-lane-planner",
  "territory-pipeline", "depreciation-analyzer", "market-trends-dashboard",
];

// ── Main migration ──────────────────────────────────────────────────────

const apps = readdirSync(appsDir).filter(d => existsSync(join(appsDir, d, "src", "main.ts")));
let migrated = 0, skipped = 0;

for (const app of apps) {
  const filePath = join(appsDir, app, "src", "main.ts");
  let code = readFileSync(filePath, "utf-8");

  // Skip if already migrated
  if (code.includes("_mcApi")) {
    console.log(`⊘ ${app}: already migrated`);
    skipped++;
    continue;
  }

  // Find the tool name this app uses
  const toolMatch = code.match(/_callTool\("([^"]+)"/);
  if (!toolMatch) {
    console.log(`⊘ ${app}: no _callTool usage found, skipping`);
    skipped++;
    continue;
  }
  const toolName = toolMatch[1];

  // Get the direct handler for this tool
  const handler = TOOL_HANDLERS[toolName];
  const isPassthrough = PASSTHROUGH_TOOLS.includes(toolName);

  // Build the _fetchDirect function
  const fetchDirectFn = handler
    ? handler
    : isPassthrough
      ? `async function _fetchDirect(_args) { return null; /* passthrough — uses MCP mode */ }`
      : `async function _fetchDirect(_args) { return null; /* no direct handler yet */ }`;

  // Find the _callTool function and replace it with the new version
  // Handle both OLD IIFE pattern and NEW let pattern

  // New _callTool that prefers direct API
  const newCallTool = `async function _callTool(toolName, args) {
  // 1. MCP mode (Claude, VS Code, etc.)
  if (_safeApp) {
    try { const r = _safeApp.callServerTool({ name: toolName, arguments: args }); return r; } catch {}
  }
  // 2. Direct API mode (browser → api.marketcheck.com)
  const auth = _getAuth();
  if (auth.value) {
    try {
      const data = await _fetchDirect(args);
      if (data) return { content: [{ type: "text", text: JSON.stringify(data) }] };
    } catch (e) { console.warn("Direct API failed, trying proxy:", e); }
    // 3. Proxy fallback
    try {
      const r = await fetch((_proxyBase()) + "/api/proxy/" + toolName, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...args, _auth_mode: auth.mode, _auth_value: auth.value }),
      });
      if (r.ok) { const d = await r.json(); return { content: [{ type: "text", text: JSON.stringify(d) }] }; }
    } catch {}
  }
  // 4. Demo mode (null → app uses mock data)
  return null;
}`;

  // Replace the existing _callTool function
  // Match the pattern: async function _callTool(toolName: string, args: Record<string, any>): Promise<any> { ... }
  const callToolRegex = /async function _callTool\(toolName[^)]*\)[^{]*\{[\s\S]*?(?=\nfunction _addSettingsBar)/;
  const simpleCallToolRegex = /async function _callTool\([^)]*\)[^{]*\{[^}]*(?:\{[^}]*\}[^}]*)*\}\s*\n/;

  if (callToolRegex.test(code)) {
    code = code.replace(callToolRegex, newCallTool + "\n");
  } else if (simpleCallToolRegex.test(code)) {
    code = code.replace(simpleCallToolRegex, newCallTool + "\n");
  } else {
    console.log(`⚠ ${app}: could not find _callTool to replace, injecting above _addSettingsBar`);
    code = code.replace("function _addSettingsBar", newCallTool + "\nfunction _addSettingsBar");
  }

  // Inject the MC API helper and _fetchDirect AFTER _proxyBase() function
  const proxyBaseEnd = code.indexOf("function _proxyBase()");
  if (proxyBaseEnd >= 0) {
    // Find the closing brace of _proxyBase
    const afterProxyBase = code.indexOf("\n", code.indexOf("}", proxyBaseEnd));
    if (afterProxyBase >= 0) {
      code = code.slice(0, afterProxyBase + 1) + MC_API_HELPER + "\n" + fetchDirectFn + "\n" + code.slice(afterProxyBase + 1);
    }
  } else {
    console.log(`⚠ ${app}: no _proxyBase found, injecting at top`);
  }

  writeFileSync(filePath, code, "utf-8");
  console.log(`✓ ${app} (tool: ${toolName}${isPassthrough ? " [passthrough]" : ""})`);
  migrated++;
}

console.log(`\nDone. ${migrated} migrated, ${skipped} skipped.`);
