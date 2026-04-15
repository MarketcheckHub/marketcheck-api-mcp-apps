import { App } from "@modelcontextprotocol/ext-apps";

let _safeApp: any = null;
try { _safeApp = new App({ name: "rental-fleet-valuator" }); } catch {}

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
  const vins = (args.vins??"").split(",").map(v=>v.trim()).filter(Boolean);
  const results = await Promise.all(vins.map(async (vin) => {
    const [decode,prediction] = await Promise.all([_mcDecode(vin),_mcPredict({vin,dealer_type:"franchise",zip:args.zip})]);
    return {vin,decode,prediction};
  }));
  return {results};
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
    document.body.insertBefore(_db, document.body.firstChild);
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
    setTimeout(() => { document.getElementById("_mc_save")?.addEventListener("click", () => { const k = (document.getElementById("_mc_key_inp") as HTMLInputElement)?.value?.trim(); if (k) { localStorage.setItem("mc_api_key", k); location.reload(); } }); document.getElementById("_mc_clear")?.addEventListener("click", () => { localStorage.removeItem("mc_api_key"); localStorage.removeItem("mc_access_token"); location.reload(); }); }, 0);
    bar.appendChild(gear);
  }
  headerEl.appendChild(bar);
}
(function injectResponsiveStyles() { const s = document.createElement("style"); s.textContent = `@media(max-width:768px){body{font-size:13px!important}table{font-size:12px!important}th,td{padding:6px 8px!important}h1{font-size:18px!important}h2{font-size:15px!important}canvas{max-width:100%!important}input,select,button{font-size:14px!important}[style*="display:flex"][style*="gap"],[style*="display: flex"][style*="gap"]{flex-wrap:wrap!important}[style*="grid-template-columns: repeat"]{grid-template-columns:1fr!important}[style*="grid-template-columns:repeat"]{grid-template-columns:1fr!important}table{min-width:600px}[style*="width:35%"],[style*="width:40%"],[style*="width:25%"],[style*="width:50%"],[style*="width:60%"],[style*="width:65%"],[style*="width: 35%"],[style*="width: 40%"],[style*="width: 25%"],[style*="width: 50%"],[style*="width: 60%"],[style*="width: 65%"]{width:100%!important;min-width:0!important}}@media(max-width:480px){body{padding:8px!important}h1{font-size:16px!important}th,td{padding:4px 6px!important;font-size:11px!important}input,select{max-width:100%!important;width:100%!important;box-sizing:border-box!important}}`; document.head.appendChild(s); })();


// ── Types ──────────────────────────────────────────────────────────────
type RotationPriority = "ROTATE NOW" | "MONITOR" | "HOLD";
type Segment = "SUV" | "Sedan" | "Compact" | "Truck" | "Luxury" | "Other";

interface FleetVehicle {
  vin: string;
  year: number;
  make: string;
  model: string;
  segment: Segment;
  currentMiles: number;
  monthlyMileage: number;
  currentValue: number;
  value6mo: number;
  value12mo: number;
  value18mo: number;
  rotationPriority: RotationPriority;
  monthlyDepreciation: number;
  replacementCost: number;
  milesTo60K: number;
}

interface FleetResult {
  vehicles: FleetVehicle[];
  totalFleetValue: number;
  avgAge: number;
  avgUtilization: number;
  monthlyDepreciationBurn: number;
  vehiclesPastOptimal: number;
  segmentBreakdown: { segment: Segment; value: number; count: number; color: string }[];
}

// ── Constants ──────────────────────────────────────────────────────────
const BG = "#0f172a";
const SURFACE = "#1e293b";
const BORDER = "#334155";
const TEXT = "#e2e8f0";
const TEXT_SEC = "#94a3b8";
const TEXT_MUTED = "#64748b";
const ACCENT = "#3b82f6";
const RED = "#ef4444";
const GREEN = "#22c55e";
const YELLOW = "#eab308";
const ORANGE = "#f97316";
const CYAN = "#06b6d4";
const PURPLE = "#a78bfa";
const PINK = "#ec4899";

const SEGMENT_COLORS: Record<Segment, string> = {
  SUV: ACCENT, Sedan: CYAN, Compact: GREEN, Truck: ORANGE, Luxury: PURPLE, Other: TEXT_SEC,
};

const LINE_COLORS = ["#38bdf8", "#f472b6", "#a78bfa", "#34d399", "#fb923c", "#facc15", "#f87171", "#818cf8", "#2dd4bf", "#e879f9"];

// ── Utility ────────────────────────────────────────────────────────────
function fmt$(v: number): string { return "$" + v.toLocaleString("en-US", { maximumFractionDigits: 0 }); }
function fmtPct(v: number): string { return v.toFixed(1) + "%"; }
function fmtK(v: number): string { return (v / 1000).toFixed(0) + "K"; }

function getRotationBadge(priority: RotationPriority): { color: string; bg: string } {
  switch (priority) {
    case "ROTATE NOW": return { color: "#fef2f2", bg: RED };
    case "MONITOR": return { color: "#fefce8", bg: YELLOW };
    case "HOLD": return { color: "#f0fdf4", bg: GREEN };
  }
}

