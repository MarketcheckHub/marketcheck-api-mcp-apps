/**
 * VIN Market Report
 * VIN-based market intelligence report with deal gauge,
 * market position, price prediction, comparables, price history, depreciation,
 * market trends, and OEM incentives. Supports compact widget mode.
 */
import { App } from "@modelcontextprotocol/ext-apps";

let _safeApp: any = null;
try { _safeApp = new App({ name: "vin-market-report" }); } catch {}

// ── Dual-Mode Data Provider ────────────────────────────────────────────
function _getAuth(): { mode: "api_key" | "oauth_token" | null; value: string | null } {
  const params = new URLSearchParams(location.search);
  const token = params.get("access_token") ?? localStorage.getItem("mc_access_token");
  if (token) return { mode: "oauth_token", value: token };
  const key = params.get("api_key") ?? localStorage.getItem("mc_api_key");
  if (key) return { mode: "api_key", value: key };
  return { mode: null, value: null };
}

function _detectAppMode(): "mcp" | "live" | "demo" {
  if (_safeApp) return "mcp";
  if (_getAuth().value) return "live";
  return "demo";
}

function _isEmbedMode(): boolean {
  return new URLSearchParams(location.search).has("embed");
}

function _getUrlParams(): Record<string, string> {
  const params = new URLSearchParams(location.search);
  const result: Record<string, string> = {};
  for (const key of ["vin", "zip", "make", "model", "miles", "state", "dealer_id", "ticker", "price", "compact"]) {
    const v = params.get(key);
    if (v) result[key] = v;
  }
  return result;
}

function _proxyBase(): string {
  return location.protocol.startsWith("http") ? "" : "http://localhost:3001";
}

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
function _mcIncentives(p) { const q={...p}; if(q.oem&&!q.make){q.make=q.oem;delete q.oem;} return _mcApi("/search/car/incentive/oem", q); }
function _mcUkActive(p) { return _mcApi("/search/car/uk/active", p); }
function _mcUkRecent(p) { return _mcApi("/search/car/uk/recents", p); }

async function _fetchDirect(args) {
  const decode = await _mcDecode(args.vin);
  const [retail,wholesale,history] = await Promise.all([_mcPredict({...args,dealer_type:"franchise"}),_mcPredict({...args,dealer_type:"independent"}),_mcHistory(args.vin)]);
  const make=decode?.make, model=decode?.model, yr=decode?.year?`${decode.year-1}-${decode.year+1}`:undefined;
  const [activeComps,soldComps,soldSummary] = await Promise.all([_mcActive({make,model,year:yr,zip:args.zip,radius:100,stats:"price,miles,dom",rows:10}),_mcRecent({make,model,year:yr,zip:args.zip,radius:100,stats:"price",rows:10}),_mcSold({make,model,ranking_dimensions:"make,model",ranking_measure:"sold_count,average_sale_price"})]);
  let incentives = null;
  if (decode?.year && decode.year >= new Date().getFullYear()-1) { try { incentives = await _mcIncentives({oem:make,zip:args.zip}); } catch {} }
  return {decode,retail,wholesale,history,activeComps,soldComps,soldSummary,incentives};
}

function _transformRawToCarStory(raw: any, args: any): any {
  const d = raw.decode ?? {};
  const retail = raw.retail ?? {};
  const wholesale = raw.wholesale ?? {};
  const activeResult = raw.activeComps ?? {};
  const soldResult = raw.soldComps ?? {};
  const historyResult = raw.history ?? [];

  const vehicle = {
    vin: args.vin,
    year: d.year ?? 0,
    make: d.make ?? "Unknown",
    model: d.model ?? "Unknown",
    trim: d.trim ?? "",
    bodyType: d.body_type ?? "",
    engine: d.engine ?? "",
    transmission: d.transmission ?? "",
    drivetrain: d.drivetrain ?? "",
    fuelType: d.fuel_type ?? "",
    msrp: d.msrp ?? 0,
    exteriorColor: typeof d.exterior_color === "object" ? d.exterior_color?.name ?? "" : d.exterior_color ?? "",
    interiorColor: typeof d.interior_color === "object" ? d.interior_color?.name ?? "" : d.interior_color ?? "",
  };

  const franchiseFmv = retail.predicted_price ?? retail.marketcheck_price ?? retail.price ?? 0;
  const independentFmv = wholesale.predicted_price ?? wholesale.marketcheck_price ?? wholesale.price ?? 0;
  const confLow = retail.price_range?.low ?? (franchiseFmv > 0 ? franchiseFmv * 0.9 : 0);
  const confHigh = retail.price_range?.high ?? (franchiseFmv > 0 ? franchiseFmv * 1.1 : 0);

  const stats = activeResult.stats ?? {};
  const priceStats = stats.price ?? {};
  const milesStats = stats.miles ?? {};
  const domStats = stats.dom ?? {};

  const effectiveAskingPrice = args.askingPrice ?? franchiseFmv;
  const minPrice = priceStats.min ?? confLow;
  const maxPrice = priceStats.max ?? confHigh;
  const range = maxPrice - minPrice || 1;
  const percentile = Math.max(0, Math.min(100, ((effectiveAskingPrice - minPrice) / range) * 100));

  let dealScore = 50;
  if (franchiseFmv > 0) {
    const ratio = effectiveAskingPrice / franchiseFmv;
    if (ratio <= 0.90) dealScore = 95;
    else if (ratio <= 0.95) dealScore = 80;
    else if (ratio <= 1.0) dealScore = 65;
    else if (ratio <= 1.05) dealScore = 45;
    else if (ratio <= 1.10) dealScore = 30;
    else dealScore = 15;
  }
  const dealLabel = dealScore >= 80 ? "GREAT DEAL" : dealScore >= 60 ? "GOOD DEAL" : dealScore >= 40 ? "FAIR PRICE" : dealScore >= 25 ? "ABOVE MARKET" : "OVERPRICED";

  const activeListings = activeResult.listings ?? [];
  const comparables = activeListings.filter((l: any) => l.vin !== args.vin).slice(0, 8).map((l: any) => ({
    year: l.year ?? vehicle.year, make: l.make ?? vehicle.make, model: l.model ?? vehicle.model,
    trim: l.trim ?? "", price: l.price ?? 0, miles: l.miles ?? 0,
    city: l.dealer?.city ?? "", state: l.dealer?.state ?? "",
    dom: l.days_on_market ?? 0, dealerName: l.dealer?.name ?? "Unknown",
    distance: l.dist ?? 0, vdpUrl: l.vdp_url ?? "",
  }));

  const soldListings = soldResult.listings ?? [];
  const soldComps = soldListings.slice(0, 8).map((l: any) => ({
    year: l.year ?? l.build?.year ?? vehicle.year, make: l.make ?? l.build?.make ?? vehicle.make,
    model: l.model ?? l.build?.model ?? vehicle.model, trim: l.trim ?? l.build?.trim ?? "",
    soldPrice: l.price ?? 0, miles: l.miles ?? 0,
    soldDate: l.last_seen_at_date ?? l.first_seen_at_date ?? l.scraped_at_date ?? "",
    dealerName: l.dealer?.name ?? l.seller_name ?? "Unknown",
    city: l.dealer?.city ?? l.city ?? "", state: l.dealer?.state ?? l.state ?? "",
  }));

  const historyListings = Array.isArray(historyResult) ? historyResult : historyResult.listings ?? [];
  const priceHistory = historyListings.filter((h: any) => h.price).map((h: any) => ({
    date: h.first_seen_at_date ?? h.last_seen_at_date ?? h.first_seen ?? h.last_seen ?? "",
    price: h.price ?? 0,
    dealer: h.dealer?.name ?? h.seller_name ?? "Unknown",
    city: h.dealer?.city ?? h.city ?? "", state: h.dealer?.state ?? h.state ?? "",
  }));

  const currentAge = new Date().getFullYear() - vehicle.year;
  const msrp = vehicle.msrp || (franchiseFmv > 0 ? franchiseFmv * 1.3 : 0);
  const currentValue = franchiseFmv || effectiveAskingPrice;
  const depreciation: any[] = [];
  if (msrp > 0 && currentAge > 0 && currentValue > 0) {
    // Compute actual annual depreciation rate from MSRP → current FMV
    const annualRate = 1 - Math.pow(currentValue / msrp, 1 / currentAge);
    const decayFactor = 1 - Math.max(0.05, Math.min(0.25, annualRate)); // clamp 5-25%
    depreciation.push({ ageMonths: 0, value: msrp, label: "MSRP" });
    for (let yr = 1; yr <= Math.max(currentAge + 2, 5); yr++) {
      const isProjected = yr > currentAge;
      const val = yr === currentAge ? currentValue : Math.round(msrp * Math.pow(decayFactor, yr));
      depreciation.push({ ageMonths: yr * 12, value: val, label: yr === currentAge ? "Current" : isProjected ? "Projected" : `Year ${yr}` });
    }
  } else if (msrp > 0) {
    // New vehicle or no FMV — use standard 15% decay
    depreciation.push({ ageMonths: 0, value: msrp, label: "MSRP" });
    for (let yr = 1; yr <= Math.max(currentAge + 2, 5); yr++) {
      const isProjected = yr > currentAge;
      depreciation.push({ ageMonths: yr * 12, value: Math.round(msrp * Math.pow(0.85, yr)), label: yr === currentAge ? "Current" : isProjected ? "Projected" : `Year ${yr}` });
    }
  }

  // Compute market trend from sold vs active pricing
  const soldStats = soldResult.stats?.price ?? {};
  const soldAvg = soldStats.mean ?? soldStats.avg ?? 0;
  const activeAvg = priceStats.mean ?? priceStats.avg ?? 0;
  let pctChange30d = 0;
  let trendDirection: string = "stable";
  if (soldAvg > 0 && activeAvg > 0) {
    pctChange30d = ((activeAvg - soldAvg) / soldAvg) * 100;
    trendDirection = pctChange30d < -2 ? "down" : pctChange30d > 2 ? "up" : "stable";
  } else if (franchiseFmv > 0 && activeAvg > 0) {
    pctChange30d = ((activeAvg - franchiseFmv) / franchiseFmv) * 100;
    trendDirection = pctChange30d < -2 ? "down" : pctChange30d > 2 ? "up" : "stable";
  }
  const activeCount = activeResult.num_found ?? 0;
  const soldCount = soldResult.num_found ?? 0;
  const inventoryChange = soldCount > 0 ? ((activeCount - soldCount) / soldCount) * 100 : 0;
  const marketTrend = {
    direction: trendDirection,
    pctChange30d: Math.round(pctChange30d * 10) / 10,
    avgDom: Math.round(domStats.avg ?? domStats.mean ?? 30),
    inventoryChange: Math.round(inventoryChange * 10) / 10,
  };

  let incentives: any[] = [];
  if (raw.incentives?.incentives) {
    incentives = raw.incentives.incentives.slice(0, 5).map((inc: any) => ({
      title: inc.title ?? "Incentive", type: inc.offer_type ?? "Offer",
      amount: inc.cash_amount ?? inc.amount ?? 0, endDate: inc.end_date ?? "",
      description: inc.description ?? "",
    }));
  }

  return {
    vehicle, askingPrice: effectiveAskingPrice, miles: args.miles ?? 0,
    marketPosition: {
      totalActive: activeResult.num_found ?? 0,
      medianPrice: priceStats.median ?? priceStats.avg ?? franchiseFmv,
      avgPrice: priceStats.avg ?? franchiseFmv, minPrice, maxPrice,
      avgMiles: milesStats.avg ?? 0, avgDom: Math.round(domStats.avg ?? 0), percentile,
    },
    pricePrediction: { franchisePrice: franchiseFmv, independentPrice: independentFmv, confidenceLow: confLow, confidenceHigh: confHigh },
    dealScore, dealLabel, comparables, soldComps, priceHistory, depreciation, marketTrend, incentives,
    isNew: vehicle.year >= new Date().getFullYear(),
  };
}

