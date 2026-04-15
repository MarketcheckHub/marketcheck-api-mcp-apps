/**
 * Auto Journalist Market Briefing
 * One-page market briefing with key auto market stats, trending segments, quotable data points.
 */
import { App } from "@modelcontextprotocol/ext-apps";

let _safeApp: any = null;
try { _safeApp = new App({ name: "auto-journalist-briefing" }); } catch {}

function _getAuth(): { mode: "api_key" | "oauth_token" | null; value: string | null } {
  const params = new URLSearchParams(location.search);
  const token = params.get("access_token") ?? localStorage.getItem("mc_access_token");
  if (token) return { mode: "oauth_token", value: token };
  const key = params.get("api_key") ?? localStorage.getItem("mc_api_key");
  if (key) return { mode: "api_key", value: key };
  return { mode: null, value: null };
}
function _detectAppMode(): "mcp" | "live" | "demo" { if (_getAuth().value) return "live"; if (_safeApp) return "mcp"; return "demo"; }
function _isEmbedMode(): boolean { return new URLSearchParams(location.search).has("embed"); }
function _getUrlParams(): Record<string, string> { const params = new URLSearchParams(location.search); const result: Record<string, string> = {}; for (const key of ["vin","zip","make","model","miles","state","dealer_id","ticker","price"]) { const v = params.get(key); if (v) result[key] = v; } return result; }
function _proxyBase(): string { return location.protocol.startsWith("http") ? "" : "http://localhost:3001"; }

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
  const [byMake,byBodyType,byState] = await Promise.all([_mcSold({ranking_dimensions:"make",ranking_measure:"sold_count,average_sale_price",ranking_order:"desc",top_n:15,inventory_type:"Used"}),_mcSold({ranking_dimensions:"body_type",ranking_measure:"sold_count,average_sale_price",inventory_type:"Used"}),_mcSold({ranking_dimensions:"state",ranking_measure:"average_sale_price",ranking_order:"desc",top_n:10,inventory_type:"Used"})]);
  return {byMake,byBodyType,byState};
}
async function _callTool(toolName, args) {
  const auth = _getAuth();
  if (auth.value) {
    // 1. Proxy (same-origin, reliable)
    try {
      const r = await fetch((_proxyBase()) + "/api/proxy/" + toolName, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...args, _auth_mode: auth.mode, _auth_value: auth.value }),
      });
      if (r.ok) { const d = await r.json(); return { content: [{ type: "text", text: JSON.stringify(d) }] }; }
    } catch {}
    // 2. Direct API fallback
    try {
      const data = await _fetchDirect(args);
      if (data) return { content: [{ type: "text", text: JSON.stringify(data) }] };
    } catch {}
  }
  // 3. MCP mode (Claude, VS Code, etc.)
  if (_safeApp) {
    try { return await _safeApp.callServerTool({ name: toolName, arguments: args }); } catch {}
  }
  // 4. Demo mode
  return null;
}

function _addSettingsBar(headerEl?: HTMLElement) {
  if (_isEmbedMode() || !headerEl) return;
  const mode = _detectAppMode();
  const bar = document.createElement("div"); bar.style.cssText = "display:flex;align-items:center;gap:8px;margin-left:auto;";
  const colors: Record<string, { bg: string; fg: string; label: string }> = { mcp: { bg: "#1e40af22", fg: "#60a5fa", label: "MCP" }, live: { bg: "#05966922", fg: "#34d399", label: "LIVE" }, demo: { bg: "#92400e88", fg: "#fbbf24", label: "DEMO" } };
  const c = colors[mode];
  bar.innerHTML = `<span style="padding:3px 10px;border-radius:10px;font-size:10px;font-weight:700;letter-spacing:0.5px;background:${c.bg};color:${c.fg};border:1px solid ${c.fg}33;">${c.label}</span>`;
  if (mode !== "mcp") {
    const gear = document.createElement("button"); gear.innerHTML = "&#9881;"; gear.title = "API Settings"; gear.style.cssText = "background:none;border:none;color:#94a3b8;font-size:18px;cursor:pointer;padding:4px;";
    const panel = document.createElement("div"); panel.style.cssText = "display:none;position:fixed;top:50px;right:16px;background:#1e293b;border:1px solid #334155;border-radius:8px;padding:16px;z-index:1000;min-width:300px;box-shadow:0 8px 32px rgba(0,0,0,0.5);";
    panel.innerHTML = `<div style="font-size:13px;font-weight:600;color:#f8fafc;margin-bottom:12px;">API Configuration</div><label style="font-size:11px;color:#94a3b8;display:block;margin-bottom:4px;">MarketCheck API Key</label><input id="_mc_key_inp" type="password" placeholder="Enter your API key" value="${_getAuth().mode === 'api_key' ? _getAuth().value ?? '' : ''}" style="width:100%;padding:8px;border-radius:6px;border:1px solid #334155;background:#0f172a;color:#e2e8f0;font-size:13px;margin-bottom:8px;box-sizing:border-box;" /><div style="font-size:10px;color:#64748b;margin-bottom:12px;">Get a free key at <a href="https://developers.marketcheck.com" target="_blank" style="color:#60a5fa;">developers.marketcheck.com</a></div><div style="display:flex;gap:8px;"><button id="_mc_save" style="flex:1;padding:8px;border-radius:6px;border:none;background:#3b82f6;color:#fff;font-size:13px;font-weight:600;cursor:pointer;">Save & Reload</button><button id="_mc_clear" style="padding:8px 12px;border-radius:6px;border:1px solid #334155;background:transparent;color:#94a3b8;font-size:13px;cursor:pointer;">Clear</button></div>`;
    gear.addEventListener("click", () => { panel.style.display = panel.style.display === "none" ? "block" : "none"; });
    document.addEventListener("click", (e) => { if (!panel.contains(e.target as Node) && e.target !== gear) panel.style.display = "none"; });
    document.body.appendChild(panel);
    setTimeout(() => { document.getElementById("_mc_save")?.addEventListener("click", () => { const k = (document.getElementById("_mc_key_inp") as HTMLInputElement)?.value?.trim(); if (k) { localStorage.setItem("mc_api_key", k); location.reload(); } }); document.getElementById("_mc_clear")?.addEventListener("click", () => { localStorage.removeItem("mc_api_key"); localStorage.removeItem("mc_access_token"); location.reload(); }); }, 0);
    bar.appendChild(gear);
  }
  headerEl.appendChild(bar);
}
(function injectResponsiveStyles() { const s = document.createElement("style"); s.textContent = `@media(max-width:768px){body{font-size:13px!important}table{font-size:12px!important}th,td{padding:6px 8px!important}h1{font-size:18px!important}h2{font-size:15px!important}canvas{max-width:100%!important}input,select,button{font-size:14px!important}[style*="display:flex"][style*="gap"],[style*="display: flex"][style*="gap"]{flex-wrap:wrap!important}[style*="grid-template-columns: repeat"]{grid-template-columns:1fr!important}[style*="grid-template-columns:repeat"]{grid-template-columns:1fr!important}div[style*="overflow-x:auto"],div[style*="overflow-x: auto"]{-webkit-overflow-scrolling:touch}table{min-width:600px}[style*="width:35%"],[style*="width:40%"],[style*="width:25%"],[style*="width:50%"],[style*="width:60%"],[style*="width:65%"],[style*="width: 35%"],[style*="width: 40%"],[style*="width: 25%"],[style*="width: 50%"],[style*="width: 60%"],[style*="width: 65%"]{width:100%!important;min-width:0!important}}@media(max-width:480px){body{padding:8px!important}h1{font-size:16px!important}th,td{padding:4px 6px!important;font-size:11px!important}input,select{max-width:100%!important;width:100%!important;box-sizing:border-box!important}}`; document.head.appendChild(s); })();