// ── Mock Data ──────────────────────────────────────────────────────────
const MOCK_FLEET_INPUT = [
  { vin: "4T1BF1FK5CU100001", currentMiles: 42000, monthlyMileage: 2200, make: "Toyota", model: "Camry", year: 2022, segment: "Sedan" as Segment, baseValue: 26500 },
  { vin: "2HGFC2F59MH200002", currentMiles: 55000, monthlyMileage: 2800, make: "Honda", model: "Civic", year: 2022, segment: "Compact" as Segment, baseValue: 22800 },
  { vin: "KNDCB3LC9L5300003", currentMiles: 38000, monthlyMileage: 1800, make: "Kia", model: "Sportage", year: 2023, segment: "SUV" as Segment, baseValue: 30200 },
  { vin: "5TDJZRFH8HS400004", currentMiles: 58000, monthlyMileage: 3000, make: "Toyota", model: "Highlander", year: 2022, segment: "SUV" as Segment, baseValue: 38500 },
  { vin: "1HGCV2F93PA500005", currentMiles: 22000, monthlyMileage: 1500, make: "Honda", model: "Accord", year: 2023, segment: "Sedan" as Segment, baseValue: 30800 },
  { vin: "3GNAXUEV5NL600006", currentMiles: 47000, monthlyMileage: 2500, make: "Chevrolet", model: "Equinox", year: 2022, segment: "SUV" as Segment, baseValue: 28600 },
  { vin: "2T1BURHE7HC700007", currentMiles: 61000, monthlyMileage: 2900, make: "Toyota", model: "Corolla", year: 2021, segment: "Compact" as Segment, baseValue: 19200 },
  { vin: "1FMCU9J94MU800008", currentMiles: 35000, monthlyMileage: 2000, make: "Ford", model: "Escape", year: 2023, segment: "SUV" as Segment, baseValue: 29400 },
  { vin: "19XFC2F58NE900009", currentMiles: 28000, monthlyMileage: 1600, make: "Honda", model: "CR-V", year: 2023, segment: "SUV" as Segment, baseValue: 33200 },
  { vin: "1G1YY22G965000010", currentMiles: 52000, monthlyMileage: 2600, make: "Chevrolet", model: "Malibu", year: 2021, segment: "Sedan" as Segment, baseValue: 21400 },
];

function generateMockFleetResult(): FleetResult {
  const vehicles: FleetVehicle[] = MOCK_FLEET_INPUT.map(v => {
    const deprPerMile = v.baseValue * 0.000008 + (v.currentMiles > 50000 ? 0.000004 * v.baseValue : 0);
    const currentValue = Math.round(v.baseValue - v.currentMiles * deprPerMile * 0.4);
    const milesAt6 = v.currentMiles + v.monthlyMileage * 6;
    const milesAt12 = v.currentMiles + v.monthlyMileage * 12;
    const milesAt18 = v.currentMiles + v.monthlyMileage * 18;

    const cliff60K = milesAt6 > 60000 ? 0.92 : 1;
    const cliff60K12 = milesAt12 > 60000 ? 0.88 : 1;
    const cliff60K18 = milesAt18 > 60000 ? 0.82 : 1;

    const value6mo = Math.round(currentValue * 0.95 * cliff60K);
    const value12mo = Math.round(currentValue * 0.89 * cliff60K12);
    const value18mo = Math.round(currentValue * 0.82 * cliff60K18);

    const monthlyDepr = Math.round((currentValue - value6mo) / 6);
    const milesTo60K = Math.max(0, 60000 - v.currentMiles);
    const monthsTo60K = milesTo60K > 0 ? milesTo60K / v.monthlyMileage : 0;

    let rotationPriority: RotationPriority;
    if (v.currentMiles >= 55000 || monthsTo60K < 3) {
      rotationPriority = "ROTATE NOW";
    } else if (v.currentMiles >= 40000 || monthsTo60K < 8) {
      rotationPriority = "MONITOR";
    } else {
      rotationPriority = "HOLD";
    }

    const replacementCost = Math.round(v.baseValue * 1.08);

    return {
      vin: v.vin, year: v.year, make: v.make, model: v.model, segment: v.segment,
      currentMiles: v.currentMiles, monthlyMileage: v.monthlyMileage,
      currentValue, value6mo, value12mo, value18mo,
      rotationPriority, monthlyDepreciation: monthlyDepr,
      replacementCost, milesTo60K,
    };
  });

  const totalFleetValue = vehicles.reduce((s, v) => s + v.currentValue, 0);
  const avgAge = 2.4;
  const avgUtilization = vehicles.reduce((s, v) => s + v.monthlyMileage, 0) / vehicles.length;
  const monthlyBurn = vehicles.reduce((s, v) => s + v.monthlyDepreciation, 0);
  const pastOptimal = vehicles.filter(v => v.rotationPriority === "ROTATE NOW").length;

  const segMap = new Map<Segment, { value: number; count: number }>();
  vehicles.forEach(v => {
    const cur = segMap.get(v.segment) || { value: 0, count: 0 };
    cur.value += v.currentValue; cur.count++;
    segMap.set(v.segment, cur);
  });
  const segmentBreakdown = Array.from(segMap.entries()).map(([seg, d]) => ({
    segment: seg, value: d.value, count: d.count, color: SEGMENT_COLORS[seg],
  }));

  return { vehicles, totalFleetValue, avgAge, avgUtilization, monthlyDepreciationBurn: monthlyBurn, vehiclesPastOptimal: pastOptimal, segmentBreakdown };
}