async function _callTool(toolName, args) {
  const auth = _getAuth();
  const isVinReport = toolName === "generate-vin-market-report";
  if (auth.value) {
    // 1. Proxy (same-origin, reliable)
    try {
      const r = await fetch((_proxyBase()) + "/api/proxy/" + toolName, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...args, _auth_mode: auth.mode, _auth_value: auth.value }),
      });
      if (r.ok) {
        const raw = await r.json();
        const d = isVinReport ? _transformRawToCarStory(raw, args) : raw;
        return { content: [{ type: "text", text: JSON.stringify(d) }] };
      }
    } catch {}
    // 2. Direct API fallback
    try {
      const raw = await _fetchDirect(args);
      if (raw) {
        const d = isVinReport ? _transformRawToCarStory(raw, args) : raw;
        return { content: [{ type: "text", text: JSON.stringify(d) }] };
      }
    } catch {}
    // In live mode (have auth), don't fall through to MCP — return null to trigger mock
    return null;
  }
  // 3. MCP mode (Claude, VS Code, etc.) — only when no auth (pure MCP mode)
  if (_safeApp) {
    try { return await _safeApp.callServerTool({ name: toolName, arguments: args }); } catch {}
  }
  // 4. Demo mode
  return null;
}

function _addSettingsBar(headerEl?: HTMLElement) {
  if (_isEmbedMode() || !headerEl) return;
  const mode = _detectAppMode();
  const bar = document.createElement("div");
  bar.style.cssText = "display:flex;align-items:center;gap:8px;margin-left:auto;";
  const colors: Record<string, { bg: string; fg: string; label: string }> = {
    mcp: { bg: "#1e40af22", fg: "#60a5fa", label: "MCP" },
    live: { bg: "#05966922", fg: "#34d399", label: "LIVE" },
    demo: { bg: "#92400e88", fg: "#fbbf24", label: "DEMO" },
  };
  const c = colors[mode];
  bar.innerHTML = `<span style="padding:3px 10px;border-radius:10px;font-size:10px;font-weight:700;letter-spacing:0.5px;background:${c.bg};color:${c.fg};border:1px solid ${c.fg}33;">${c.label}</span>`;
  if (mode !== "mcp") {
    const gear = document.createElement("button");
    gear.innerHTML = "&#9881;";
    gear.title = "API Settings";
    gear.style.cssText = "background:none;border:none;color:#94a3b8;font-size:18px;cursor:pointer;padding:4px;";
    const panel = document.createElement("div");
    panel.style.cssText = "display:none;position:fixed;top:50px;right:16px;background:#1e293b;border:1px solid #334155;border-radius:8px;padding:16px;z-index:1000;min-width:300px;box-shadow:0 8px 32px rgba(0,0,0,0.5);";
    panel.innerHTML = `<div style="font-size:13px;font-weight:600;color:#f8fafc;margin-bottom:12px;">API Configuration</div>
      <label style="font-size:11px;color:#94a3b8;display:block;margin-bottom:4px;">MarketCheck API Key</label>
      <input id="_mc_key_inp" type="password" placeholder="Enter your API key" value="${_getAuth().mode === 'api_key' ? _getAuth().value ?? '' : ''}"
        style="width:100%;padding:8px;border-radius:6px;border:1px solid #334155;background:#0f172a;color:#e2e8f0;font-size:13px;margin-bottom:8px;box-sizing:border-box;" />
      <div style="font-size:10px;color:#64748b;margin-bottom:12px;">Get a free key at <a href="https://developers.marketcheck.com" target="_blank" style="color:#60a5fa;">developers.marketcheck.com</a></div>
      <div style="display:flex;gap:8px;">
        <button id="_mc_save" style="flex:1;padding:8px;border-radius:6px;border:none;background:#3b82f6;color:#fff;font-size:13px;font-weight:600;cursor:pointer;">Save & Reload</button>
        <button id="_mc_clear" style="padding:8px 12px;border-radius:6px;border:1px solid #334155;background:transparent;color:#94a3b8;font-size:13px;cursor:pointer;">Clear</button>
      </div>`;
    gear.addEventListener("click", () => { panel.style.display = panel.style.display === "none" ? "block" : "none"; });
    document.addEventListener("click", (e) => { if (!panel.contains(e.target as Node) && e.target !== gear) panel.style.display = "none"; });
    document.body.appendChild(panel);
    setTimeout(() => {
      document.getElementById("_mc_save")?.addEventListener("click", () => { const k = (document.getElementById("_mc_key_inp") as HTMLInputElement)?.value?.trim(); if (k) { localStorage.setItem("mc_api_key", k); location.reload(); } });
      document.getElementById("_mc_clear")?.addEventListener("click", () => { localStorage.removeItem("mc_api_key"); localStorage.removeItem("mc_access_token"); location.reload(); });
    }, 0);
    bar.appendChild(gear);
  }
  headerEl.appendChild(bar);
}

(function injectResponsiveStyles() {
  const s = document.createElement("style");
  s.textContent = `
    @media (max-width: 768px) {
      body { font-size: 13px !important; }
      table { font-size: 12px !important; }
      th, td { padding: 6px 8px !important; }
      h1 { font-size: 18px !important; }
      h2 { font-size: 15px !important; }
      canvas { max-width: 100% !important; }
      input, select, button { font-size: 14px !important; }
      [style*="display:flex"][style*="gap"],
      [style*="display: flex"][style*="gap"] { flex-wrap: wrap !important; }
      [style*="grid-template-columns: repeat"] { grid-template-columns: 1fr !important; }
      [style*="grid-template-columns:repeat"] { grid-template-columns: 1fr !important; }
      div[style*="overflow-x:auto"], div[style*="overflow-x: auto"] { -webkit-overflow-scrolling: touch; }
      table { min-width: 600px; }
      [style*="width:35%"], [style*="width:40%"], [style*="width:25%"],
      [style*="width:50%"], [style*="width:60%"], [style*="width:65%"],
      [style*="width: 35%"], [style*="width: 40%"], [style*="width: 25%"],
      [style*="width: 50%"], [style*="width: 60%"], [style*="width: 65%"] {
        width: 100% !important; min-width: 0 !important;
      }
    }
    @media (max-width: 480px) {
      body { padding: 8px !important; }
      h1 { font-size: 16px !important; }
      th, td { padding: 4px 6px !important; font-size: 11px !important; }
      input, select { max-width: 100% !important; width: 100% !important; box-sizing: border-box !important; }
    }
  `;
  document.head.appendChild(s);
})();


// ── Types ──────────────────────────────────────────────────────────────────────

interface VehicleSpec {
  vin: string;
  year: number;
  make: string;
  model: string;
  trim: string;
  bodyType: string;
  engine: string;
  transmission: string;
  drivetrain: string;
  fuelType: string;
  msrp: number;
  exteriorColor: string;
  interiorColor: string;
}

interface MarketPosition {
  totalActive: number;
  medianPrice: number;
  avgPrice: number;
  minPrice: number;
  maxPrice: number;
  avgMiles: number;
  avgDom: number;
  percentile: number;
}

interface PricePrediction {
  franchisePrice: number;
  independentPrice: number;
  confidenceLow: number;
  confidenceHigh: number;
}

interface Comparable {
  year: number;
  make: string;
  model: string;
  trim: string;
  price: number;
  miles: number;
  city: string;
  state: string;
  dom: number;
  dealerName: string;
  distance: number;
  vdpUrl: string;
}

interface SoldComp {
  year: number;
  make: string;
  model: string;
  trim: string;
  soldPrice: number;
  miles: number;
  soldDate: string;
  dealerName: string;
  city: string;
  state: string;
}

interface PriceHistoryEntry {
  date: string;
  price: number;
  dealer: string;
  city: string;
  state: string;
}

interface DepreciationPoint {
  ageMonths: number;
  value: number;
  label: string;
}

interface MarketTrend {
  direction: "up" | "down" | "stable";
  pctChange30d: number;
  avgDom: number;
  inventoryChange: number;
}