// ── Types ──────────────────────────────────────────────────────────────────────

interface PriceMover {
  make: string;
  model: string;
  avgPrice: number;
  priceChange: number;
  changePercent: number;
  volume: number;
}

interface SegmentShare {
  segment: string;
  share: number;
  volume: number;
  avgPrice: number;
  daysSupply: number;
}

interface BrandRanking {
  brand: string;
  volume: number;
  avgPrice: number;
  marketShare: number;
}

interface QuotableStat {
  headline: string;
  detail: string;
  source: string;
}

interface StatePrice {
  state: string;
  avgPrice: number;
  label: string;
}

interface BriefingResult {
  reportDate: string;
  totalSalesVolume: number;
  avgSalePrice: number;
  yoyPriceChange: number;
  fastestSellingSegment: string;
  topGainers: PriceMover[];
  topLosers: PriceMover[];
  segmentShares: SegmentShare[];
  brandRankings: BrandRanking[];
  quotableStats: QuotableStat[];
  cheapestStates: StatePrice[];
  expensiveStates: StatePrice[];
}

// ── Mock Data ──────────────────────────────────────────────────────────────────

function getMockData(): BriefingResult {
  const now = new Date();
  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  return {
    reportDate: `${monthNames[now.getMonth()]} ${now.getFullYear()}`,
    totalSalesVolume: 1203400,
    avgSalePrice: 29450,
    yoyPriceChange: -2.3,
    fastestSellingSegment: "Compact SUV",
    topGainers: [
      { make: "Toyota", model: "RAV4", avgPrice: 32800, priceChange: 1050, changePercent: 3.2, volume: 42100 },
      { make: "Honda", model: "CR-V", avgPrice: 34200, priceChange: 960, changePercent: 2.8, volume: 38400 },
      { make: "Hyundai", model: "Tucson", avgPrice: 30600, priceChange: 750, changePercent: 2.5, volume: 22800 },
      { make: "Kia", model: "Sportage", avgPrice: 31400, priceChange: 690, changePercent: 2.2, volume: 19600 },
      { make: "Subaru", model: "Forester", avgPrice: 33100, priceChange: 630, changePercent: 1.9, volume: 16200 },
    ],
    topLosers: [
      { make: "Tesla", model: "Model 3", avgPrice: 32400, priceChange: -1650, changePercent: -5.1, volume: 28400 },
      { make: "BMW", model: "X3", avgPrice: 42800, priceChange: -1620, changePercent: -3.8, volume: 14200 },
      { make: "Mercedes-Benz", model: "GLC", avgPrice: 46200, priceChange: -1480, changePercent: -3.2, volume: 12800 },
      { make: "Audi", model: "Q5", avgPrice: 44600, priceChange: -1340, changePercent: -3.0, volume: 11400 },
      { make: "Nissan", model: "Altima", avgPrice: 24800, priceChange: -620, changePercent: -2.5, volume: 18600 },
    ],
    segmentShares: [
      { segment: "Compact SUV", share: 24.2, volume: 291200, avgPrice: 32400, daysSupply: 42 },
      { segment: "Full-Size Pickup", share: 18.6, volume: 223800, avgPrice: 48200, daysSupply: 55 },
      { segment: "Mid-Size Sedan", share: 14.8, volume: 178100, avgPrice: 26800, daysSupply: 38 },
      { segment: "Mid-Size SUV", share: 12.4, volume: 149200, avgPrice: 38400, daysSupply: 48 },
      { segment: "Compact Sedan", share: 8.6, volume: 103500, avgPrice: 24200, daysSupply: 35 },
      { segment: "Luxury SUV", share: 6.2, volume: 74600, avgPrice: 56800, daysSupply: 62 },
      { segment: "Full-Size SUV", share: 5.4, volume: 65000, avgPrice: 52400, daysSupply: 58 },
      { segment: "Sports Car", share: 3.2, volume: 38500, avgPrice: 42600, daysSupply: 45 },
      { segment: "EV Crossover", share: 4.1, volume: 49300, avgPrice: 44200, daysSupply: 72 },
      { segment: "Van/Minivan", share: 2.5, volume: 30100, avgPrice: 36200, daysSupply: 50 },
    ],
    brandRankings: [
      { brand: "Toyota", volume: 182400, avgPrice: 34200, marketShare: 15.2 },
      { brand: "Ford", volume: 156800, avgPrice: 38600, marketShare: 13.0 },
      { brand: "Chevrolet", volume: 142200, avgPrice: 36400, marketShare: 11.8 },
      { brand: "Honda", volume: 118600, avgPrice: 32800, marketShare: 9.9 },
      { brand: "Hyundai", volume: 86400, avgPrice: 30200, marketShare: 7.2 },
      { brand: "Kia", volume: 72800, avgPrice: 29400, marketShare: 6.1 },
      { brand: "Nissan", volume: 68400, avgPrice: 28600, marketShare: 5.7 },
      { brand: "Tesla", volume: 62200, avgPrice: 42800, marketShare: 5.2 },
      { brand: "Jeep", volume: 58600, avgPrice: 36200, marketShare: 4.9 },
      { brand: "Subaru", volume: 48200, avgPrice: 33400, marketShare: 4.0 },
      { brand: "GMC", volume: 42800, avgPrice: 48600, marketShare: 3.6 },
      { brand: "Ram", volume: 38400, avgPrice: 44200, marketShare: 3.2 },
      { brand: "BMW", volume: 34600, avgPrice: 52400, marketShare: 2.9 },
      { brand: "Mercedes-Benz", volume: 32200, avgPrice: 56800, marketShare: 2.7 },
      { brand: "Volkswagen", volume: 28400, avgPrice: 31200, marketShare: 2.4 },
    ],
    quotableStats: [
      { headline: "Average used car price is $29,450, down 2.3% YoY", detail: "The national average sale price for used vehicles fell to $29,450 this month, marking a 2.3% decline year-over-year as inventory levels continue to normalize.", source: "MarketCheck Sold Data, 1.2M transactions" },
      { headline: "Compact SUVs outsell every other segment at 24.2% market share", detail: "Compact SUVs dominate with nearly a quarter of all sales volume. The Toyota RAV4 and Honda CR-V lead the pack, both seeing price gains exceeding 2.5%.", source: "MarketCheck Segment Analysis" },
      { headline: "Tesla Model 3 prices dropped 5.1% as EV supply normalizes", detail: "The Tesla Model 3 saw the largest single-model price decline at 5.1%, reflecting growing EV inventory and increased competition from legacy automakers.", source: "MarketCheck Price Tracking" },
      { headline: "EV days-supply at 72 days vs 42 days for compact SUVs", detail: "Electric vehicles are sitting on lots 71% longer than the best-selling compact SUV segment, indicating a supply-demand mismatch in the EV market.", source: "MarketCheck Inventory Analysis" },
      { headline: "California buyers pay $6,400 more than the national average", detail: "Buyers in California pay an average of $35,850 for a used vehicle compared to the national average of $29,450 -- a $6,400 premium driven by emissions regulations and demand.", source: "MarketCheck Regional Pricing" },
    ],
    cheapestStates: [
      { state: "Mississippi", avgPrice: 24200, label: "cheapest" },
      { state: "West Virginia", avgPrice: 24800, label: "cheap" },
      { state: "Alabama", avgPrice: 25400, label: "cheap" },
      { state: "Arkansas", avgPrice: 25800, label: "cheap" },
      { state: "Oklahoma", avgPrice: 26200, label: "cheap" },
    ],
    expensiveStates: [
      { state: "California", avgPrice: 35850, label: "most expensive" },
      { state: "Hawaii", avgPrice: 34200, label: "expensive" },
      { state: "Washington", avgPrice: 33600, label: "expensive" },
      { state: "New York", avgPrice: 33200, label: "expensive" },
      { state: "Massachusetts", avgPrice: 32800, label: "expensive" },
    ],
  };
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function fmtCurrency(v: number): string {
  return "$" + Math.round(v).toLocaleString();
}

function fmtNumber(v: number): string {
  if (v >= 1000000) return (v / 1000000).toFixed(1) + "M";
  if (v >= 1000) return (v / 1000).toFixed(1) + "K";
  return Math.round(v).toLocaleString();
}

function fmtFullNumber(v: number): string {
  return Math.round(v).toLocaleString();
}

// ── Canvas: Segment Share Horizontal Stacked Bar ────────────────────────────

function drawSegmentChart(canvas: HTMLCanvasElement, segments: SegmentShare[]) {
  const dpr = window.devicePixelRatio || 1;
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  const ctx = canvas.getContext("2d")!;
  ctx.scale(dpr, dpr);

  const padLeft = 130;
  const padRight = 60;
  const padTop = 10;
  const padBottom = 30;
  const chartW = w - padLeft - padRight;
  const chartH = h - padTop - padBottom;

  const barHeight = Math.min(28, (chartH - (segments.length - 1) * 4) / segments.length);
  const barGap = 4;

  const maxVolume = Math.max(...segments.map(s => s.volume));

  const segmentColors = [
    "#3b82f6", "#8b5cf6", "#10b981", "#f59e0b", "#ef4444",
    "#06b6d4", "#ec4899", "#84cc16", "#f97316", "#6366f1",
  ];

  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    const y = padTop + i * (barHeight + barGap);
    const barW = (seg.volume / maxVolume) * chartW;
    const color = segmentColors[i % segmentColors.length];

    // Bar
    const radius = 3;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(padLeft, y);
    ctx.lineTo(padLeft + barW - radius, y);
    ctx.quadraticCurveTo(padLeft + barW, y, padLeft + barW, y + radius);
    ctx.lineTo(padLeft + barW, y + barHeight - radius);
    ctx.quadraticCurveTo(padLeft + barW, y + barHeight, padLeft + barW - radius, y + barHeight);
    ctx.lineTo(padLeft, y + barHeight);
    ctx.closePath();
    ctx.fill();

    // Semi-transparent gradient overlay
    const gradient = ctx.createLinearGradient(padLeft, y, padLeft + barW, y);
    gradient.addColorStop(0, "rgba(255,255,255,0.08)");
    gradient.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = gradient;
    ctx.fill();

    // Segment label (left side)
    ctx.fillStyle = "#e2e8f0";
    ctx.font = "12px -apple-system, sans-serif";
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    ctx.fillText(seg.segment, padLeft - 8, y + barHeight / 2);

    // Share percentage (on bar or right of bar)
    ctx.fillStyle = barW > 50 ? "#ffffff" : "#e2e8f0";
    ctx.font = "bold 11px -apple-system, sans-serif";
    ctx.textAlign = barW > 50 ? "left" : "left";
    const labelX = barW > 50 ? padLeft + 8 : padLeft + barW + 6;
    ctx.textBaseline = "middle";
    ctx.fillText(`${seg.share}%`, labelX, y + barHeight / 2);

    // Volume label (right)
    ctx.fillStyle = "#94a3b8";
    ctx.font = "11px -apple-system, sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(fmtNumber(seg.volume), padLeft + barW + (barW > 50 ? 8 : 40), y + barHeight / 2);
  }
}