// ── Rendering ──────────────────────────────────────────────────────────
function renderHeader(): string {
  return `<div id="app-header" style="display:flex;align-items:center;gap:12px;margin-bottom:20px;">
    <div>
      <h1 style="font-size:22px;font-weight:700;color:${TEXT};margin:0;">Rental & Subscription Fleet Valuator</h1>
      <p style="font-size:12px;color:${TEXT_MUTED};margin:4px 0 0 0;">Mileage-adjusted fleet valuation with optimal rotation timing</p>
    </div>
  </div>`;
}

function renderFleetInput(): string {
  const defaultInput = MOCK_FLEET_INPUT.map(v => `${v.vin},${v.currentMiles},${v.monthlyMileage}`).join("\n");
  return `<div style="background:${SURFACE};border-radius:10px;padding:16px;margin-bottom:20px;border:1px solid ${BORDER};">
    <h3 style="color:${TEXT};font-size:14px;margin-bottom:10px;">Fleet Input</h3>
    <div style="display:flex;gap:12px;">
      <div style="flex:1;">
        <label style="font-size:11px;color:${TEXT_SEC};display:block;margin-bottom:4px;">Enter VINs with current miles and monthly mileage (VIN,CurrentMiles,MonthlyMileage)</label>
        <textarea id="fleet-input" rows="5" placeholder="4T1BF1FK5CU100001,42000,2200&#10;2HGFC2F59MH200002,55000,2800&#10;..." style="width:100%;background:${BG};border:1px solid ${BORDER};border-radius:6px;padding:10px;color:${TEXT};font-family:monospace;font-size:11px;resize:vertical;box-sizing:border-box;">${defaultInput}</textarea>
      </div>
    </div>
    <div style="display:flex;justify-content:space-between;align-items:center;margin-top:8px;">
      <div style="font-size:10px;color:${TEXT_MUTED};">Up to 15 vehicles supported</div>
      <button id="btn-valuate" style="padding:10px 24px;border-radius:6px;border:none;background:${ACCENT};color:#fff;font-weight:700;font-size:13px;cursor:pointer;">Valuate Fleet</button>
    </div>
  </div>`;
}

function renderFleetKPIs(data: FleetResult): string {
  const kpis = [
    { label: "Total Fleet Value", value: fmt$(data.totalFleetValue), color: ACCENT },
    { label: "Avg Age (years)", value: data.avgAge.toFixed(1), color: CYAN },
    { label: "Avg Monthly Miles", value: fmtK(data.avgUtilization) + " mi", color: PURPLE },
    { label: "Monthly Depr Burn", value: fmt$(data.monthlyDepreciationBurn), color: ORANGE },
    { label: "Past Optimal Hold", value: data.vehiclesPastOptimal.toString(), color: data.vehiclesPastOptimal > 0 ? RED : GREEN },
  ];
  return `<div style="display:grid;grid-template-columns:repeat(5,1fr);gap:12px;margin-bottom:20px;">
    ${kpis.map(k => `
      <div style="background:${SURFACE};border-radius:10px;padding:14px;text-align:center;border-left:4px solid ${k.color};border:1px solid ${BORDER};">
        <div style="font-size:10px;color:${TEXT_SEC};text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px;">${k.label}</div>
        <div style="font-size:20px;font-weight:700;color:${k.color};">${k.value}</div>
      </div>
    `).join("")}
  </div>`;
}

function renderVehicleCards(vehicles: FleetVehicle[]): string {
  const cards = vehicles.map(v => {
    const badge = getRotationBadge(v.rotationPriority);
    return `<div style="background:${SURFACE};border-radius:10px;padding:14px;border:1px solid ${BORDER};display:flex;flex-direction:column;gap:8px;">
      <div style="display:flex;justify-content:space-between;align-items:center;">
        <div style="font-size:14px;font-weight:700;color:${TEXT};">${v.year} ${v.make} ${v.model}</div>
        <span style="padding:3px 10px;border-radius:12px;font-size:9px;font-weight:700;color:${badge.color};background:${badge.bg};">${v.rotationPriority}</span>
      </div>
      <div style="font-size:10px;color:${TEXT_MUTED};font-family:monospace;">${v.vin.slice(0, 11)}...</div>
      <div style="display:flex;justify-content:space-between;font-size:12px;">
        <span style="color:${TEXT_SEC};">Current Value</span>
        <span style="color:${GREEN};font-weight:700;">${fmt$(v.currentValue)}</span>
      </div>
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:6px;background:${BG};border-radius:6px;padding:8px;">
        <div style="text-align:center;">
          <div style="font-size:9px;color:${TEXT_MUTED};">6 mo</div>
          <div style="font-size:12px;font-weight:600;color:${CYAN};">${fmt$(v.value6mo)}</div>
        </div>
        <div style="text-align:center;">
          <div style="font-size:9px;color:${TEXT_MUTED};">12 mo</div>
          <div style="font-size:12px;font-weight:600;color:${ORANGE};">${fmt$(v.value12mo)}</div>
        </div>
        <div style="text-align:center;">
          <div style="font-size:9px;color:${TEXT_MUTED};">18 mo</div>
          <div style="font-size:12px;font-weight:600;color:${RED};">${fmt$(v.value18mo)}</div>
        </div>
      </div>
      <div style="display:flex;justify-content:space-between;font-size:11px;">
        <span style="color:${TEXT_MUTED};">${fmtK(v.currentMiles)} mi | ${fmtK(v.monthlyMileage)}/mo</span>
        <span style="color:${v.milesTo60K < 5000 ? RED : v.milesTo60K < 15000 ? ORANGE : TEXT_SEC};">${fmtK(v.milesTo60K)} to 60K</span>
      </div>
    </div>`;
  }).join("");

  return `<div style="margin-bottom:20px;">
    <h3 style="color:${TEXT};font-size:14px;margin-bottom:12px;">Per-Vehicle Valuation</h3>
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:12px;">
      ${cards}
    </div>
  </div>`;
}