interface OemIncentive {
  title: string;
  type: string;
  amount: number;
  endDate: string;
  description: string;
}

interface CarStoryData {
  vehicle: VehicleSpec;
  askingPrice: number;
  miles: number;
  marketPosition: MarketPosition;
  pricePrediction: PricePrediction;
  dealScore: number;
  dealLabel: string;
  comparables: Comparable[];
  soldComps: SoldComp[];
  priceHistory: PriceHistoryEntry[];
  depreciation: DepreciationPoint[];
  marketTrend: MarketTrend;
  incentives: OemIncentive[];
  isNew: boolean;
}

// ── Mock Data ──────────────────────────────────────────────────────────────────

function getMockData(vin: string, askingPrice?: number, miles?: number, zip?: string): CarStoryData {
  const ap = askingPrice ?? 28500;
  const ml = miles ?? 34200;
  return {
    vehicle: {
      vin: vin || "KNDCB3LC9L5359658",
      year: 2021,
      make: "Toyota",
      model: "RAV4",
      trim: "XLE Premium",
      bodyType: "SUV / Crossover",
      engine: "2.5L 4-Cylinder DOHC 16V",
      transmission: "8-Speed Automatic",
      drivetrain: "All-Wheel Drive",
      fuelType: "Gasoline",
      msrp: 33450,
      exteriorColor: "Magnetic Gray Metallic",
      interiorColor: "Black SofTex",
    },
    askingPrice: ap,
    miles: ml,
    marketPosition: {
      totalActive: 147,
      medianPrice: 27400,
      avgPrice: 27650,
      minPrice: 22100,
      maxPrice: 34900,
      avgMiles: 38500,
      avgDom: 32,
      percentile: Math.max(0, Math.min(100, ((ap - 22100) / (34900 - 22100)) * 100)),
    },
    pricePrediction: {
      franchisePrice: 27200,
      independentPrice: 25800,
      confidenceLow: 25500,
      confidenceHigh: 29100,
    },
    dealScore: ap <= 25500 ? 92 : ap <= 27200 ? 72 : ap <= 29100 ? 48 : ap <= 32000 ? 28 : 12,
    dealLabel: ap <= 25500 ? "GREAT DEAL" : ap <= 27200 ? "GOOD DEAL" : ap <= 29100 ? "FAIR PRICE" : ap <= 32000 ? "ABOVE MARKET" : "OVERPRICED",
    comparables: [
      { year: 2021, make: "Toyota", model: "RAV4", trim: "XLE", price: 25900, miles: 41200, city: "Denver", state: "CO", dom: 18, dealerName: "Mile High Toyota", distance: 8, vdpUrl: "#" },
      { year: 2021, make: "Toyota", model: "RAV4", trim: "XLE Premium", price: 26800, miles: 36800, city: "Boulder", state: "CO", dom: 24, dealerName: "Boulder Toyota", distance: 32, vdpUrl: "#" },
      { year: 2022, make: "Toyota", model: "RAV4", trim: "LE", price: 27100, miles: 28500, city: "Aurora", state: "CO", dom: 12, dealerName: "AutoNation Toyota Arapahoe", distance: 14, vdpUrl: "#" },
      { year: 2021, make: "Toyota", model: "RAV4", trim: "XLE Premium", price: 27900, miles: 32100, city: "Lakewood", state: "CO", dom: 45, dealerName: "Larry H. Miller Toyota", distance: 11, vdpUrl: "#" },
      { year: 2020, make: "Toyota", model: "RAV4", trim: "XLE Premium", price: 25200, miles: 48700, city: "Fort Collins", state: "CO", dom: 55, dealerName: "Pedersen Toyota", distance: 65, vdpUrl: "#" },
      { year: 2021, make: "Toyota", model: "RAV4", trim: "Limited", price: 29400, miles: 29800, city: "Colorado Springs", state: "CO", dom: 8, dealerName: "Springs Toyota", distance: 70, vdpUrl: "#" },
      { year: 2022, make: "Toyota", model: "RAV4", trim: "XLE", price: 28200, miles: 22100, city: "Pueblo", state: "CO", dom: 30, dealerName: "Pueblo Toyota", distance: 112, vdpUrl: "#" },
      { year: 2021, make: "Toyota", model: "RAV4", trim: "XSE Hybrid", price: 29800, miles: 31400, city: "Longmont", state: "CO", dom: 14, dealerName: "Longmont Toyota", distance: 45, vdpUrl: "#" },
    ],
    soldComps: [
      { year: 2021, make: "Toyota", model: "RAV4", trim: "XLE Premium", soldPrice: 26900, miles: 39200, soldDate: "2026-03-10", dealerName: "Mountain Toyota", city: "Arvada", state: "CO" },
      { year: 2021, make: "Toyota", model: "RAV4", trim: "XLE", soldPrice: 25400, miles: 42800, soldDate: "2026-03-05", dealerName: "CarMax Aurora", city: "Aurora", state: "CO" },
      { year: 2022, make: "Toyota", model: "RAV4", trim: "LE", soldPrice: 26200, miles: 31000, soldDate: "2026-02-28", dealerName: "Denver Auto Group", city: "Denver", state: "CO" },
    ],
    priceHistory: [
      { date: "2025-09-15", price: 31200, dealer: "First Auto Group", city: "Dallas", state: "TX" },
      { date: "2025-11-20", price: 30500, dealer: "CarMax Dallas", city: "Dallas", state: "TX" },
      { date: "2026-01-10", price: 29200, dealer: "Prestige Motors", city: "Denver", state: "CO" },
      { date: "2026-02-18", price: 28500, dealer: "Colorado Auto Group", city: "Denver", state: "CO" },
    ],
    depreciation: [
      { ageMonths: 0, value: 33450, label: "MSRP" },
      { ageMonths: 12, value: 30100, label: "Year 1" },
      { ageMonths: 24, value: 28200, label: "Year 2" },
      { ageMonths: 36, value: 26500, label: "Year 3" },
      { ageMonths: 48, value: 24800, label: "Year 4" },
      { ageMonths: 60, value: ap, label: "Current" },
      { ageMonths: 72, value: Math.round(ap * 0.88), label: "Projected" },
      { ageMonths: 84, value: Math.round(ap * 0.78), label: "Projected" },
    ],
    marketTrend: {
      direction: "down",
      pctChange30d: -2.1,
      avgDom: 32,
      inventoryChange: 8.4,
    },
    incentives: [],
    isNew: false,
  };
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function fmtCurrency(v: number | undefined): string {
  if (v == null || isNaN(v)) return "N/A";
  return "$" + Math.round(v).toLocaleString();
}

function fmtNumber(v: number | undefined): string {
  if (v == null || isNaN(v)) return "N/A";
  return Math.round(v).toLocaleString();
}

function fmtPct(v: number): string {
  return (v >= 0 ? "+" : "") + v.toFixed(1) + "%";
}

function getDealColor(score: number): string {
  if (score >= 70) return "#10b981";
  if (score >= 50) return "#22c55e";
  if (score >= 35) return "#f59e0b";
  if (score >= 20) return "#f97316";
  return "#ef4444";
}

function getDealBg(score: number): string {
  if (score >= 70) return "#10b98118";
  if (score >= 50) return "#22c55e18";
  if (score >= 35) return "#f59e0b18";
  if (score >= 20) return "#f9731618";
  return "#ef444418";
}

function isCompactMode(): boolean {
  return new URLSearchParams(location.search).get("compact") === "true";
}

// ── Canvas: Deal Score Gauge ──────────────────────────────────────────────────

function drawDealGauge(canvas: HTMLCanvasElement, data: {
  score: number;
  label: string;
  askingPrice: number;
  fmv: number;
  minPrice: number;
  maxPrice: number;
}, compact = false) {
  const dpr = window.devicePixelRatio || 1;
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  const ctx = canvas.getContext("2d")!;
  ctx.scale(dpr, dpr);

  const cx = w / 2;
  const cy = compact ? h - 16 : h - 30;
  const radius = Math.min(cx - 30, cy - 20);
  const startAngle = Math.PI;
  const arcWidth = compact ? 14 : 20;

  const segments = [
    { start: 0, end: 0.15, color: "#ef4444" },
    { start: 0.15, end: 0.30, color: "#f97316" },
    { start: 0.30, end: 0.50, color: "#f59e0b" },
    { start: 0.50, end: 0.70, color: "#22c55e" },
    { start: 0.70, end: 0.85, color: "#10b981" },
    { start: 0.85, end: 1.0, color: "#059669" },
  ];

  for (const seg of segments) {
    const a1 = startAngle + seg.start * Math.PI;
    const a2 = startAngle + seg.end * Math.PI;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, a1, a2);
    ctx.strokeStyle = seg.color;
    ctx.lineWidth = arcWidth;
    ctx.lineCap = "butt";
    ctx.stroke();
  }

  // Outer/inner thin borders
  ctx.beginPath();
  ctx.arc(cx, cy, radius + arcWidth / 2 + 1, startAngle, 2 * Math.PI);
  ctx.strokeStyle = "#33415544";
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(cx, cy, radius - arcWidth / 2 - 1, startAngle, 2 * Math.PI);
  ctx.strokeStyle = "#33415544";
  ctx.lineWidth = 1;
  ctx.stroke();

  // Tick marks
  for (let i = 0; i <= 10; i++) {
    const angle = startAngle + (i / 10) * Math.PI;
    const innerR = radius - arcWidth / 2 - 6;
    const outerR = radius - arcWidth / 2 - 2;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(angle) * innerR, cy + Math.sin(angle) * innerR);
    ctx.lineTo(cx + Math.cos(angle) * outerR, cy + Math.sin(angle) * outerR);
    ctx.strokeStyle = "#64748b";
    ctx.lineWidth = i % 5 === 0 ? 2 : 1;
    ctx.stroke();
  }

  // FMV marker (blue triangle on arc)
  const range = data.maxPrice - data.minPrice || 1;
  const fmvPct = Math.max(0, Math.min(1, 1 - (data.fmv - data.minPrice) / range));
  const fmvAngle = startAngle + fmvPct * Math.PI;
  const markerR = radius + arcWidth / 2 + 8;
  const mx = cx + Math.cos(fmvAngle) * markerR;
  const my = cy + Math.sin(fmvAngle) * markerR;

  ctx.save();
  ctx.translate(mx, my);
  ctx.rotate(fmvAngle + Math.PI / 2);
  ctx.beginPath();
  ctx.moveTo(0, -5);
  ctx.lineTo(-4, 5);
  ctx.lineTo(4, 5);
  ctx.closePath();
  ctx.fillStyle = "#3b82f6";
  ctx.fill();
  ctx.restore();

  if (!compact) {
    const fmvLabelR = markerR + 14;
    const fx = cx + Math.cos(fmvAngle) * fmvLabelR;
    const fy = cy + Math.sin(fmvAngle) * fmvLabelR;
    ctx.font = "bold 10px -apple-system, sans-serif";
    ctx.fillStyle = "#3b82f6";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("FMV", fx, fy);
  }

  // Needle for asking price position (higher score = lower price = needle more to the right)
  const scorePct = Math.max(0, Math.min(1, data.score / 100));
  const needleAngle = startAngle + scorePct * Math.PI;
  const needleLen = radius - arcWidth / 2 - 12;

  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.3)";
  ctx.shadowBlur = 4;
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(cx + Math.cos(needleAngle) * needleLen, cy + Math.sin(needleAngle) * needleLen);
  ctx.strokeStyle = "#f8fafc";
  ctx.lineWidth = 2.5;
  ctx.lineCap = "round";
  ctx.stroke();
  ctx.restore();

  const tipX = cx + Math.cos(needleAngle) * needleLen;
  const tipY = cy + Math.sin(needleAngle) * needleLen;
  ctx.beginPath();
  ctx.arc(tipX, tipY, 3, 0, 2 * Math.PI);
  ctx.fillStyle = "#f8fafc";
  ctx.fill();

  // Center hub
  ctx.beginPath();
  ctx.arc(cx, cy, 8, 0, 2 * Math.PI);
  ctx.fillStyle = "#1e293b";
  ctx.fill();
  ctx.strokeStyle = "#f8fafc";
  ctx.lineWidth = 2;
  ctx.stroke();

  // Score in center
  const scoreColor = getDealColor(data.score);
  ctx.font = `bold ${compact ? 22 : 28}px -apple-system, sans-serif`;
  ctx.fillStyle = scoreColor;
  ctx.textAlign = "center";
  ctx.textBaseline = "bottom";
  ctx.fillText(String(data.score), cx, cy - 14);

  ctx.font = `bold ${compact ? 9 : 11}px -apple-system, sans-serif`;
  ctx.fillStyle = scoreColor;
  ctx.fillText(data.label, cx, cy - 2);

  // Min/Max labels
  if (!compact) {
    ctx.font = "10px -apple-system, sans-serif";
    ctx.fillStyle = "#64748b";
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.fillText("Overpriced", cx - radius - 10, cy + 6);
    ctx.textAlign = "right";
    ctx.fillText("Great Deal", cx + radius + 10, cy + 6);
  }
}