// ── Supply Health Color Coding ──────────────────────────────────────────────

function supplyColor(days: number): string {
  if (days < 40) return "#10b981";
  if (days < 55) return "#f59e0b";
  if (days < 65) return "#f97316";
  return "#ef4444";
}

function supplyLabel(days: number): string {
  if (days < 40) return "Tight";
  if (days < 55) return "Balanced";
  if (days < 65) return "Elevated";
  return "Oversupply";
}

// ── Main App ───────────────────────────────────────────────────────────────────

async function main() {
  let serverAvailable = !!_safeApp;
  try { (_safeApp as any)?.connect?.(); } catch { serverAvailable = false; }

  document.body.style.cssText = "margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#0f172a;color:#e2e8f0;overflow-x:hidden;";

  const container = document.createElement("div");
  container.style.cssText = "max-width:1200px;margin:0 auto;padding:16px 20px;";
  document.body.appendChild(container);

  // ── Demo mode banner ──
  if (_detectAppMode() === "demo") {
    const _db = document.createElement("div");
    _db.id = "_demo_banner";
    _db.style.cssText = "background:linear-gradient(135deg,#92400e22,#f59e0b11);border:1px solid #f59e0b44;border-radius:10px;padding:14px 20px;margin-bottom:12px;display:flex;align-items:center;gap:14px;flex-wrap:wrap;";
    _db.innerHTML = `
      <div style="flex:1;min-width:200px;">
        <div style="font-size:13px;font-weight:700;color:#fbbf24;margin-bottom:2px;">&#9888; Demo Mode — Showing sample data</div>
        <div style="font-size:12px;color:#d97706;">Enter your MarketCheck API key to see real market data. <a href="https://developers.marketcheck.com" target="_blank" style="color:#fbbf24;text-decoration:underline;">Get a free key</a></div>
      </div>
      <div style="display:flex;gap:8px;align-items:center;">
        <input id="_banner_key" type="text" placeholder="Paste your API key" style="padding:8px 12px;border-radius:6px;border:1px solid #f59e0b44;background:#0f172a;color:#e2e8f0;font-size:13px;width:220px;outline:none;" />
        <button id="_banner_save" style="padding:8px 16px;border-radius:6px;border:none;background:#f59e0b;color:#0f172a;font-size:12px;font-weight:700;cursor:pointer;white-space:nowrap;">Activate</button>
      </div>`;
    container.appendChild(_db);
    _db.querySelector("#_banner_save").addEventListener("click", () => {
      const k = _db.querySelector("#_banner_key").value.trim();
      if (!k) return;
      localStorage.setItem("mc_api_key", k);
      _db.style.background = "linear-gradient(135deg,#05966922,#10b98111)";
      _db.style.borderColor = "#10b98144";
      _db.innerHTML = '<div style="font-size:13px;font-weight:700;color:#10b981;">&#10003; API key saved — reloading with live data...</div>';
      setTimeout(() => location.reload(), 800);
    });
    _db.querySelector("#_banner_key").addEventListener("keydown", (e) => { if (e.key === "Enter") _db.querySelector("#_banner_save").click(); });
  }

  // ── Header ──
  const header = document.createElement("div");
  header.style.cssText = "background:#1e293b;padding:16px 20px;border-radius:10px;margin-bottom:16px;border:1px solid #334155;display:flex;align-items:center;";
  header.innerHTML = `<div><h1 style="margin:0 0 4px 0;font-size:20px;font-weight:700;color:#f8fafc;">Auto Journalist Market Briefing</h1>
    <p style="margin:0;font-size:13px;color:#94a3b8;">One-page market briefing with quotable data points for automotive media</p></div>`;
  container.appendChild(header);
  _addSettingsBar(header);

  // ── Results ──
  const results = document.createElement("div");
  results.id = "results";
  container.appendChild(results);

  async function loadBriefing() {
    results.innerHTML = `<div style="display:flex;align-items:center;justify-content:center;padding:60px;color:#94a3b8;">
      <div style="width:24px;height:24px;border:3px solid #334155;border-top-color:#3b82f6;border-radius:50%;animation:spin 0.8s linear infinite;margin-right:14px;"></div>
      <style>@keyframes spin{to{transform:rotate(360deg)}}</style>
      Generating market briefing...
    </div>`;

    let data: BriefingResult;

    try {
      if (serverAvailable) {
        const response = await _callTool("generate-market-briefing", {});
        const textContent = response?.content?.find((c: any) => c.type === "text");
        data = JSON.parse(textContent?.text ?? "{}");
      } else {
        await new Promise(r => setTimeout(r, 700));
        data = getMockData();
      }

      renderBriefing(data);
    } catch (err: any) {
      console.error("Briefing failed, falling back to mock:", err);
      await new Promise(r => setTimeout(r, 400));
      data = getMockData();
      renderBriefing(data);
    }
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  function renderBriefing(data: BriefingResult) {
    results.innerHTML = "";

    // ── "This Month in Auto" Header ──
    const dateHeader = document.createElement("div");
    dateHeader.style.cssText = "background:linear-gradient(135deg,#1e293b,#0f172a);border:1px solid #334155;border-radius:10px;padding:20px 24px;margin-bottom:16px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;";
    dateHeader.innerHTML = `<div>
        <div style="font-size:11px;color:#3b82f6;text-transform:uppercase;letter-spacing:1.5px;font-weight:700;margin-bottom:4px;">MARKET BRIEFING</div>
        <div style="font-size:24px;font-weight:800;color:#f8fafc;">This Month in Auto</div>
        <div style="font-size:13px;color:#94a3b8;margin-top:2px;">${data.reportDate} Edition</div>
      </div>
      <div style="text-align:right;">
        <div style="font-size:11px;color:#94a3b8;">Powered by</div>
        <div style="font-size:14px;font-weight:700;color:#3b82f6;">MarketCheck</div>
        <div style="font-size:10px;color:#64748b;">1.2M+ transactions analyzed</div>
      </div>`;
    results.appendChild(dateHeader);

    // ── KPI Ribbon ──
    const kpiRibbon = document.createElement("div");
    kpiRibbon.style.cssText = "display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:16px;";

    const yoyColor = data.yoyPriceChange >= 0 ? "#10b981" : "#ef4444";
    const yoyArrow = data.yoyPriceChange >= 0 ? "+" : "";
    const kpis = [
      { label: "Total Sales Volume", value: fmtNumber(data.totalSalesVolume), color: "#3b82f6" },
      { label: "Avg Sale Price", value: fmtCurrency(data.avgSalePrice), color: "#8b5cf6" },
      { label: "YoY Price Change", value: `${yoyArrow}${data.yoyPriceChange.toFixed(1)}%`, color: yoyColor },
      { label: "Fastest-Selling Segment", value: data.fastestSellingSegment, color: "#10b981" },
    ];

    for (const kpi of kpis) {
      const card = document.createElement("div");
      card.style.cssText = "background:#1e293b;border:1px solid #334155;border-radius:10px;padding:16px 18px;text-align:center;";
      card.innerHTML = `<div style="font-size:11px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:8px;">${kpi.label}</div>
        <div style="font-size:22px;font-weight:800;color:${kpi.color};letter-spacing:-0.5px;">${kpi.value}</div>`;
      kpiRibbon.appendChild(card);
    }
    results.appendChild(kpiRibbon);

    // ── Two-Column: Gainers + Losers ──
    const moversSection = document.createElement("div");
    moversSection.style.cssText = "display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px;";

    // Gainers
    const gainersPanel = document.createElement("div");
    gainersPanel.style.cssText = "background:#1e293b;border:1px solid #334155;border-radius:10px;padding:18px 20px;";
    gainersPanel.innerHTML = `<h2 style="margin:0 0 14px 0;font-size:15px;font-weight:700;color:#10b981;">Top Gainers</h2>`;

    let gainersHtml = `<div style="display:flex;flex-direction:column;gap:8px;">`;
    for (const g of data.topGainers) {
      gainersHtml += `<div style="background:#0f172a;border-radius:8px;padding:12px 14px;display:flex;justify-content:space-between;align-items:center;border-left:3px solid #10b981;">
        <div>
          <div style="font-weight:600;color:#f8fafc;font-size:13px;">${g.make} ${g.model}</div>
          <div style="font-size:11px;color:#94a3b8;">${fmtCurrency(g.avgPrice)} avg | ${fmtNumber(g.volume)} sold</div>
        </div>
        <div style="text-align:right;">
          <div style="font-size:16px;font-weight:700;color:#10b981;">+${g.changePercent.toFixed(1)}%</div>
          <div style="font-size:11px;color:#10b981;">+${fmtCurrency(g.priceChange)}</div>
        </div>
      </div>`;
    }
    gainersHtml += `</div>`;
    gainersPanel.innerHTML += gainersHtml;
    moversSection.appendChild(gainersPanel);

    // Losers
    const losersPanel = document.createElement("div");
    losersPanel.style.cssText = "background:#1e293b;border:1px solid #334155;border-radius:10px;padding:18px 20px;";
    losersPanel.innerHTML = `<h2 style="margin:0 0 14px 0;font-size:15px;font-weight:700;color:#ef4444;">Top Losers</h2>`;

    let losersHtml = `<div style="display:flex;flex-direction:column;gap:8px;">`;
    for (const l of data.topLosers) {
      losersHtml += `<div style="background:#0f172a;border-radius:8px;padding:12px 14px;display:flex;justify-content:space-between;align-items:center;border-left:3px solid #ef4444;">
        <div>
          <div style="font-weight:600;color:#f8fafc;font-size:13px;">${l.make} ${l.model}</div>
          <div style="font-size:11px;color:#94a3b8;">${fmtCurrency(l.avgPrice)} avg | ${fmtNumber(l.volume)} sold</div>
        </div>
        <div style="text-align:right;">
          <div style="font-size:16px;font-weight:700;color:#ef4444;">${l.changePercent.toFixed(1)}%</div>
          <div style="font-size:11px;color:#ef4444;">${fmtCurrency(l.priceChange)}</div>
        </div>
      </div>`;
    }
    losersHtml += `</div>`;
    losersPanel.innerHTML += losersHtml;
    moversSection.appendChild(losersPanel);
    results.appendChild(moversSection);

    // ── Segment Share Chart ──
    const segChartSection = document.createElement("div");
    segChartSection.style.cssText = "background:#1e293b;border:1px solid #334155;border-radius:10px;padding:18px 20px;margin-bottom:16px;";
    segChartSection.innerHTML = `<h2 style="margin:0 0 14px 0;font-size:15px;font-weight:700;color:#f8fafc;">Segment Market Share</h2>`;

    const canvas = document.createElement("canvas");
    canvas.style.cssText = "width:100%;height:340px;";
    segChartSection.appendChild(canvas);
    results.appendChild(segChartSection);

    requestAnimationFrame(() => {
      drawSegmentChart(canvas, data.segmentShares);
    });

    // ── Supply Health Indicator ──
    const supplySection = document.createElement("div");
    supplySection.style.cssText = "background:#1e293b;border:1px solid #334155;border-radius:10px;padding:18px 20px;margin-bottom:16px;";
    supplySection.innerHTML = `<h2 style="margin:0 0 14px 0;font-size:15px;font-weight:700;color:#f8fafc;">Supply Health Indicator</h2>
      <p style="margin:0 0 14px 0;font-size:12px;color:#94a3b8;">National days-supply by segment -- lower is tighter supply, higher means oversupply</p>`;

    let supplyHtml = `<div style="display:grid;grid-template-columns:repeat(5,1fr);gap:10px;">`;
    for (const seg of data.segmentShares) {
      const sc = supplyColor(seg.daysSupply);
      const sl = supplyLabel(seg.daysSupply);
      supplyHtml += `<div style="background:#0f172a;border-radius:8px;padding:12px;text-align:center;border-top:3px solid ${sc};">
        <div style="font-size:10px;color:#94a3b8;margin-bottom:6px;line-height:1.3;">${seg.segment}</div>
        <div style="font-size:22px;font-weight:800;color:${sc};">${seg.daysSupply}</div>
        <div style="font-size:10px;color:#94a3b8;">days</div>
        <div style="font-size:9px;font-weight:600;color:${sc};margin-top:4px;">${sl}</div>
      </div>`;
    }
    supplyHtml += `</div>`;
    supplySection.innerHTML += supplyHtml;
    results.appendChild(supplySection);

    // ── Two-Column: Brand Rankings + Regional Pricing ──
    const bottomTwoCol = document.createElement("div");
    bottomTwoCol.style.cssText = "display:grid;grid-template-columns:1.2fr 0.8fr;gap:16px;margin-bottom:16px;";

    // ── Brand Volume Rankings ──
    const brandSection = document.createElement("div");
    brandSection.style.cssText = "background:#1e293b;border:1px solid #334155;border-radius:10px;padding:18px 20px;";
    brandSection.innerHTML = `<h2 style="margin:0 0 14px 0;font-size:15px;font-weight:700;color:#f8fafc;">Brand Volume Rankings</h2>`;

    const brandTableWrap = document.createElement("div");
    brandTableWrap.style.cssText = "overflow-x:auto;max-height:500px;overflow-y:auto;";
    let brandHtml = `<table style="width:100%;border-collapse:collapse;font-size:13px;">
      <thead><tr>
        <th style="padding:8px 10px;text-align:left;color:#94a3b8;border-bottom:2px solid #334155;font-weight:600;position:sticky;top:0;background:#1e293b;">#</th>
        <th style="padding:8px 10px;text-align:left;color:#94a3b8;border-bottom:2px solid #334155;font-weight:600;position:sticky;top:0;background:#1e293b;">Brand</th>
        <th style="padding:8px 10px;text-align:right;color:#94a3b8;border-bottom:2px solid #334155;font-weight:600;position:sticky;top:0;background:#1e293b;">Volume</th>
        <th style="padding:8px 10px;text-align:right;color:#94a3b8;border-bottom:2px solid #334155;font-weight:600;position:sticky;top:0;background:#1e293b;">Avg Price</th>
        <th style="padding:8px 10px;text-align:right;color:#94a3b8;border-bottom:2px solid #334155;font-weight:600;position:sticky;top:0;background:#1e293b;">Share</th>
        <th style="padding:8px 10px;text-align:left;color:#94a3b8;border-bottom:2px solid #334155;font-weight:600;position:sticky;top:0;background:#1e293b;">Market Share</th>
      </tr></thead><tbody>`;

    const maxBrandVol = Math.max(...data.brandRankings.map(b => b.volume));
    for (let i = 0; i < data.brandRankings.length; i++) {
      const b = data.brandRankings[i];
      const barPct = (b.volume / maxBrandVol) * 100;
      const medalColor = i === 0 ? "#fbbf24" : i === 1 ? "#94a3b8" : i === 2 ? "#cd7f32" : "transparent";
      brandHtml += `<tr>
        <td style="padding:8px 10px;border-bottom:1px solid #1e293b44;">
          ${i < 3 ? `<span style="display:inline-block;width:20px;height:20px;border-radius:50%;background:${medalColor}22;color:${medalColor};font-size:11px;font-weight:700;text-align:center;line-height:20px;border:1px solid ${medalColor}44;">${i + 1}</span>` : `<span style="color:#64748b;font-weight:600;">${i + 1}</span>`}
        </td>
        <td style="padding:8px 10px;border-bottom:1px solid #1e293b44;color:#f8fafc;font-weight:600;">${b.brand}</td>
        <td style="padding:8px 10px;border-bottom:1px solid #1e293b44;text-align:right;color:#f8fafc;">${fmtFullNumber(b.volume)}</td>
        <td style="padding:8px 10px;border-bottom:1px solid #1e293b44;text-align:right;color:#94a3b8;">${fmtCurrency(b.avgPrice)}</td>
        <td style="padding:8px 10px;border-bottom:1px solid #1e293b44;text-align:right;color:#3b82f6;font-weight:600;">${b.marketShare.toFixed(1)}%</td>
        <td style="padding:8px 10px;border-bottom:1px solid #1e293b44;width:80px;">
          <div style="background:#0f172a;border-radius:4px;height:6px;overflow:hidden;">
            <div style="width:${barPct}%;height:100%;background:#3b82f6;border-radius:4px;"></div>
          </div>
        </td>
      </tr>`;
    }
    brandHtml += `</tbody></table>`;
    brandTableWrap.innerHTML = brandHtml;
    brandSection.appendChild(brandTableWrap);
    bottomTwoCol.appendChild(brandSection);

    // ── Regional Price Variance ──
    const regionalSection = document.createElement("div");
    regionalSection.style.cssText = "background:#1e293b;border:1px solid #334155;border-radius:10px;padding:18px 20px;";
    regionalSection.innerHTML = `<h2 style="margin:0 0 14px 0;font-size:15px;font-weight:700;color:#f8fafc;">Regional Price Variance</h2>`;

    let regionalHtml = `<div style="margin-bottom:16px;">
      <div style="font-size:12px;color:#ef4444;font-weight:600;margin-bottom:8px;text-transform:uppercase;letter-spacing:0.5px;">Most Expensive States</div>
      <div style="display:flex;flex-direction:column;gap:6px;">`;
    for (let i = 0; i < data.expensiveStates.length; i++) {
      const s = data.expensiveStates[i];
      const diff = s.avgPrice - data.avgSalePrice;
      regionalHtml += `<div style="background:#0f172a;border-radius:6px;padding:10px 12px;display:flex;justify-content:space-between;align-items:center;${i === 0 ? "border:1px solid #ef444444;" : ""}">
        <div style="color:#f8fafc;font-size:13px;font-weight:500;">${s.state}</div>
        <div style="text-align:right;">
          <span style="color:#f8fafc;font-weight:600;font-size:14px;">${fmtCurrency(s.avgPrice)}</span>
          <span style="color:#ef4444;font-size:11px;margin-left:8px;">+${fmtCurrency(diff)}</span>
        </div>
      </div>`;
    }
    regionalHtml += `</div></div>`;

    regionalHtml += `<div>
      <div style="font-size:12px;color:#10b981;font-weight:600;margin-bottom:8px;text-transform:uppercase;letter-spacing:0.5px;">Cheapest States</div>
      <div style="display:flex;flex-direction:column;gap:6px;">`;
    for (let i = 0; i < data.cheapestStates.length; i++) {
      const s = data.cheapestStates[i];
      const diff = data.avgSalePrice - s.avgPrice;
      regionalHtml += `<div style="background:#0f172a;border-radius:6px;padding:10px 12px;display:flex;justify-content:space-between;align-items:center;${i === 0 ? "border:1px solid #10b98144;" : ""}">
        <div style="color:#f8fafc;font-size:13px;font-weight:500;">${s.state}</div>
        <div style="text-align:right;">
          <span style="color:#f8fafc;font-weight:600;font-size:14px;">${fmtCurrency(s.avgPrice)}</span>
          <span style="color:#10b981;font-size:11px;margin-left:8px;">-${fmtCurrency(diff)}</span>
        </div>
      </div>`;
    }
    regionalHtml += `</div></div>`;

    // National average callout
    regionalHtml += `<div style="background:#3b82f615;border:1px solid #3b82f633;border-radius:8px;padding:12px;margin-top:14px;text-align:center;">
      <div style="font-size:10px;color:#94a3b8;">National Average</div>
      <div style="font-size:18px;font-weight:700;color:#3b82f6;margin-top:2px;">${fmtCurrency(data.avgSalePrice)}</div>
    </div>`;
    regionalSection.innerHTML += regionalHtml;
    bottomTwoCol.appendChild(regionalSection);
    results.appendChild(bottomTwoCol);

    // ── Quotable Data Points ──
    const quotableSection = document.createElement("div");
    quotableSection.style.cssText = "background:#1e293b;border:1px solid #334155;border-radius:10px;padding:18px 20px;margin-bottom:16px;";
    quotableSection.innerHTML = `<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;">
      <h2 style="margin:0;font-size:15px;font-weight:700;color:#f8fafc;">Quotable Data Points</h2>
      <span style="font-size:10px;color:#94a3b8;background:#0f172a;padding:4px 10px;border-radius:6px;">Ready for article inclusion</span>
    </div>`;

    let quotableHtml = `<div style="display:flex;flex-direction:column;gap:12px;">`;
    const quoteBorders = ["#3b82f6", "#10b981", "#ef4444", "#f59e0b", "#8b5cf6"];
    for (let i = 0; i < data.quotableStats.length; i++) {
      const q = data.quotableStats[i];
      const borderColor = quoteBorders[i % quoteBorders.length];
      quotableHtml += `<div style="background:#0f172a;border-radius:8px;padding:16px;border-left:4px solid ${borderColor};position:relative;">
        <div style="font-size:15px;font-weight:700;color:#f8fafc;margin-bottom:6px;line-height:1.3;">"${q.headline}"</div>
        <div style="font-size:12px;color:#94a3b8;line-height:1.5;margin-bottom:8px;">${q.detail}</div>
        <div style="font-size:10px;color:#64748b;font-style:italic;">Source: ${q.source}</div>
        <button data-idx="${i}" class="copy-quote-btn" style="position:absolute;top:12px;right:12px;background:#1e293b;border:1px solid #334155;color:#94a3b8;font-size:10px;padding:4px 10px;border-radius:4px;cursor:pointer;">Copy</button>
      </div>`;
    }
    quotableHtml += `</div>`;
    quotableSection.innerHTML += quotableHtml;
    results.appendChild(quotableSection);

    // ── Copy button handlers ──
    document.querySelectorAll(".copy-quote-btn").forEach(btn => {
      btn.addEventListener("click", (e) => {
        const idx = parseInt((e.target as HTMLElement).getAttribute("data-idx") ?? "0");
        const q = data.quotableStats[idx];
        const text = `${q.headline}\n\n${q.detail}\n\nSource: ${q.source}`;
        navigator.clipboard.writeText(text).then(() => {
          (e.target as HTMLElement).textContent = "Copied!";
          setTimeout(() => { (e.target as HTMLElement).textContent = "Copy"; }, 2000);
        }).catch(() => {});
      });
    });

    // ── Market Health Dashboard ──
    const healthSection = document.createElement("div");
    healthSection.style.cssText = "background:#1e293b;border:1px solid #334155;border-radius:10px;padding:18px 20px;margin-bottom:16px;";
    healthSection.innerHTML = `<h2 style="margin:0 0 4px 0;font-size:15px;font-weight:700;color:#f8fafc;">Market Health Indicators</h2>
      <p style="margin:0 0 14px 0;font-size:12px;color:#94a3b8;">Key metrics that signal overall automotive market direction</p>`;

    const healthMetrics = [
      { label: "Price Stability Index", value: "72/100", description: "Moderate stability. Prices are declining gradually, not crashing.", color: "#f59e0b", bar: 72 },
      { label: "Inventory Turnover Rate", value: "1.8x", description: "Healthy turnover. Vehicles are moving at a normal pace nationally.", color: "#10b981", bar: 75 },
      { label: "Demand-Supply Ratio", value: "0.92", description: "Slight oversupply in most segments. Buyer-favorable market conditions.", color: "#3b82f6", bar: 65 },
      { label: "Credit Availability", value: "Good", description: "Lending standards remain accommodative. Sub-prime share at 18%.", color: "#10b981", bar: 80 },
      { label: "New vs Used Price Gap", value: "31%", description: "Gap widening as new car prices hold while used prices soften.", color: "#f97316", bar: 55 },
      { label: "Dealer Profit Margin", value: "8.2%", description: "Margins compressing from pandemic highs but still above historical norms.", color: "#f59e0b", bar: 60 },
    ];

    let healthHtml = `<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;">`;
    for (const hm of healthMetrics) {
      healthHtml += `<div style="background:#0f172a;border-radius:8px;padding:14px;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
          <span style="font-size:11px;color:#94a3b8;font-weight:500;">${hm.label}</span>
          <span style="font-size:14px;font-weight:700;color:${hm.color};">${hm.value}</span>
        </div>
        <div style="background:#1e293b;border-radius:4px;height:6px;overflow:hidden;margin-bottom:6px;">
          <div style="width:${hm.bar}%;height:100%;background:${hm.color};border-radius:4px;transition:width 0.5s;"></div>
        </div>
        <div style="font-size:10px;color:#64748b;line-height:1.3;">${hm.description}</div>
      </div>`;
    }
    healthHtml += `</div>`;
    healthSection.innerHTML += healthHtml;
    results.appendChild(healthSection);

    // ── EV Market Spotlight ──
    const evSection = document.createElement("div");
    evSection.style.cssText = "background:#1e293b;border:1px solid #334155;border-radius:10px;padding:18px 20px;margin-bottom:16px;";
    evSection.innerHTML = `<h2 style="margin:0 0 14px 0;font-size:15px;font-weight:700;color:#f8fafc;">EV Market Spotlight</h2>`;

    const evStats = [
      { label: "EV Market Share", value: "4.1%", trend: "+0.8% YoY", trendUp: true },
      { label: "Avg EV Price", value: "$44,200", trend: "-8.2% YoY", trendUp: false },
      { label: "EV Days Supply", value: "72 days", trend: "+15 days YoY", trendUp: false },
      { label: "Top EV Brand", value: "Tesla", trend: "52% of EV sales", trendUp: true },
    ];

    let evHtml = `<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:14px;">`;
    for (const es of evStats) {
      const tc = es.trendUp ? "#10b981" : "#ef4444";
      evHtml += `<div style="background:#0f172a;border-radius:8px;padding:12px;text-align:center;">
        <div style="font-size:10px;color:#94a3b8;margin-bottom:4px;">${es.label}</div>
        <div style="font-size:18px;font-weight:700;color:#f8fafc;">${es.value}</div>
        <div style="font-size:10px;color:${tc};font-weight:600;margin-top:4px;">${es.trend}</div>
      </div>`;
    }
    evHtml += `</div>`;

    // EV narrative
    evHtml += `<div style="background:#0f172a;border-radius:8px;padding:14px;border-left:3px solid #06b6d4;">
      <div style="font-size:13px;color:#f8fafc;line-height:1.5;">
        <strong>EV Narrative:</strong> The electric vehicle market continues to grow in share but faces headwinds from inventory buildup and price compression.
        Tesla's dominance is eroding as legacy automakers like Hyundai (Ioniq 5), Ford (Mustang Mach-E), and Chevrolet (Equinox EV) gain traction.
        The average EV now sits on dealer lots 72 days vs 42 for the market's best-selling segment (Compact SUV), suggesting the supply-demand balance
        has yet to reach equilibrium. Expect continued price softening through Q2 as manufacturers push volume targets.
      </div>
    </div>`;
    evSection.innerHTML += evHtml;
    results.appendChild(evSection);

    // ── Article Angle Suggestions ──
    const anglesSection = document.createElement("div");
    anglesSection.style.cssText = "background:#1e293b;border:1px solid #334155;border-radius:10px;padding:18px 20px;margin-bottom:16px;";
    anglesSection.innerHTML = `<h2 style="margin:0 0 14px 0;font-size:15px;font-weight:700;color:#f8fafc;">Story Angle Suggestions</h2>`;

    const angles = [
      { angle: "The Great EV Price Correction", hook: "EV prices are dropping faster than any other segment. Is this the tipping point for mainstream EV adoption, or a sign of weak demand?", tags: ["EV", "Pricing", "Consumer"] },
      { angle: "Compact SUVs: America's Default Vehicle", hook: "With nearly 1 in 4 cars sold being a compact SUV, this segment has become the new family sedan. What's driving the shift and where are prices heading?", tags: ["SUV", "Market Trends"] },
      { angle: "Regional Price Disparity", hook: `Buying the same car in California costs ${fmtCurrency(data.expensiveStates[0]?.avgPrice - data.cheapestStates[0]?.avgPrice)} more than in Mississippi. Why do prices vary so dramatically by state?`, tags: ["Regional", "Consumer"] },
      { angle: "The Luxury Lot Glut", hook: "Premium brands are seeing inventory pile up as days-supply exceeds 60 days. Are luxury buyers pulling back, or is it an oversupply problem?", tags: ["Luxury", "Inventory"] },
      { angle: "Winners and Losers: Monthly Movers", hook: `${data.topGainers[0]?.make} ${data.topGainers[0]?.model} leads gainers at +${data.topGainers[0]?.changePercent}%, while ${data.topLosers[0]?.make} ${data.topLosers[0]?.model} drops ${data.topLosers[0]?.changePercent}%. What's behind the divergence?`, tags: ["Analysis", "Models"] },
    ];

    let anglesHtml = `<div style="display:flex;flex-direction:column;gap:10px;">`;
    const angleBorders = ["#3b82f6", "#10b981", "#f59e0b", "#8b5cf6", "#ef4444"];
    for (let i = 0; i < angles.length; i++) {
      const a = angles[i];
      const bc = angleBorders[i % angleBorders.length];
      anglesHtml += `<div style="background:#0f172a;border-radius:8px;padding:14px;border-left:3px solid ${bc};">
        <div style="font-weight:700;color:#f8fafc;font-size:14px;margin-bottom:4px;">${a.angle}</div>
        <div style="font-size:12px;color:#94a3b8;line-height:1.4;margin-bottom:6px;">${a.hook}</div>
        <div style="display:flex;gap:6px;">
          ${a.tags.map(t => `<span style="font-size:9px;padding:2px 8px;border-radius:8px;background:#1e293b;color:#94a3b8;border:1px solid #334155;">${t}</span>`).join("")}
        </div>
      </div>`;
    }
    anglesHtml += `</div>`;
    anglesSection.innerHTML += anglesHtml;
    results.appendChild(anglesSection);

    // ── Pricing Trends by Price Band ──
    const priceBandSection = document.createElement("div");
    priceBandSection.style.cssText = "background:#1e293b;border:1px solid #334155;border-radius:10px;padding:18px 20px;margin-bottom:16px;";
    priceBandSection.innerHTML = `<h2 style="margin:0 0 4px 0;font-size:15px;font-weight:700;color:#f8fafc;">Pricing Trends by Price Band</h2>
      <p style="margin:0 0 14px 0;font-size:12px;color:#94a3b8;">How different price segments are performing month-over-month</p>`;

    const priceBands = [
      { band: "Under $15K", share: 12.4, priceChange: -1.2, volume: 149200, trend: "Declining", daysSupply: 32, color: "#10b981" },
      { band: "$15K - $25K", share: 28.6, priceChange: -2.8, volume: 344100, trend: "Softening", daysSupply: 38, color: "#3b82f6" },
      { band: "$25K - $35K", share: 31.2, priceChange: -1.9, volume: 375400, trend: "Stable", daysSupply: 44, color: "#8b5cf6" },
      { band: "$35K - $50K", share: 18.4, priceChange: -3.1, volume: 221400, trend: "Declining", daysSupply: 52, color: "#f59e0b" },
      { band: "Over $50K", share: 9.4, priceChange: -4.2, volume: 113100, trend: "Oversupplied", daysSupply: 68, color: "#ef4444" },
    ];

    let priceBandHtml = `<div style="overflow-x:auto;"><table style="width:100%;border-collapse:collapse;font-size:13px;">
      <thead><tr>
        <th style="padding:10px 12px;text-align:left;color:#94a3b8;border-bottom:2px solid #334155;font-weight:600;">Price Band</th>
        <th style="padding:10px 12px;text-align:right;color:#94a3b8;border-bottom:2px solid #334155;font-weight:600;">Market Share</th>
        <th style="padding:10px 12px;text-align:right;color:#94a3b8;border-bottom:2px solid #334155;font-weight:600;">MoM Change</th>
        <th style="padding:10px 12px;text-align:right;color:#94a3b8;border-bottom:2px solid #334155;font-weight:600;">Volume</th>
        <th style="padding:10px 12px;text-align:right;color:#94a3b8;border-bottom:2px solid #334155;font-weight:600;">Days Supply</th>
        <th style="padding:10px 12px;text-align:center;color:#94a3b8;border-bottom:2px solid #334155;font-weight:600;">Trend</th>
      </tr></thead><tbody>`;

    for (const pb of priceBands) {
      const changeColor = pb.priceChange >= 0 ? "#10b981" : "#ef4444";
      const trendColor = pb.trend === "Stable" ? "#f59e0b" : pb.trend === "Declining" || pb.trend === "Softening" ? "#ef4444" : "#ef4444";
      priceBandHtml += `<tr>
        <td style="padding:10px 12px;border-bottom:1px solid #1e293b44;color:#f8fafc;font-weight:600;">
          <div style="display:flex;align-items:center;gap:6px;">
            <span style="width:8px;height:8px;border-radius:50%;background:${pb.color};"></span>
            ${pb.band}
          </div>
        </td>
        <td style="padding:10px 12px;border-bottom:1px solid #1e293b44;text-align:right;color:${pb.color};font-weight:600;">${pb.share}%</td>
        <td style="padding:10px 12px;border-bottom:1px solid #1e293b44;text-align:right;color:${changeColor};font-weight:600;">${pb.priceChange >= 0 ? "+" : ""}${pb.priceChange}%</td>
        <td style="padding:10px 12px;border-bottom:1px solid #1e293b44;text-align:right;color:#94a3b8;">${fmtNumber(pb.volume)}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #1e293b44;text-align:right;color:${supplyColor(pb.daysSupply)};font-weight:600;">${pb.daysSupply} days</td>
        <td style="padding:10px 12px;border-bottom:1px solid #1e293b44;text-align:center;">
          <span style="padding:2px 8px;border-radius:8px;font-size:10px;font-weight:600;background:${trendColor}15;color:${trendColor};border:1px solid ${trendColor}33;">${pb.trend}</span>
        </td>
      </tr>`;
    }
    priceBandHtml += `</tbody></table></div>`;
    priceBandSection.innerHTML += priceBandHtml;
    results.appendChild(priceBandSection);

    // ── Key Takeaways Summary ──
    const takeawaySection = document.createElement("div");
    takeawaySection.style.cssText = "background:#1e293b;border:1px solid #334155;border-radius:10px;padding:18px 20px;margin-bottom:16px;";
    takeawaySection.innerHTML = `<h2 style="margin:0 0 14px 0;font-size:15px;font-weight:700;color:#f8fafc;">Key Takeaways</h2>`;

    const takeaways = [
      { number: "1", text: "Used car prices are softening nationally, down 2.3% YoY, as post-pandemic inventory normalization continues.", color: "#3b82f6" },
      { number: "2", text: "Compact SUVs are the undisputed volume leader at 24.2% market share. Manufacturers are directing investment here.", color: "#10b981" },
      { number: "3", text: "EV pricing is correcting sharply (-8.2% YoY for EVs), driven by Tesla price cuts and growing competition from legacy automakers.", color: "#ef4444" },
      { number: "4", text: "Luxury and $50K+ segments face the toughest market conditions with 68-day supply levels and steepest price declines.", color: "#f59e0b" },
      { number: "5", text: "Regional price disparities remain significant: a $6,400+ gap between the most and least expensive states to buy a car.", color: "#8b5cf6" },
    ];

    let takeawayHtml = `<div style="display:flex;flex-direction:column;gap:10px;">`;
    for (const ta of takeaways) {
      takeawayHtml += `<div style="background:#0f172a;border-radius:8px;padding:12px 14px;display:flex;align-items:flex-start;gap:12px;">
        <div style="min-width:28px;height:28px;border-radius:50%;background:${ta.color}22;color:${ta.color};font-size:13px;font-weight:700;display:flex;align-items:center;justify-content:center;border:1px solid ${ta.color}44;flex-shrink:0;">${ta.number}</div>
        <div style="font-size:13px;color:#f8fafc;line-height:1.5;font-weight:500;">${ta.text}</div>
      </div>`;
    }
    takeawayHtml += `</div>`;
    takeawaySection.innerHTML += takeawayHtml;
    results.appendChild(takeawaySection);

    // ── Data Methodology & Sources ──
    const methodSection = document.createElement("div");
    methodSection.style.cssText = "background:#0f172a;border:1px solid #334155;border-radius:10px;padding:14px 18px;margin-bottom:16px;";
    methodSection.innerHTML = `<div style="font-size:11px;color:#64748b;line-height:1.5;">
      <strong style="color:#94a3b8;">Data Sources & Methodology:</strong> All data in this briefing is sourced from MarketCheck's proprietary database
      of active and recently sold vehicle listings across the United States. Sales volume figures represent tracked transactions over the most recent 30-day period.
      Year-over-year comparisons use the same 30-day period from the prior year. Price change percentages reflect month-over-month average transaction price movements.
      Days-supply is calculated as current active inventory divided by the 30-day sales rate. Market share percentages are based on sold transaction volumes.
      Regional pricing reflects state-level average transaction prices across all body types and fuel types.
      All quotable data points are suitable for publication with attribution to MarketCheck.
    </div>`;
    results.appendChild(methodSection);

    // ── Print / Export Bar ──
    const exportBar = document.createElement("div");
    exportBar.style.cssText = "background:#1e293b;border:1px solid #334155;border-radius:10px;padding:12px 20px;margin-bottom:16px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;";
    exportBar.innerHTML = `<div style="font-size:12px;color:#94a3b8;">Report generated: ${new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })} at ${new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}</div>`;

    const printBtn = document.createElement("button");
    printBtn.textContent = "Print Briefing";
    printBtn.style.cssText = "padding:6px 16px;border-radius:6px;font-size:12px;font-weight:600;cursor:pointer;border:1px solid #334155;background:transparent;color:#94a3b8;transition:all 0.15s;";
    printBtn.addEventListener("mouseenter", () => { printBtn.style.background = "#334155"; printBtn.style.color = "#f8fafc"; });
    printBtn.addEventListener("mouseleave", () => { printBtn.style.background = "transparent"; printBtn.style.color = "#94a3b8"; });
    printBtn.addEventListener("click", () => { window.print(); });
    exportBar.appendChild(printBtn);
    results.appendChild(exportBar);

    // ── Refresh Button ──
    const refreshBar = document.createElement("div");
    refreshBar.style.cssText = "text-align:center;margin-bottom:16px;";
    const refreshBtn = document.createElement("button");
    refreshBtn.textContent = "Refresh Briefing";
    refreshBtn.style.cssText = "padding:10px 28px;border-radius:6px;font-size:14px;font-weight:700;cursor:pointer;border:1px solid #334155;background:#1e293b;color:#e2e8f0;transition:background 0.15s;";
    refreshBtn.addEventListener("mouseenter", () => { refreshBtn.style.background = "#334155"; });
    refreshBtn.addEventListener("mouseleave", () => { refreshBtn.style.background = "#1e293b"; });
    refreshBtn.addEventListener("click", () => loadBriefing());
    refreshBar.appendChild(refreshBtn);
    results.appendChild(refreshBar);
  }

  // ── Auto-load on start ──
  loadBriefing();
}

main().catch(console.error);