function drawDepreciationChart(canvasId: string, vehicles: FleetVehicle[]): void {
  const canvas = document.getElementById(canvasId) as HTMLCanvasElement;
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  ctx.scale(dpr, dpr);
  const W = rect.width;
  const H = rect.height;

  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, W, H);

  const pad = { top: 45, right: 160, bottom: 50, left: 65 };
  const plotW = W - pad.left - pad.right;
  const plotH = H - pad.top - pad.bottom;

  const months = [0, 6, 12, 18];
  const allValues = vehicles.flatMap(v => [v.currentValue, v.value6mo, v.value12mo, v.value18mo]);
  const maxVal = Math.max(...allValues) * 1.05;
  const minVal = Math.min(...allValues) * 0.85;

  function xPos(m: number): number { return pad.left + (m / 18) * plotW; }
  function yPos(val: number): number { return pad.top + plotH - ((val - minVal) / (maxVal - minVal)) * plotH; }

  // Grid
  ctx.strokeStyle = BORDER;
  ctx.lineWidth = 0.5;
  ctx.fillStyle = TEXT_MUTED;
  ctx.font = "11px system-ui";
  ctx.textAlign = "right";
  for (let i = 0; i <= 5; i++) {
    const val = minVal + (i / 5) * (maxVal - minVal);
    const y = yPos(val);
    ctx.beginPath(); ctx.moveTo(pad.left, y); ctx.lineTo(pad.left + plotW, y); ctx.stroke();
    ctx.fillText(fmt$(Math.round(val)), pad.left - 8, y + 4);
  }

  // X-axis labels
  ctx.textAlign = "center";
  months.forEach(m => {
    const x = xPos(m);
    ctx.fillStyle = TEXT_MUTED;
    ctx.fillText(m === 0 ? "Now" : `${m} mo`, x, pad.top + plotH + 20);
    ctx.strokeStyle = BORDER;
    ctx.beginPath(); ctx.moveTo(x, pad.top); ctx.lineTo(x, pad.top + plotH); ctx.stroke();
  });

  // Draw lines for each vehicle
  vehicles.forEach((v, i) => {
    const color = LINE_COLORS[i % LINE_COLORS.length];
    const values = [v.currentValue, v.value6mo, v.value12mo, v.value18mo];

    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    months.forEach((m, j) => {
      const x = xPos(m);
      const y = yPos(values[j]);
      if (j === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    });
    ctx.stroke();

    // Points
    months.forEach((m, j) => {
      const x = xPos(m);
      const y = yPos(values[j]);
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(x, y, 3, 0, Math.PI * 2);
      ctx.fill();
    });

    // Legend entry
    const legY = pad.top + i * 18;
    if (legY < pad.top + plotH) {
      ctx.fillStyle = color;
      ctx.fillRect(pad.left + plotW + 12, legY, 10, 3);
      ctx.fillStyle = TEXT_SEC;
      ctx.font = "10px system-ui";
      ctx.textAlign = "left";
      ctx.fillText(`${v.make} ${v.model}`, pad.left + plotW + 26, legY + 4);
    }
  });

  // 60K mile cliff indicator
  ctx.fillStyle = RED + "15";
  ctx.fillRect(pad.left, pad.top, plotW, plotH);
  ctx.fillStyle = BG;
  ctx.fillRect(pad.left, pad.top, plotW, plotH);

  // Title
  ctx.fillStyle = TEXT;
  ctx.font = "bold 13px system-ui";
  ctx.textAlign = "left";
  ctx.fillText("Depreciation Projection (18 months)", pad.left, pad.top - 16);
}