// ── Canvas: Price History Timeline (Line Chart) ──────────────────────────────

function drawPriceHistoryChart(canvas: HTMLCanvasElement, entries: PriceHistoryEntry[]) {
  if (entries.length < 2) return;

  const dpr = window.devicePixelRatio || 1;
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  const ctx = canvas.getContext("2d")!;
  ctx.scale(dpr, dpr);

  const padL = 70, padR = 20, padT = 20, padB = 50;
  const chartW = w - padL - padR;
  const chartH = h - padT - padB;

  const prices = entries.map(e => e.price);
  const minP = Math.min(...prices) * 0.95;
  const maxP = Math.max(...prices) * 1.05;
  const priceRange = maxP - minP || 1;

  const dates = entries.map(e => new Date(e.date).getTime());
  const minD = Math.min(...dates);
  const maxD = Math.max(...dates);
  const dateRange = maxD - minD || 1;

  // Grid lines
  ctx.strokeStyle = "#1e293b";
  ctx.lineWidth = 1;
  for (let i = 0; i <= 4; i++) {
    const y = padT + (i / 4) * chartH;
    ctx.beginPath();
    ctx.moveTo(padL, y);
    ctx.lineTo(padL + chartW, y);
    ctx.stroke();

    const val = maxP - (i / 4) * priceRange;
    ctx.font = "11px -apple-system, sans-serif";
    ctx.fillStyle = "#64748b";
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    ctx.fillText(fmtCurrency(val), padL - 8, y);
  }

  // Line
  ctx.beginPath();
  ctx.strokeStyle = "#3b82f6";
  ctx.lineWidth = 2.5;
  ctx.lineJoin = "round";
  const points: { x: number; y: number }[] = [];
  for (let i = 0; i < entries.length; i++) {
    const x = padL + ((dates[i] - minD) / dateRange) * chartW;
    const y = padT + ((maxP - entries[i].price) / priceRange) * chartH;
    points.push({ x, y });
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();

  // Gradient fill under line
  ctx.beginPath();
  for (let i = 0; i < points.length; i++) {
    if (i === 0) ctx.moveTo(points[i].x, points[i].y);
    else ctx.lineTo(points[i].x, points[i].y);
  }
  ctx.lineTo(points[points.length - 1].x, padT + chartH);
  ctx.lineTo(points[0].x, padT + chartH);
  ctx.closePath();
  const grad = ctx.createLinearGradient(0, padT, 0, padT + chartH);
  grad.addColorStop(0, "#3b82f633");
  grad.addColorStop(1, "#3b82f600");
  ctx.fillStyle = grad;
  ctx.fill();

  // Data points + labels
  for (let i = 0; i < points.length; i++) {
    ctx.beginPath();
    ctx.arc(points[i].x, points[i].y, 5, 0, 2 * Math.PI);
    ctx.fillStyle = "#3b82f6";
    ctx.fill();
    ctx.strokeStyle = "#0f172a";
    ctx.lineWidth = 2;
    ctx.stroke();

    // Price label above point
    ctx.font = "bold 10px -apple-system, sans-serif";
    ctx.fillStyle = "#e2e8f0";
    ctx.textAlign = "center";
    ctx.textBaseline = "bottom";
    ctx.fillText(fmtCurrency(entries[i].price), points[i].x, points[i].y - 10);

    // Date label below
    const d = new Date(entries[i].date);
    ctx.font = "10px -apple-system, sans-serif";
    ctx.fillStyle = "#64748b";
    ctx.textBaseline = "top";
    ctx.fillText(d.toLocaleDateString("en-US", { month: "short", year: "2-digit" }), points[i].x, padT + chartH + 6);

    // Dealer name
    ctx.font = "9px -apple-system, sans-serif";
    ctx.fillStyle = "#475569";
    ctx.fillText(entries[i].dealer, points[i].x, padT + chartH + 20);
  }
}

// ── Canvas: Depreciation Area Chart ──────────────────────────────────────────

function drawDepreciationChart(canvas: HTMLCanvasElement, points: DepreciationPoint[], currentAge: number) {
  if (points.length < 2) return;

  const dpr = window.devicePixelRatio || 1;
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  const ctx = canvas.getContext("2d")!;
  ctx.scale(dpr, dpr);

  const padL = 70, padR = 20, padT = 20, padB = 40;
  const chartW = w - padL - padR;
  const chartH = h - padT - padB;

  const values = points.map(p => p.value);
  const maxV = Math.max(...values) * 1.05;
  const minV = Math.min(...values) * 0.9;
  const vRange = maxV - minV || 1;
  const maxAge = Math.max(...points.map(p => p.ageMonths));

  // Y-axis grid
  for (let i = 0; i <= 4; i++) {
    const y = padT + (i / 4) * chartH;
    ctx.beginPath();
    ctx.moveTo(padL, y);
    ctx.lineTo(padL + chartW, y);
    ctx.strokeStyle = "#1e293b";
    ctx.lineWidth = 1;
    ctx.stroke();

    const val = maxV - (i / 4) * vRange;
    ctx.font = "11px -apple-system, sans-serif";
    ctx.fillStyle = "#64748b";
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    ctx.fillText(fmtCurrency(val), padL - 8, y);
  }

  // Separate actual vs projected
  const actualPts: { x: number; y: number }[] = [];
  const projectedPts: { x: number; y: number }[] = [];
  let lastActualPt: { x: number; y: number } | null = null;

  for (const p of points) {
    const x = padL + (p.ageMonths / maxAge) * chartW;
    const y = padT + ((maxV - p.value) / vRange) * chartH;
    if (p.ageMonths <= currentAge) {
      actualPts.push({ x, y });
      lastActualPt = { x, y };
    } else {
      if (projectedPts.length === 0 && lastActualPt) {
        projectedPts.push(lastActualPt);
      }
      projectedPts.push({ x, y });
    }
  }

  // Fill area under actual line
  if (actualPts.length >= 2) {
    ctx.beginPath();
    for (let i = 0; i < actualPts.length; i++) {
      if (i === 0) ctx.moveTo(actualPts[i].x, actualPts[i].y);
      else ctx.lineTo(actualPts[i].x, actualPts[i].y);
    }
    ctx.lineTo(actualPts[actualPts.length - 1].x, padT + chartH);
    ctx.lineTo(actualPts[0].x, padT + chartH);
    ctx.closePath();
    const grad = ctx.createLinearGradient(0, padT, 0, padT + chartH);
    grad.addColorStop(0, "#3b82f630");
    grad.addColorStop(1, "#3b82f605");
    ctx.fillStyle = grad;
    ctx.fill();

    // Actual line
    ctx.beginPath();
    for (let i = 0; i < actualPts.length; i++) {
      if (i === 0) ctx.moveTo(actualPts[i].x, actualPts[i].y);
      else ctx.lineTo(actualPts[i].x, actualPts[i].y);
    }
    ctx.strokeStyle = "#3b82f6";
    ctx.lineWidth = 2.5;
    ctx.stroke();
  }

  // Projected dashed line
  if (projectedPts.length >= 2) {
    ctx.beginPath();
    ctx.setLineDash([6, 4]);
    for (let i = 0; i < projectedPts.length; i++) {
      if (i === 0) ctx.moveTo(projectedPts[i].x, projectedPts[i].y);
      else ctx.lineTo(projectedPts[i].x, projectedPts[i].y);
    }
    ctx.strokeStyle = "#64748b";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.setLineDash([]);

    // Projected fill
    ctx.beginPath();
    for (let i = 0; i < projectedPts.length; i++) {
      if (i === 0) ctx.moveTo(projectedPts[i].x, projectedPts[i].y);
      else ctx.lineTo(projectedPts[i].x, projectedPts[i].y);
    }
    ctx.lineTo(projectedPts[projectedPts.length - 1].x, padT + chartH);
    ctx.lineTo(projectedPts[0].x, padT + chartH);
    ctx.closePath();
    const grad2 = ctx.createLinearGradient(0, padT, 0, padT + chartH);
    grad2.addColorStop(0, "#64748b18");
    grad2.addColorStop(1, "#64748b02");
    ctx.fillStyle = grad2;
    ctx.fill();
  }

  // Data points
  const allPts = [...actualPts, ...projectedPts.slice(actualPts.length > 0 ? 1 : 0)];
  const allData = points;
  for (let i = 0; i < allData.length; i++) {
    const x = padL + (allData[i].ageMonths / maxAge) * chartW;
    const y = padT + ((maxV - allData[i].value) / vRange) * chartH;
    const isProjected = allData[i].ageMonths > currentAge;

    ctx.beginPath();
    ctx.arc(x, y, 4, 0, 2 * Math.PI);
    ctx.fillStyle = isProjected ? "#64748b" : "#3b82f6";
    ctx.fill();
    ctx.strokeStyle = "#0f172a";
    ctx.lineWidth = 2;
    ctx.stroke();

    // X-axis label
    ctx.font = "10px -apple-system, sans-serif";
    ctx.fillStyle = "#64748b";
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.fillText(allData[i].label, x, padT + chartH + 6);
  }
}

// ── Canvas: Market Trend Sparkline ──────────────────────────────────────────

function drawSparkline(canvas: HTMLCanvasElement, direction: "up" | "down" | "stable") {
  const dpr = window.devicePixelRatio || 1;
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  const ctx = canvas.getContext("2d")!;
  ctx.scale(dpr, dpr);

  const points: number[] = direction === "down"
    ? [0.7, 0.72, 0.68, 0.65, 0.58, 0.52, 0.48, 0.42, 0.38, 0.35]
    : direction === "up"
    ? [0.35, 0.38, 0.42, 0.48, 0.52, 0.58, 0.65, 0.68, 0.72, 0.7]
    : [0.5, 0.52, 0.48, 0.51, 0.49, 0.52, 0.5, 0.48, 0.51, 0.5];

  const color = direction === "down" ? "#ef4444" : direction === "up" ? "#10b981" : "#f59e0b";

  ctx.beginPath();
  for (let i = 0; i < points.length; i++) {
    const x = (i / (points.length - 1)) * w;
    const y = (1 - points[i]) * h;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.stroke();

  // Gradient fill
  ctx.lineTo(w, h);
  ctx.lineTo(0, h);
  ctx.closePath();
  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, color + "33");
  grad.addColorStop(1, color + "00");
  ctx.fillStyle = grad;
  ctx.fill();
}

// ── Main App ───────────────────────────────────────────────────────────────────

async function main() {
  const appMode = _detectAppMode();
  let serverAvailable = appMode !== "demo";
  if (appMode === "mcp") {
    try { (_safeApp as any)?.connect?.(); } catch { serverAvailable = false; }
  }

  const compact = isCompactMode();
  const urlParams = _getUrlParams();

  document.body.style.cssText = compact
    ? "margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:transparent;color:#e2e8f0;overflow-x:hidden;"
    : "margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#0f172a;color:#e2e8f0;overflow-x:hidden;";

  const container = document.createElement("div");
  container.style.cssText = compact
    ? "max-width:400px;margin:0 auto;padding:8px;"
    : "max-width:1200px;margin:0 auto;padding:16px 20px;";
  document.body.appendChild(container);

  if (!compact) {
    // Header
    const header = document.createElement("div");
    header.style.cssText = "background:#1e293b;padding:16px 20px;border-radius:10px;margin-bottom:16px;border:1px solid #334155;display:flex;align-items:center;";
    header.innerHTML = `<div><h1 style="margin:0 0 4px 0;font-size:20px;font-weight:700;color:#f8fafc;">VIN Market Report</h1>
      <p style="margin:0;font-size:13px;color:#94a3b8;">Complete vehicle market intelligence report</p></div>`;
    _addSettingsBar(header);
    container.appendChild(header);

    // Input Area
    const inputArea = document.createElement("div");
    inputArea.style.cssText = "background:#1e293b;padding:16px 20px;border-radius:10px;margin-bottom:16px;border:1px solid #334155;display:flex;gap:12px;flex-wrap:wrap;align-items:flex-end;";

    function makeField(label: string, placeholder: string, opts?: { width?: string; type?: string; value?: string }): HTMLInputElement {
      const wrap = document.createElement("div");
      wrap.style.cssText = "display:flex;flex-direction:column;gap:4px;";
      wrap.innerHTML = `<label style="font-size:11px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px;">${label}</label>`;
      const input = document.createElement("input");
      input.type = opts?.type ?? "text";
      input.placeholder = placeholder;
      if (opts?.value) input.value = opts.value;
      input.style.cssText = `padding:10px 14px;border-radius:6px;border:1px solid #334155;background:#0f172a;color:#e2e8f0;font-size:14px;outline:none;width:${opts?.width ?? "180px"};`;
      input.addEventListener("focus", () => { input.style.borderColor = "#3b82f6"; });
      input.addEventListener("blur", () => { input.style.borderColor = "#334155"; });
      wrap.appendChild(input);
      inputArea.appendChild(wrap);
      return input;
    }

    const vinInput = makeField("VIN", "Enter 17-character VIN", { width: "240px", value: urlParams.vin || "KNDCB3LC9L5359658" });
    const priceInput = makeField("Asking Price", "$0", { width: "140px", type: "number", value: urlParams.price || "" });
    const milesInput = makeField("Mileage", "e.g. 35000", { width: "140px", type: "number", value: urlParams.miles || "" });
    const zipInput = makeField("ZIP Code", "e.g. 80202", { width: "120px", value: urlParams.zip || "" });

    const genBtn = document.createElement("button");
    genBtn.textContent = "Generate Report";
    genBtn.style.cssText = "padding:10px 28px;border-radius:6px;font-size:14px;font-weight:700;cursor:pointer;border:none;background:#3b82f6;color:#fff;height:42px;align-self:flex-end;transition:background 0.15s;";
    genBtn.addEventListener("mouseenter", () => { genBtn.style.background = "#2563eb"; });
    genBtn.addEventListener("mouseleave", () => { genBtn.style.background = "#3b82f6"; });
    inputArea.appendChild(genBtn);
    container.appendChild(inputArea);

    const results = document.createElement("div");
    results.id = "results";
    container.appendChild(results);

    genBtn.addEventListener("click", () => runReport(vinInput.value.trim(), priceInput.value, milesInput.value, zipInput.value, results, genBtn));

    // Auto-run if URL params provided
    if (urlParams.vin) {
      runReport(urlParams.vin, urlParams.price || "", urlParams.miles || "", urlParams.zip || "", results, genBtn);
    }
  } else {
    // Compact mode: auto-run immediately
    const results = document.createElement("div");
    results.id = "results";
    container.appendChild(results);
    if (urlParams.vin) {
      runCompactReport(urlParams.vin, urlParams.price || "", urlParams.miles || "", urlParams.zip || "", results);
    } else {
      runCompactReport("KNDCB3LC9L5359658", "28500", "34200", "80202", results);
    }
  }

  async function runReport(vin: string, price: string, miles: string, zip: string, results: HTMLElement, btn: HTMLButtonElement) {
    if (!vin) { alert("Please enter a VIN."); return; }

    btn.disabled = true;
    btn.textContent = "Generating...";
    btn.style.opacity = "0.7";
    results.innerHTML = `<div style="display:flex;align-items:center;justify-content:center;padding:60px;color:#94a3b8;">
      <div style="width:24px;height:24px;border:3px solid #334155;border-top-color:#3b82f6;border-radius:50%;animation:spin 0.8s linear infinite;margin-right:14px;"></div>
      <style>@keyframes spin{to{transform:rotate(360deg)}}</style>
      Generating market report for ${vin}...
    </div>`;

    let data: CarStoryData;
    try {
      if (serverAvailable) {
        const args: Record<string, unknown> = { vin };
        if (price) args.askingPrice = Number(price);
        if (miles) args.miles = Number(miles);
        if (zip) args.zip = zip;
        const response = await _callTool("generate-vin-market-report", args);
        if (!response) throw new Error("API unavailable");
        const textContent = response.content.find((c: any) => c.type === "text");
        data = JSON.parse(textContent?.text ?? "{}");
      } else {
        await new Promise(r => setTimeout(r, 800));
        data = getMockData(vin, price ? Number(price) : undefined, miles ? Number(miles) : undefined, zip);
      }
      renderFullReport(data, results);
    } catch (err: any) {
      console.warn("Report generation failed, using demo data:", err?.message ?? err);
      await new Promise(r => setTimeout(r, 400));
      data = getMockData(vin, price ? Number(price) : undefined, miles ? Number(miles) : undefined, zip);
      renderFullReport(data, results);
    }

    btn.disabled = false;
    btn.textContent = "Generate Report";
    btn.style.opacity = "1";
  }

  async function runCompactReport(vin: string, price: string, miles: string, zip: string, results: HTMLElement) {
    results.innerHTML = `<div style="display:flex;align-items:center;justify-content:center;padding:30px;color:#94a3b8;">
      <div style="width:20px;height:20px;border:2px solid #334155;border-top-color:#3b82f6;border-radius:50%;animation:spin 0.8s linear infinite;margin-right:10px;"></div>
      <style>@keyframes spin{to{transform:rotate(360deg)}}</style>
      Loading...
    </div>`;

    let data: CarStoryData;
    try {
      if (serverAvailable) {
        const args: Record<string, unknown> = { vin };
        if (price) args.askingPrice = Number(price);
        if (miles) args.miles = Number(miles);
        if (zip) args.zip = zip;
        const response = await _callTool("generate-vin-market-report", args);
        if (!response) throw new Error("API unavailable");
        const textContent = response.content.find((c: any) => c.type === "text");
        data = JSON.parse(textContent?.text ?? "{}");
      } else {
        await new Promise(r => setTimeout(r, 500));
        data = getMockData(vin, price ? Number(price) : undefined, miles ? Number(miles) : undefined, zip);
      }
      renderCompactReport(data, results);
    } catch {
      data = getMockData(vin, price ? Number(price) : undefined, miles ? Number(miles) : undefined, zip);
      renderCompactReport(data, results);
    }
  }

  // ── Full Report Render ────────────────────────────────────────────────────

  function renderFullReport(data: CarStoryData, results: HTMLElement) {
    results.innerHTML = "";

    const fmv = data.pricePrediction.franchisePrice;
    const diff = data.askingPrice - fmv;
    const dealColor = getDealColor(data.dealScore);
    const dealBg = getDealBg(data.dealScore);

    // ── Section 1: Vehicle Identity Card ──
    const idCard = document.createElement("div");
    idCard.style.cssText = "background:#1e293b;border:1px solid #334155;border-radius:10px;padding:20px;margin-bottom:16px;";
    const titleYMM = `${data.vehicle.year} ${data.vehicle.make} ${data.vehicle.model} ${data.vehicle.trim}`;
    idCard.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:12px;">
        <div>
          <h2 style="margin:0;font-size:22px;font-weight:800;color:#f8fafc;">${titleYMM}</h2>
          <div style="font-size:12px;color:#64748b;margin-top:4px;font-family:monospace;">VIN: ${data.vehicle.vin}</div>
        </div>
        <div style="display:flex;gap:20px;flex-wrap:wrap;">
          <div style="text-align:center;"><div style="font-size:10px;color:#94a3b8;text-transform:uppercase;">Asking</div><div style="font-size:22px;font-weight:800;color:#f8fafc;">${fmtCurrency(data.askingPrice)}</div></div>
          <div style="text-align:center;"><div style="font-size:10px;color:#94a3b8;text-transform:uppercase;">FMV</div><div style="font-size:22px;font-weight:800;color:#3b82f6;">${fmtCurrency(fmv)}</div></div>
          <div style="text-align:center;"><div style="font-size:10px;color:#94a3b8;text-transform:uppercase;">Diff</div><div style="font-size:22px;font-weight:800;color:${diff >= 0 ? '#ef4444' : '#10b981'};">${diff >= 0 ? '+' : ''}${fmtCurrency(diff)}</div></div>
        </div>
      </div>
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-top:16px;">
        ${[
          ["Body", data.vehicle.bodyType],
          ["Engine", data.vehicle.engine],
          ["Transmission", data.vehicle.transmission],
          ["Drivetrain", data.vehicle.drivetrain],
          ["Fuel", data.vehicle.fuelType],
          ["Mileage", fmtNumber(data.miles) + " mi"],
          ["MSRP (new)", fmtCurrency(data.vehicle.msrp)],
          ["Ext. Color", data.vehicle.exteriorColor],
        ].map(([k, v]) => `<div style="background:#0f172a;border-radius:6px;padding:8px 10px;"><div style="font-size:10px;color:#64748b;text-transform:uppercase;">${k}</div><div style="font-size:12px;color:#e2e8f0;font-weight:600;margin-top:2px;">${v}</div></div>`).join("")}
      </div>
    `;
    results.appendChild(idCard);

    // ── Section 2: Deal Score Gauge ──
    const gaugeSection = document.createElement("div");
    gaugeSection.style.cssText = `background:${dealBg};border:2px solid ${dealColor}44;border-radius:12px;padding:20px;margin-bottom:16px;text-align:center;`;
    gaugeSection.innerHTML = `<h3 style="font-size:14px;color:#94a3b8;margin:0 0 8px 0;text-transform:uppercase;letter-spacing:0.5px;">Deal Score</h3>`;

    const gaugeCanvas = document.createElement("canvas");
    gaugeCanvas.style.cssText = "width:100%;max-width:460px;height:200px;";
    gaugeSection.appendChild(gaugeCanvas);

    const gaugeLegend = document.createElement("div");
    gaugeLegend.style.cssText = "display:flex;justify-content:center;gap:16px;margin-top:8px;flex-wrap:wrap;";
    gaugeLegend.innerHTML = `
      <span style="font-size:11px;color:#94a3b8;display:flex;align-items:center;gap:4px;"><span style="width:10px;height:10px;background:#f8fafc;border-radius:50%;display:inline-block;"></span> Score Needle</span>
      <span style="font-size:11px;color:#94a3b8;display:flex;align-items:center;gap:4px;"><span style="width:0;height:0;border-left:5px solid transparent;border-right:5px solid transparent;border-bottom:10px solid #3b82f6;display:inline-block;"></span> Fair Market Value</span>
    `;
    gaugeSection.appendChild(gaugeLegend);
    results.appendChild(gaugeSection);

    requestAnimationFrame(() => {
      drawDealGauge(gaugeCanvas, {
        score: data.dealScore,
        label: data.dealLabel,
        askingPrice: data.askingPrice,
        fmv,
        minPrice: data.marketPosition.minPrice,
        maxPrice: data.marketPosition.maxPrice,
      });
    });

    // ── Section 3: Market Position ──
    const mktSection = document.createElement("div");
    mktSection.style.cssText = "background:#1e293b;border:1px solid #334155;border-radius:10px;padding:20px;margin-bottom:16px;";

    const kpiRibbon = `<div style="display:flex;gap:16px;flex-wrap:wrap;margin-bottom:16px;">
      ${[
        ["Similar Cars", String(data.marketPosition.totalActive)],
        ["Median Price", fmtCurrency(data.marketPosition.medianPrice)],
        ["Avg DOM", data.marketPosition.avgDom + " days"],
        ["Avg Miles", fmtNumber(data.marketPosition.avgMiles) + " mi"],
      ].map(([k, v]) => `<div style="flex:1;min-width:100px;background:#0f172a;border-radius:8px;padding:12px;text-align:center;"><div style="font-size:10px;color:#64748b;text-transform:uppercase;">${k}</div><div style="font-size:18px;font-weight:700;color:#f8fafc;margin-top:4px;">${v}</div></div>`).join("")}
    </div>`;

    const pctile = data.marketPosition.percentile;
    const pctColor = pctile <= 30 ? "#10b981" : pctile <= 60 ? "#f59e0b" : "#ef4444";
    const rangeBar = `
      <div style="margin-top:8px;">
        <div style="display:flex;justify-content:space-between;font-size:11px;color:#64748b;margin-bottom:4px;">
          <span>${fmtCurrency(data.marketPosition.minPrice)}</span>
          <span>Market Range</span>
          <span>${fmtCurrency(data.marketPosition.maxPrice)}</span>
        </div>
        <div style="position:relative;height:28px;background:#0f172a;border-radius:6px;overflow:hidden;border:1px solid #334155;">
          <div style="position:absolute;left:0;top:0;height:100%;width:${pctile}%;background:linear-gradient(90deg,#10b98125,${pctColor}35);border-radius:6px 0 0 6px;"></div>
          <div style="position:absolute;left:${pctile}%;top:0;height:100%;width:3px;background:${pctColor};border-radius:1px;transform:translateX(-1.5px);" title="This Car: ${Math.round(pctile)}th percentile"></div>
          <div style="position:absolute;left:${pctile}%;top:-16px;transform:translateX(-50%);font-size:10px;font-weight:700;color:${pctColor};">${Math.round(pctile)}%ile</div>
        </div>
        <div style="font-size:11px;color:#94a3b8;margin-top:6px;text-align:center;">This vehicle is priced higher than ${Math.round(pctile)}% of similar cars in the market</div>
      </div>
    `;

    mktSection.innerHTML = `<h3 style="font-size:13px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px;margin:0 0 12px 0;">Market Position</h3>${kpiRibbon}${rangeBar}`;
    results.appendChild(mktSection);

    // ── Section 4: Price Prediction ──
    const predSection = document.createElement("div");
    predSection.style.cssText = "background:#1e293b;border:1px solid #334155;border-radius:10px;padding:20px;margin-bottom:16px;";

    const confLow = data.pricePrediction.confidenceLow;
    const confHigh = data.pricePrediction.confidenceHigh;
    const confRange = confHigh - confLow || 1;
    const fmvInConf = ((fmv - confLow) / confRange) * 100;
    const askInConf = Math.max(0, Math.min(100, ((data.askingPrice - confLow) / confRange) * 100));

    predSection.innerHTML = `
      <h3 style="font-size:13px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px;margin:0 0 16px 0;">ML Price Prediction</h3>
      <div style="display:flex;gap:20px;flex-wrap:wrap;margin-bottom:16px;">
        <div style="flex:1;min-width:150px;background:#0f172a;border-radius:8px;padding:16px;text-align:center;border:1px solid #334155;">
          <div style="font-size:10px;color:#64748b;text-transform:uppercase;">Franchise Dealer FMV</div>
          <div style="font-size:24px;font-weight:800;color:#3b82f6;margin-top:4px;">${fmtCurrency(data.pricePrediction.franchisePrice)}</div>
        </div>
        <div style="flex:1;min-width:150px;background:#0f172a;border-radius:8px;padding:16px;text-align:center;border:1px solid #334155;">
          <div style="font-size:10px;color:#64748b;text-transform:uppercase;">Independent Dealer FMV</div>
          <div style="font-size:24px;font-weight:800;color:#8b5cf6;margin-top:4px;">${fmtCurrency(data.pricePrediction.independentPrice)}</div>
        </div>
      </div>
      <div style="font-size:11px;color:#64748b;margin-bottom:4px;">Confidence Range</div>
      <div style="position:relative;height:32px;background:#0f172a;border-radius:6px;border:1px solid #334155;overflow:visible;">
        <div style="position:absolute;left:5%;top:8px;height:16px;width:90%;background:linear-gradient(90deg,#3b82f622,#3b82f644,#3b82f622);border-radius:4px;"></div>
        <div style="position:absolute;left:calc(5% + ${fmvInConf * 0.9}%);top:4px;height:24px;width:3px;background:#3b82f6;border-radius:1px;transform:translateX(-1.5px);"></div>
        <div style="position:absolute;left:calc(5% + ${askInConf * 0.9}%);top:4px;height:24px;width:3px;background:#f59e0b;border-radius:1px;transform:translateX(-1.5px);"></div>
      </div>
      <div style="display:flex;justify-content:space-between;font-size:10px;color:#64748b;margin-top:4px;">
        <span>${fmtCurrency(confLow)}</span>
        <span>${fmtCurrency(confHigh)}</span>
      </div>
      <div style="display:flex;justify-content:center;gap:16px;margin-top:8px;">
        <span style="font-size:10px;color:#3b82f6;display:flex;align-items:center;gap:4px;"><span style="width:10px;height:3px;background:#3b82f6;display:inline-block;"></span> FMV</span>
        <span style="font-size:10px;color:#f59e0b;display:flex;align-items:center;gap:4px;"><span style="width:10px;height:3px;background:#f59e0b;display:inline-block;"></span> Asking</span>
      </div>
    `;
    results.appendChild(predSection);

    // ── Section 5: Active Comparables (horizontal scroll cards) ──
    if (data.comparables.length > 0) {
      const compSection = document.createElement("div");
      compSection.style.cssText = "margin-bottom:16px;";
      compSection.innerHTML = `<h3 style="font-size:14px;font-weight:600;color:#f8fafc;margin:0 0 12px 0;">Active Comparables Nearby</h3>`;

      const scrollRow = document.createElement("div");
      scrollRow.style.cssText = "display:flex;gap:12px;overflow-x:auto;padding-bottom:12px;scrollbar-width:thin;";

      for (const c of data.comparables) {
        const isCheaper = c.price < fmv;
        const card = document.createElement("div");
        card.style.cssText = "min-width:210px;max-width:230px;background:#1e293b;border:1px solid #334155;border-radius:10px;padding:14px;flex-shrink:0;cursor:pointer;transition:border-color 0.15s,transform 0.15s;";
        card.addEventListener("mouseenter", () => { card.style.borderColor = "#3b82f6"; card.style.transform = "translateY(-2px)"; });
        card.addEventListener("mouseleave", () => { card.style.borderColor = "#334155"; card.style.transform = "none"; });

        const badge = isCheaper
          ? `<span style="display:inline-block;padding:2px 8px;border-radius:4px;font-size:10px;font-weight:600;background:#10b98122;color:#10b981;border:1px solid #10b98144;margin-top:6px;">Below FMV</span>`
          : "";

        card.innerHTML = `
          <div style="font-size:13px;font-weight:700;color:#f8fafc;">${c.year} ${c.make} ${c.model}</div>
          <div style="font-size:11px;color:#94a3b8;margin-top:2px;">${c.trim}</div>
          <div style="font-size:20px;font-weight:800;color:#f8fafc;margin-top:8px;">${fmtCurrency(c.price)}</div>
          <div style="font-size:11px;color:#94a3b8;margin-top:4px;">${fmtNumber(c.miles)} mi</div>
          <div style="font-size:11px;color:#94a3b8;">${c.city}, ${c.state} (${c.distance} mi)</div>
          <div style="font-size:10px;color:#64748b;margin-top:2px;">${c.dealerName}</div>
          <div style="font-size:10px;color:#64748b;">${c.dom} days on market</div>
          ${badge}
        `;

        if (c.vdpUrl && c.vdpUrl !== "#") {
          card.addEventListener("click", () => window.open(c.vdpUrl, "_blank"));
        }
        scrollRow.appendChild(card);
      }

      compSection.appendChild(scrollRow);
      results.appendChild(compSection);
    }

    // ── Section 6: Recently Sold ──
    if (data.soldComps.length > 0) {
      const soldSection = document.createElement("div");
      soldSection.style.cssText = "background:#1e293b;border:1px solid #334155;border-radius:10px;padding:16px 20px;margin-bottom:16px;";
      soldSection.innerHTML = `<h3 style="font-size:13px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px;margin:0 0 12px 0;">Recently Sold Comparables</h3>`;

      const tableWrap = document.createElement("div");
      tableWrap.style.cssText = "overflow-x:auto;";
      const table = document.createElement("table");
      table.style.cssText = "width:100%;border-collapse:collapse;font-size:13px;";
      table.innerHTML = `
        <thead>
          <tr>
            <th style="padding:8px 10px;text-align:left;color:#94a3b8;font-size:11px;text-transform:uppercase;border-bottom:1px solid #334155;">Vehicle</th>
            <th style="padding:8px 10px;text-align:right;color:#94a3b8;font-size:11px;text-transform:uppercase;border-bottom:1px solid #334155;">Sold Price</th>
            <th style="padding:8px 10px;text-align:right;color:#94a3b8;font-size:11px;text-transform:uppercase;border-bottom:1px solid #334155;">Miles</th>
            <th style="padding:8px 10px;text-align:left;color:#94a3b8;font-size:11px;text-transform:uppercase;border-bottom:1px solid #334155;">Sold Date</th>
            <th style="padding:8px 10px;text-align:left;color:#94a3b8;font-size:11px;text-transform:uppercase;border-bottom:1px solid #334155;">Dealer</th>
          </tr>
        </thead>
        <tbody>
          ${data.soldComps.map(s => `
            <tr style="border-bottom:1px solid #1e293b;">
              <td style="padding:8px 10px;color:#e2e8f0;font-weight:600;">${s.year} ${s.make} ${s.model} ${s.trim}</td>
              <td style="padding:8px 10px;text-align:right;color:#e2e8f0;font-weight:600;">${fmtCurrency(s.soldPrice)}</td>
              <td style="padding:8px 10px;text-align:right;color:#94a3b8;">${fmtNumber(s.miles)} mi</td>
              <td style="padding:8px 10px;color:#94a3b8;">${s.soldDate && !isNaN(new Date(s.soldDate).getTime()) ? new Date(s.soldDate).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "—"}</td>
              <td style="padding:8px 10px;color:#64748b;">${s.dealerName}, ${s.city}, ${s.state}</td>
            </tr>
          `).join("")}
        </tbody>
      `;
      tableWrap.appendChild(table);
      soldSection.appendChild(tableWrap);
      results.appendChild(soldSection);
    }

    // ── Section 7: Price History Timeline (Canvas) ──
    if (data.priceHistory.length >= 2) {
      const histSection = document.createElement("div");
      histSection.style.cssText = "background:#1e293b;border:1px solid #334155;border-radius:10px;padding:20px;margin-bottom:16px;";
      histSection.innerHTML = `<h3 style="font-size:13px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px;margin:0 0 4px 0;">Price History Timeline</h3>
        <p style="font-size:11px;color:#64748b;margin:0 0 12px 0;">How this VIN's price has changed across dealers over time</p>`;

      const histCanvas = document.createElement("canvas");
      histCanvas.style.cssText = "width:100%;height:240px;";
      histSection.appendChild(histCanvas);
      results.appendChild(histSection);

      requestAnimationFrame(() => {
        drawPriceHistoryChart(histCanvas, data.priceHistory);
      });
    }

    // ── Section 8: Depreciation Story (Canvas area chart) ──
    if (data.depreciation.length >= 2) {
      const depSection = document.createElement("div");
      depSection.style.cssText = "background:#1e293b;border:1px solid #334155;border-radius:10px;padding:20px;margin-bottom:16px;";

      const totalDep = data.vehicle.msrp - data.askingPrice;
      const depPct = data.vehicle.msrp > 0 ? ((totalDep / data.vehicle.msrp) * 100).toFixed(1) : "0";

      depSection.innerHTML = `<h3 style="font-size:13px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px;margin:0 0 4px 0;">Depreciation Story</h3>
        <p style="font-size:11px;color:#64748b;margin:0 0 4px 0;">From ${fmtCurrency(data.vehicle.msrp)} MSRP to ${fmtCurrency(data.askingPrice)} today: ${depPct}% total depreciation</p>
        <div style="display:flex;gap:12px;margin:12px 0;flex-wrap:wrap;">
          <div style="background:#0f172a;border-radius:6px;padding:8px 14px;"><span style="font-size:10px;color:#64748b;">MSRP</span><div style="font-size:14px;font-weight:700;color:#e2e8f0;">${fmtCurrency(data.vehicle.msrp)}</div></div>
          <div style="background:#0f172a;border-radius:6px;padding:8px 14px;"><span style="font-size:10px;color:#64748b;">Current Ask</span><div style="font-size:14px;font-weight:700;color:#f59e0b;">${fmtCurrency(data.askingPrice)}</div></div>
          <div style="background:#0f172a;border-radius:6px;padding:8px 14px;"><span style="font-size:10px;color:#64748b;">Total Loss</span><div style="font-size:14px;font-weight:700;color:#ef4444;">-${fmtCurrency(totalDep)}</div></div>
          <div style="background:#0f172a;border-radius:6px;padding:8px 14px;"><span style="font-size:10px;color:#64748b;">1-Year Proj.</span><div style="font-size:14px;font-weight:700;color:#64748b;">${fmtCurrency(data.depreciation[data.depreciation.length - 2]?.value ?? 0)}</div></div>
        </div>`;

      const depCanvas = document.createElement("canvas");
      depCanvas.style.cssText = "width:100%;height:220px;";
      depSection.appendChild(depCanvas);

      // Legend
      const depLegend = document.createElement("div");
      depLegend.style.cssText = "display:flex;justify-content:center;gap:16px;margin-top:8px;";
      depLegend.innerHTML = `
        <span style="font-size:10px;color:#3b82f6;display:flex;align-items:center;gap:4px;"><span style="width:16px;height:2px;background:#3b82f6;display:inline-block;"></span> Actual</span>
        <span style="font-size:10px;color:#64748b;display:flex;align-items:center;gap:4px;"><span style="width:16px;height:2px;background:#64748b;display:inline-block;border-top:1px dashed #64748b;"></span> Projected</span>
      `;
      depSection.appendChild(depLegend);
      results.appendChild(depSection);

      const currentAgeMonths = (new Date().getFullYear() - data.vehicle.year) * 12;
      requestAnimationFrame(() => {
        drawDepreciationChart(depCanvas, data.depreciation, currentAgeMonths);
      });
    }

    // ── Section 9: Market Trends ──
    const trendSection = document.createElement("div");
    trendSection.style.cssText = "background:#1e293b;border:1px solid #334155;border-radius:10px;padding:20px;margin-bottom:16px;";

    const trendDir = data.marketTrend.direction;
    const trendColor = trendDir === "down" ? "#ef4444" : trendDir === "up" ? "#10b981" : "#f59e0b";
    const trendIcon = trendDir === "down" ? "&#x25BC;" : trendDir === "up" ? "&#x25B2;" : "&#x25CF;";
    const trendLabel = trendDir === "down" ? "Prices Declining" : trendDir === "up" ? "Prices Rising" : "Prices Stable";

    trendSection.innerHTML = `
      <h3 style="font-size:13px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px;margin:0 0 16px 0;">Market Trends (30-Day)</h3>
      <div style="display:flex;gap:20px;align-items:center;flex-wrap:wrap;">
        <div style="display:flex;align-items:center;gap:10px;">
          <div style="width:48px;height:48px;border-radius:50%;background:${trendColor}22;display:flex;align-items:center;justify-content:center;font-size:20px;color:${trendColor};">${trendIcon}</div>
          <div>
            <div style="font-size:15px;font-weight:700;color:${trendColor};">${trendLabel}</div>
            <div style="font-size:12px;color:#94a3b8;">${fmtPct(data.marketTrend.pctChange30d)} in 30 days</div>
          </div>
        </div>
        <div id="sparkline-wrap" style="flex:1;min-width:120px;max-width:200px;height:50px;"></div>
        <div style="display:flex;gap:16px;">
          <div style="text-align:center;"><div style="font-size:10px;color:#64748b;">Avg DOM</div><div style="font-size:16px;font-weight:700;color:#e2e8f0;">${data.marketTrend.avgDom}d</div></div>
          <div style="text-align:center;"><div style="font-size:10px;color:#64748b;">Inventory</div><div style="font-size:16px;font-weight:700;color:${data.marketTrend.inventoryChange >= 0 ? '#10b981' : '#ef4444'};">${fmtPct(data.marketTrend.inventoryChange)}</div></div>
        </div>
      </div>
    `;
    results.appendChild(trendSection);

    requestAnimationFrame(() => {
      const sparkWrap = document.getElementById("sparkline-wrap");
      if (sparkWrap) {
        const sparkCanvas = document.createElement("canvas");
        sparkCanvas.style.cssText = "width:100%;height:100%;";
        sparkWrap.appendChild(sparkCanvas);
        requestAnimationFrame(() => {
          drawSparkline(sparkCanvas, data.marketTrend.direction);
        });
      }
    });

    // ── Section 10: OEM Incentives (conditional) ──
    if (data.incentives.length > 0) {
      const incSection = document.createElement("div");
      incSection.style.cssText = "background:#1e293b;border:1px solid #334155;border-radius:10px;padding:20px;margin-bottom:16px;";
      incSection.innerHTML = `<h3 style="font-size:13px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px;margin:0 0 12px 0;">OEM Incentives</h3>`;

      for (const inc of data.incentives) {
        const incCard = document.createElement("div");
        incCard.style.cssText = "background:#0f172a;border:1px solid #334155;border-radius:8px;padding:14px;margin-bottom:8px;";
        incCard.innerHTML = `
          <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;">
            <div>
              <div style="font-size:13px;font-weight:600;color:#e2e8f0;">${inc.title}</div>
              <div style="font-size:11px;color:#94a3b8;margin-top:2px;">${inc.type} | Expires ${new Date(inc.endDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</div>
            </div>
            <div style="font-size:18px;font-weight:800;color:#10b981;">${fmtCurrency(inc.amount)}</div>
          </div>
          <div style="font-size:11px;color:#64748b;margin-top:6px;">${inc.description}</div>
        `;
        incSection.appendChild(incCard);
      }
      results.appendChild(incSection);
    }

    // ── Powered By Footer ──
    const footer = document.createElement("div");
    footer.style.cssText = "text-align:center;padding:16px;font-size:11px;color:#475569;";
    footer.innerHTML = `Report generated ${new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })} | Powered by <span style="color:#3b82f6;font-weight:600;">MarketCheck</span>`;
    results.appendChild(footer);
  }

  // ── Compact Report Render ────────────────────────────────────────────────

  function renderCompactReport(data: CarStoryData, results: HTMLElement) {
    results.innerHTML = "";

    const fmv = data.pricePrediction.franchisePrice;
    const dealColor = getDealColor(data.dealScore);
    const titleYMM = `${data.vehicle.year} ${data.vehicle.make} ${data.vehicle.model} ${data.vehicle.trim}`;

    // Vehicle title
    const titleEl = document.createElement("div");
    titleEl.style.cssText = "margin-bottom:8px;";
    titleEl.innerHTML = `<div style="font-size:14px;font-weight:700;color:#f8fafc;">${titleYMM}</div><div style="font-size:11px;color:#64748b;font-family:monospace;">${data.vehicle.vin}</div>`;
    results.appendChild(titleEl);

    // Mini gauge (Section 2)
    const gaugeWrap = document.createElement("div");
    gaugeWrap.style.cssText = "text-align:center;margin-bottom:8px;";
    const miniGauge = document.createElement("canvas");
    miniGauge.style.cssText = "width:100%;max-width:300px;height:140px;";
    gaugeWrap.appendChild(miniGauge);
    results.appendChild(gaugeWrap);

    requestAnimationFrame(() => {
      drawDealGauge(miniGauge, {
        score: data.dealScore,
        label: data.dealLabel,
        askingPrice: data.askingPrice,
        fmv,
        minPrice: data.marketPosition.minPrice,
        maxPrice: data.marketPosition.maxPrice,
      }, true);
    });

    // Mini range bar (Section 3)
    const pctile = data.marketPosition.percentile;
    const pctColor = pctile <= 30 ? "#10b981" : pctile <= 60 ? "#f59e0b" : "#ef4444";
    const rangeWrap = document.createElement("div");
    rangeWrap.style.cssText = "margin-bottom:12px;";
    rangeWrap.innerHTML = `
      <div style="display:flex;justify-content:space-between;font-size:10px;color:#64748b;margin-bottom:2px;">
        <span>${fmtCurrency(data.marketPosition.minPrice)}</span>
        <span>${data.marketPosition.totalActive} similar</span>
        <span>${fmtCurrency(data.marketPosition.maxPrice)}</span>
      </div>
      <div style="position:relative;height:20px;background:#1e293b;border-radius:4px;border:1px solid #334155;">
        <div style="position:absolute;left:0;top:0;height:100%;width:${pctile}%;background:${pctColor}25;border-radius:4px 0 0 4px;"></div>
        <div style="position:absolute;left:${pctile}%;top:0;height:100%;width:2px;background:${pctColor};"></div>
      </div>
    `;
    results.appendChild(rangeWrap);

    // Top 3 comparable cards (Section 5)
    const top3 = data.comparables.slice(0, 3);
    for (const c of top3) {
      const row = document.createElement("div");
      row.style.cssText = "display:flex;justify-content:space-between;align-items:center;background:#1e293b;border:1px solid #334155;border-radius:8px;padding:10px 12px;margin-bottom:6px;";
      row.innerHTML = `
        <div>
          <div style="font-size:12px;font-weight:600;color:#e2e8f0;">${c.year} ${c.model} ${c.trim}</div>
          <div style="font-size:10px;color:#64748b;">${fmtNumber(c.miles)} mi | ${c.city}, ${c.state}</div>
        </div>
        <div style="font-size:16px;font-weight:800;color:#f8fafc;">${fmtCurrency(c.price)}</div>
      `;
      results.appendChild(row);
    }

    // "View Full Report" link
    const fullLink = document.createElement("div");
    fullLink.style.cssText = "text-align:center;margin-top:12px;";
    const currentUrl = new URL(location.href);
    currentUrl.searchParams.delete("compact");
    fullLink.innerHTML = `<a href="${currentUrl.toString()}" target="_blank" style="color:#3b82f6;font-size:12px;font-weight:600;text-decoration:none;">View Full Report &#x2192;</a>`;
    results.appendChild(fullLink);
  }

  // ── Scrollbar & Responsive Styles ──
  const style = document.createElement("style");
  style.textContent = `
    @media (max-width: 900px) {
      #results [style*="grid-template-columns:repeat(4"] { grid-template-columns: repeat(2,1fr) !important; }
    }
    ::-webkit-scrollbar { height: 6px; }
    ::-webkit-scrollbar-track { background: #1e293b; border-radius: 3px; }
    ::-webkit-scrollbar-thumb { background: #334155; border-radius: 3px; }
    ::-webkit-scrollbar-thumb:hover { background: #475569; }
  `;
  document.head.appendChild(style);
}

main();