function renderRotationPriorityList(vehicles: FleetVehicle[]): string {
  const sorted = [...vehicles].sort((a, b) => a.milesTo60K - b.milesTo60K);
  const rows = sorted.map((v, i) => {
    const monthsToCliff = v.milesTo60K > 0 ? (v.milesTo60K / v.monthlyMileage).toFixed(1) : "0";
    const urgencyColor = v.milesTo60K < 5000 ? RED : v.milesTo60K < 15000 ? ORANGE : v.milesTo60K < 25000 ? YELLOW : GREEN;
    const badge = getRotationBadge(v.rotationPriority);
    return `<tr style="border-bottom:1px solid ${BORDER};">
      <td style="padding:8px 10px;color:${TEXT};font-weight:600;">${v.year} ${v.make} ${v.model}</td>
      <td style="padding:8px 10px;text-align:right;color:${TEXT_SEC};">${fmtK(v.currentMiles)} mi</td>
      <td style="padding:8px 10px;text-align:right;font-weight:700;color:${urgencyColor};">${fmtK(v.milesTo60K)} mi</td>
      <td style="padding:8px 10px;text-align:right;color:${TEXT_SEC};">${monthsToCliff} mo</td>
      <td style="padding:8px 10px;text-align:right;color:${ORANGE};">${fmt$(v.monthlyDepreciation)}/mo</td>
      <td style="padding:8px 10px;text-align:center;"><span style="padding:3px 10px;border-radius:12px;font-size:10px;font-weight:700;color:${badge.color};background:${badge.bg};">${v.rotationPriority}</span></td>
    </tr>`;
  }).join("");

  return `<div style="background:${SURFACE};border-radius:10px;padding:16px;margin-bottom:20px;border:1px solid ${BORDER};">
    <h3 style="color:${TEXT};font-size:14px;margin-bottom:12px;">Rotation Priority List (by value cliff proximity)</h3>
    <div style="overflow-x:auto;">
      <table style="width:100%;border-collapse:collapse;">
        <thead><tr style="border-bottom:2px solid ${BORDER};">
          <th style="padding:8px 10px;text-align:left;font-size:11px;color:${TEXT_MUTED};text-transform:uppercase;">Vehicle</th>
          <th style="padding:8px 10px;text-align:right;font-size:11px;color:${TEXT_MUTED};text-transform:uppercase;">Current Mi</th>
          <th style="padding:8px 10px;text-align:right;font-size:11px;color:${TEXT_MUTED};text-transform:uppercase;">To 60K Cliff</th>
          <th style="padding:8px 10px;text-align:right;font-size:11px;color:${TEXT_MUTED};text-transform:uppercase;">Months Left</th>
          <th style="padding:8px 10px;text-align:right;font-size:11px;color:${TEXT_MUTED};text-transform:uppercase;">Depr Rate</th>
          <th style="padding:8px 10px;text-align:center;font-size:11px;color:${TEXT_MUTED};text-transform:uppercase;">Priority</th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  </div>`;
}

function renderReplacementCostTracker(vehicles: FleetVehicle[]): string {
  const rows = vehicles.map(v => {
    const gap = v.replacementCost - v.currentValue;
    return `<tr style="border-bottom:1px solid ${BORDER};">
      <td style="padding:8px 10px;color:${TEXT};">${v.year} ${v.make} ${v.model}</td>
      <td style="padding:8px 10px;text-align:right;color:${GREEN};">${fmt$(v.currentValue)}</td>
      <td style="padding:8px 10px;text-align:right;color:${ACCENT};">${fmt$(v.replacementCost)}</td>
      <td style="padding:8px 10px;text-align:right;color:${gap > 10000 ? RED : ORANGE};">${fmt$(gap)}</td>
    </tr>`;
  }).join("");

  return `<div style="background:${SURFACE};border-radius:10px;padding:16px;margin-bottom:20px;border:1px solid ${BORDER};">
    <h3 style="color:${TEXT};font-size:14px;margin-bottom:12px;">Replacement Cost Tracker</h3>
    <div style="overflow-x:auto;">
      <table style="width:100%;border-collapse:collapse;">
        <thead><tr style="border-bottom:2px solid ${BORDER};">
          <th style="padding:8px 10px;text-align:left;font-size:11px;color:${TEXT_MUTED};text-transform:uppercase;">Vehicle</th>
          <th style="padding:8px 10px;text-align:right;font-size:11px;color:${TEXT_MUTED};text-transform:uppercase;">Current Value</th>
          <th style="padding:8px 10px;text-align:right;font-size:11px;color:${TEXT_MUTED};text-transform:uppercase;">Replacement Cost</th>
          <th style="padding:8px 10px;text-align:right;font-size:11px;color:${TEXT_MUTED};text-transform:uppercase;">Gap</th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  </div>`;
}

function drawDonutChart(canvasId: string, data: FleetResult): void {
  const canvas = document.getElementById(canvasId) as HTMLCanvasElement;
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  ctx.scale(dpr, dpr);
  const W = rect.width;
  const H = rect.height;

  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, W, H);

  const cx = W * 0.4;
  const cy = H / 2;
  const outerR = Math.min(cx - 20, cy - 40);
  const innerR = outerR * 0.55;
  const total = data.segmentBreakdown.reduce((s, seg) => s + seg.value, 0);

  let startAngle = -Math.PI / 2;
  data.segmentBreakdown.forEach(seg => {
    const sliceAngle = (seg.value / total) * Math.PI * 2;
    ctx.fillStyle = seg.color;
    ctx.beginPath();
    ctx.arc(cx, cy, outerR, startAngle, startAngle + sliceAngle);
    ctx.arc(cx, cy, innerR, startAngle + sliceAngle, startAngle, true);
    ctx.closePath();
    ctx.fill();
    startAngle += sliceAngle;
  });

  // Center text
  ctx.fillStyle = TEXT;
  ctx.font = "bold 18px system-ui";
  ctx.textAlign = "center";
  ctx.fillText(fmt$(total), cx, cy - 4);
  ctx.fillStyle = TEXT_MUTED;
  ctx.font = "11px system-ui";
  ctx.fillText("Total Fleet Value", cx, cy + 16);

  // Legend
  const legX = W * 0.7;
  data.segmentBreakdown.forEach((seg, i) => {
    const y = 50 + i * 28;
    ctx.fillStyle = seg.color;
    ctx.fillRect(legX, y, 14, 14);
    ctx.fillStyle = TEXT;
    ctx.font = "12px system-ui";
    ctx.textAlign = "left";
    ctx.fillText(`${seg.segment} (${seg.count})`, legX + 20, y + 11);
    ctx.fillStyle = TEXT_SEC;
    ctx.font = "11px system-ui";
    ctx.fillText(fmt$(seg.value), legX + 20, y + 26);
  });

  // Title
  ctx.fillStyle = TEXT;
  ctx.font = "bold 13px system-ui";
  ctx.textAlign = "left";
  ctx.fillText("Fleet Composition (by value)", 16, 24);
}

function renderMileageProjectionTable(vehicles: FleetVehicle[]): string {
  const rows = vehicles.map(v => {
    const mi6 = v.currentMiles + v.monthlyMileage * 6;
    const mi12 = v.currentMiles + v.monthlyMileage * 12;
    const mi18 = v.currentMiles + v.monthlyMileage * 18;
    const crosses60K = v.currentMiles < 60000 && mi18 > 60000;
    const monthTo60K = v.milesTo60K > 0 ? Math.round(v.milesTo60K / v.monthlyMileage * 10) / 10 : 0;
    const flag60K6 = mi6 > 60000 && v.currentMiles < 60000;
    const flag60K12 = mi12 > 60000 && mi6 < 60000;
    return `<tr style="border-bottom:1px solid ${BORDER};">
      <td style="padding:8px 10px;color:${TEXT};font-weight:600;">${v.year} ${v.make} ${v.model}</td>
      <td style="padding:8px 10px;text-align:right;color:${TEXT_SEC};">${fmtK(v.currentMiles)} mi</td>
      <td style="padding:8px 10px;text-align:right;color:${TEXT_SEC};">${fmtK(v.monthlyMileage)}/mo</td>
      <td style="padding:8px 10px;text-align:right;color:${flag60K6 ? RED : mi6 > 50000 ? ORANGE : TEXT_SEC};">${fmtK(mi6)}</td>
      <td style="padding:8px 10px;text-align:right;color:${flag60K12 ? RED : mi12 > 50000 ? ORANGE : TEXT_SEC};">${fmtK(mi12)}</td>
      <td style="padding:8px 10px;text-align:right;color:${mi18 > 60000 ? RED : mi18 > 50000 ? ORANGE : TEXT_SEC};">${fmtK(mi18)}</td>
      <td style="padding:8px 10px;text-align:center;color:${crosses60K ? ORANGE : TEXT_MUTED};">${crosses60K ? `${monthTo60K} mo` : v.currentMiles >= 60000 ? "Past" : "N/A"}</td>
    </tr>`;
  }).join("");

  return `<div style="background:${SURFACE};border-radius:10px;padding:16px;margin-bottom:20px;border:1px solid ${BORDER};">
    <h3 style="color:${TEXT};font-size:14px;margin-bottom:12px;">Mileage Projection Table</h3>
    <div style="overflow-x:auto;">
      <table style="width:100%;border-collapse:collapse;">
        <thead><tr style="border-bottom:2px solid ${BORDER};">
          <th style="padding:8px 10px;text-align:left;font-size:11px;color:${TEXT_MUTED};text-transform:uppercase;">Vehicle</th>
          <th style="padding:8px 10px;text-align:right;font-size:11px;color:${TEXT_MUTED};text-transform:uppercase;">Current</th>
          <th style="padding:8px 10px;text-align:right;font-size:11px;color:${TEXT_MUTED};text-transform:uppercase;">Rate</th>
          <th style="padding:8px 10px;text-align:right;font-size:11px;color:${TEXT_MUTED};text-transform:uppercase;">6 Mo</th>
          <th style="padding:8px 10px;text-align:right;font-size:11px;color:${TEXT_MUTED};text-transform:uppercase;">12 Mo</th>
          <th style="padding:8px 10px;text-align:right;font-size:11px;color:${TEXT_MUTED};text-transform:uppercase;">18 Mo</th>
          <th style="padding:8px 10px;text-align:center;font-size:11px;color:${TEXT_MUTED};text-transform:uppercase;">60K Cliff</th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  </div>`;
}

function renderFleetUtilizationAnalysis(vehicles: FleetVehicle[]): string {
  const avgMonthly = vehicles.reduce((s, v) => s + v.monthlyMileage, 0) / vehicles.length;
  const highUtil = vehicles.filter(v => v.monthlyMileage > 2500).length;
  const lowUtil = vehicles.filter(v => v.monthlyMileage < 1700).length;
  const totalDeprBurn = vehicles.reduce((s, v) => s + v.monthlyDepreciation, 0);
  const costPerMile = totalDeprBurn / vehicles.reduce((s, v) => s + v.monthlyMileage, 0);

  const cards = [
    { label: "Avg Monthly Mileage", value: fmtK(avgMonthly) + " mi", color: CYAN },
    { label: "High Utilization (>2.5K/mo)", value: highUtil.toString(), color: ORANGE },
    { label: "Low Utilization (<1.7K/mo)", value: lowUtil.toString(), color: YELLOW },
    { label: "Depr Cost per Mile", value: "$" + costPerMile.toFixed(2), color: PURPLE },
  ];

  const utilBars = vehicles.map(v => {
    const pct = Math.min(100, (v.monthlyMileage / 3500) * 100);
    const barColor = v.monthlyMileage > 2500 ? ORANGE : v.monthlyMileage > 2000 ? CYAN : GREEN;
    return `<div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;">
      <div style="width:130px;font-size:11px;color:${TEXT_SEC};text-align:right;white-space:nowrap;">${v.make} ${v.model}</div>
      <div style="flex:1;background:${BG};border-radius:4px;height:18px;position:relative;">
        <div style="width:${pct}%;height:100%;background:${barColor}44;border-radius:4px;border-left:3px solid ${barColor};"></div>
        <span style="position:absolute;right:6px;top:2px;font-size:10px;color:${TEXT_SEC};">${fmtK(v.monthlyMileage)}/mo</span>
      </div>
    </div>`;
  }).join("");

  return `<div style="background:${SURFACE};border-radius:10px;padding:16px;margin-bottom:20px;border:1px solid ${BORDER};">
    <h3 style="color:${TEXT};font-size:14px;margin-bottom:12px;">Fleet Utilization Analysis</h3>
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:16px;">
      ${cards.map(c => `
        <div style="background:${BG};border-radius:8px;padding:12px;text-align:center;">
          <div style="font-size:10px;color:${TEXT_MUTED};text-transform:uppercase;margin-bottom:4px;">${c.label}</div>
          <div style="font-size:18px;font-weight:700;color:${c.color};">${c.value}</div>
        </div>
      `).join("")}
    </div>
    <div style="padding:8px 0;">${utilBars}</div>
  </div>`;
}

function renderValueSummaryTable(vehicles: FleetVehicle[]): string {
  const totalCurrent = vehicles.reduce((s, v) => s + v.currentValue, 0);
  const total6mo = vehicles.reduce((s, v) => s + v.value6mo, 0);
  const total12mo = vehicles.reduce((s, v) => s + v.value12mo, 0);
  const total18mo = vehicles.reduce((s, v) => s + v.value18mo, 0);
  const drop6 = ((totalCurrent - total6mo) / totalCurrent) * 100;
  const drop12 = ((totalCurrent - total12mo) / totalCurrent) * 100;
  const drop18 = ((totalCurrent - total18mo) / totalCurrent) * 100;

  return `<div style="background:${SURFACE};border-radius:10px;padding:16px;margin-bottom:20px;border:1px solid ${BORDER};">
    <h3 style="color:${TEXT};font-size:14px;margin-bottom:12px;">Fleet Value Projections Summary</h3>
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;">
      <div style="background:${BG};border-radius:8px;padding:14px;text-align:center;">
        <div style="font-size:10px;color:${TEXT_MUTED};text-transform:uppercase;margin-bottom:6px;">Current Total</div>
        <div style="font-size:22px;font-weight:700;color:${GREEN};">${fmt$(totalCurrent)}</div>
      </div>
      <div style="background:${BG};border-radius:8px;padding:14px;text-align:center;">
        <div style="font-size:10px;color:${TEXT_MUTED};text-transform:uppercase;margin-bottom:6px;">6 Month Total</div>
        <div style="font-size:22px;font-weight:700;color:${CYAN};">${fmt$(total6mo)}</div>
        <div style="font-size:11px;color:${ORANGE};margin-top:4px;">-${fmtPct(drop6)}</div>
      </div>
      <div style="background:${BG};border-radius:8px;padding:14px;text-align:center;">
        <div style="font-size:10px;color:${TEXT_MUTED};text-transform:uppercase;margin-bottom:6px;">12 Month Total</div>
        <div style="font-size:22px;font-weight:700;color:${ORANGE};">${fmt$(total12mo)}</div>
        <div style="font-size:11px;color:${RED};margin-top:4px;">-${fmtPct(drop12)}</div>
      </div>
      <div style="background:${BG};border-radius:8px;padding:14px;text-align:center;">
        <div style="font-size:10px;color:${TEXT_MUTED};text-transform:uppercase;margin-bottom:6px;">18 Month Total</div>
        <div style="font-size:22px;font-weight:700;color:${RED};">${fmt$(total18mo)}</div>
        <div style="font-size:11px;color:${RED};margin-top:4px;">-${fmtPct(drop18)}</div>
      </div>
    </div>
  </div>`;
}

function renderLoading(): string {
  return `<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;padding:60px 20px;">
    <div style="width:48px;height:48px;border:4px solid ${BORDER};border-top:4px solid ${ACCENT};border-radius:50%;animation:spin 1s linear infinite;"></div>
    <div style="color:${TEXT_SEC};font-size:14px;margin-top:16px;">Valuating fleet...</div>
    <style>@keyframes spin { to { transform: rotate(360deg); } }</style>
  </div>`;
}

// ── Main Application ───────────────────────────────────────────────────
let currentData: FleetResult | null = null;

function parseFleetInput(): Array<{ vin: string; currentMiles: number; monthlyMileage: number }> {
  const textarea = document.getElementById("fleet-input") as HTMLTextAreaElement;
  if (!textarea) return [];
  return textarea.value.trim().split("\n").filter(Boolean).map(line => {
    const parts = line.trim().split(",");
    return {
      vin: parts[0]?.trim() || "",
      currentMiles: parseInt(parts[1]?.trim() || "0"),
      monthlyMileage: parseInt(parts[2]?.trim() || "2000"),
    };
  }).filter(v => v.vin.length >= 10).slice(0, 15);
}

async function loadData(): Promise<FleetResult> {
  const vehicles = parseFleetInput();
  if (vehicles.length === 0) return generateMockFleetResult();

  const result = await _callTool("value-rental-fleet", { vehicles });

  if (result?.content?.[0]?.text) {
    try {
      const parsed = JSON.parse(result.content[0].text);
      if (parsed.fleet && Array.isArray(parsed.fleet)) {
        const fleetVehicles: FleetVehicle[] = parsed.fleet.map((f: any) => {
          const decode = f.decode || {};
          const priceNow = f.priceNow?.predicted_price || 25000;
          const projs = f.projections || [];
          const val6 = projs.find((p: any) => p.months === 6)?.prediction?.predicted_price || priceNow * 0.94;
          const val12 = projs.find((p: any) => p.months === 12)?.prediction?.predicted_price || priceNow * 0.87;
          const val18 = projs.find((p: any) => p.months === 18)?.prediction?.predicted_price || priceNow * 0.80;

          const segment = categorizeSegment(decode.body_type);
          const milesTo60K = Math.max(0, 60000 - f.currentMiles);
          const monthsTo60K = milesTo60K > 0 ? milesTo60K / f.monthlyMileage : 0;

          let rotationPriority: RotationPriority;
          if (f.currentMiles >= 55000 || monthsTo60K < 3) rotationPriority = "ROTATE NOW";
          else if (f.currentMiles >= 40000 || monthsTo60K < 8) rotationPriority = "MONITOR";
          else rotationPriority = "HOLD";

          return {
            vin: f.vin, year: decode.year || 2022, make: decode.make || "Unknown",
            model: decode.model || "Unknown", segment,
            currentMiles: f.currentMiles, monthlyMileage: f.monthlyMileage,
            currentValue: Math.round(priceNow),
            value6mo: Math.round(val6), value12mo: Math.round(val12), value18mo: Math.round(val18),
            rotationPriority,
            monthlyDepreciation: Math.round((priceNow - val6) / 6),
            replacementCost: Math.round(priceNow * 1.12),
            milesTo60K,
          };
        });

        return buildFleetResult(fleetVehicles);
      }
    } catch {}
  }

  return generateMockFleetResult();
}

function categorizeSegment(bodyType: string | undefined): Segment {
  const bt = (bodyType || "").toLowerCase();
  if (bt.includes("suv") || bt.includes("crossover")) return "SUV";
  if (bt.includes("truck") || bt.includes("pickup")) return "Truck";
  if (bt.includes("compact") || bt.includes("hatchback")) return "Compact";
  if (bt.includes("sedan") || bt.includes("coupe")) return "Sedan";
  return "Other";
}

function buildFleetResult(vehicles: FleetVehicle[]): FleetResult {
  const totalFleetValue = vehicles.reduce((s, v) => s + v.currentValue, 0);
  const monthlyBurn = vehicles.reduce((s, v) => s + v.monthlyDepreciation, 0);
  const pastOptimal = vehicles.filter(v => v.rotationPriority === "ROTATE NOW").length;
  const avgUtil = vehicles.reduce((s, v) => s + v.monthlyMileage, 0) / vehicles.length;

  const segMap = new Map<Segment, { value: number; count: number }>();
  vehicles.forEach(v => {
    const cur = segMap.get(v.segment) || { value: 0, count: 0 };
    cur.value += v.currentValue; cur.count++;
    segMap.set(v.segment, cur);
  });
  const segmentBreakdown = Array.from(segMap.entries()).map(([seg, d]) => ({
    segment: seg, value: d.value, count: d.count, color: SEGMENT_COLORS[seg],
  }));

  return { vehicles, totalFleetValue, avgAge: 2.4, avgUtilization: avgUtil, monthlyDepreciationBurn: monthlyBurn, vehiclesPastOptimal: pastOptimal, segmentBreakdown };
}

function renderResults(data: FleetResult): void {
  const container = document.getElementById("results-container");
  if (!container) return;

  container.innerHTML = `
    ${renderFleetKPIs(data)}
    ${renderVehicleCards(data.vehicles)}
    <div style="background:${SURFACE};border-radius:10px;padding:16px;margin-bottom:20px;border:1px solid ${BORDER};">
      <canvas id="depr-chart" style="width:100%;height:360px;border-radius:8px;"></canvas>
    </div>
    ${renderRotationPriorityList(data.vehicles)}
    ${renderReplacementCostTracker(data.vehicles)}
    <div style="background:${SURFACE};border-radius:10px;padding:16px;margin-bottom:20px;border:1px solid ${BORDER};">
      <canvas id="donut-chart" style="width:100%;height:300px;border-radius:8px;"></canvas>
    </div>
  `;

  requestAnimationFrame(() => {
    drawDepreciationChart("depr-chart", data.vehicles);
    drawDonutChart("donut-chart", data);
  });
}

function initApp(): void {
  document.body.style.cssText = `margin:0;padding:20px;background:${BG};color:${TEXT};font-family:system-ui,-apple-system,sans-serif;min-height:100vh;`;

  document.body.innerHTML = `
    ${renderHeader()}
    ${renderFleetInput()}
    <div id="results-container">${renderLoading()}</div>
  `;

  const header = document.getElementById("app-header");
  if (header) _addSettingsBar(header);

  const valuateBtn = document.getElementById("btn-valuate");
  valuateBtn?.addEventListener("click", async () => {
    const container = document.getElementById("results-container");
    if (container) container.innerHTML = renderLoading();
    try {
      currentData = await loadData();
      renderResults(currentData);
    } catch {
      currentData = generateMockFleetResult();
      renderResults(currentData);
    }
  });

  (async () => {
    try {
      currentData = await loadData();
    } catch {
      currentData = generateMockFleetResult();
    }
    renderResults(currentData);
  })();
}

window.addEventListener("resize", () => {
  if (currentData) {
    requestAnimationFrame(() => {
      drawDepreciationChart("depr-chart", currentData!.vehicles);
      drawDonutChart("donut-chart", currentData!);
    });
  }
});

initApp();
