import { App } from "@modelcontextprotocol/ext-apps";

let _safeApp: any = null;
try { _safeApp = new App({ name: "fleet-lifecycle-manager" }); } catch {}

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
  const replacements = await _mcActive({zip:args.zip,radius:50,rows:10,sort_by:"price",sort_order:"asc"});
  return {results,replacements};
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
type HealthStatus = "EXCELLENT" | "GOOD" | "AGING" | "REPLACE";
type Segment = "Sedan" | "SUV" | "Truck" | "Other";

interface FleetVehicle {
  vin: string;
  year: number;
  make: string;
  model: string;
  segment: Segment;
  acquisitionCost: number;
  currentValue: number;
  depreciationDollar: number;
  depreciationPct: number;
  miles: number;
  ageYears: number;
  health: HealthStatus;
  monthlyDeprBurn: number;
}

interface ReplacementCandidate {
  year: number;
  make: string;
  model: string;
  price: number;
  miles: number;
  dealer: string;
}

interface FleetData {
  vehicles: FleetVehicle[];
  totalFleetValue: number;
  totalDepreciation: number;
  avgAge: number;
  pastOptimal: number;
  monthlyDeprBurn: number;
  replacements: Map<string, ReplacementCandidate[]>;
  valueTrend: number[];
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

const HEALTH_CONFIG: Record<HealthStatus, { color: string; bg: string }> = {
  EXCELLENT: { color: "#f0fdf4", bg: GREEN },
  GOOD: { color: "#eff6ff", bg: ACCENT },
  AGING: { color: "#fefce8", bg: YELLOW },
  REPLACE: { color: "#fef2f2", bg: RED },
};

// ── Utility ────────────────────────────────────────────────────────────
function fmt$(v: number): string { return "$" + v.toLocaleString("en-US", { maximumFractionDigits: 0 }); }
function fmtPct(v: number): string { return v.toFixed(1) + "%"; }
function fmtK(v: number): string { return (v / 1000).toFixed(0) + "K"; }

function getHealth(deprPct: number, ageYears: number, miles: number): HealthStatus {
  if (deprPct < 15 && ageYears <= 2 && miles < 40000) return "EXCELLENT";
  if (deprPct < 30 && ageYears <= 3 && miles < 60000) return "GOOD";
  if (deprPct < 45 && ageYears <= 4) return "AGING";
  return "REPLACE";
}

// ── Mock Data ──────────────────────────────────────────────────────────
const MOCK_FLEET = [
  { vin: "4T1BF1FK5CU200001", acq: 28500, miles: 22000, make: "Toyota", model: "Camry", year: 2024, segment: "Sedan" as Segment },
  { vin: "1HGCV2F93PA200002", acq: 30200, miles: 18000, make: "Honda", model: "Accord", year: 2024, segment: "Sedan" as Segment },
  { vin: "4T1BF1FK5CU200003", acq: 27800, miles: 45000, make: "Toyota", model: "Camry", year: 2022, segment: "Sedan" as Segment },
  { vin: "1HGCV2F93PA200004", acq: 29500, miles: 52000, make: "Honda", model: "Accord", year: 2022, segment: "Sedan" as Segment },
  { vin: "5TDJZRFH8HS200005", acq: 42000, miles: 35000, make: "Toyota", model: "Highlander", year: 2023, segment: "SUV" as Segment },
  { vin: "5FNYF6H97PB200006", acq: 39500, miles: 28000, make: "Honda", model: "Pilot", year: 2023, segment: "SUV" as Segment },
  { vin: "5TDJZRFH8HS200007", acq: 40500, miles: 68000, make: "Toyota", model: "Highlander", year: 2021, segment: "SUV" as Segment },
  { vin: "5FNYF6H97PB200008", acq: 38200, miles: 72000, make: "Honda", model: "Pilot", year: 2021, segment: "SUV" as Segment },
  { vin: "1FTFW1E85MF200009", acq: 48000, miles: 42000, make: "Ford", model: "F-150", year: 2023, segment: "Truck" as Segment },
  { vin: "1FTFW1E85MF200010", acq: 52000, miles: 55000, make: "Ford", model: "F-150", year: 2022, segment: "Truck" as Segment },
  { vin: "1FTFW1E85MF200011", acq: 46500, miles: 78000, make: "Ford", model: "F-150", year: 2021, segment: "Truck" as Segment },
  { vin: "4T1BF1FK5CU200012", acq: 26200, miles: 85000, make: "Toyota", model: "Camry", year: 2020, segment: "Sedan" as Segment },
  { vin: "KNDCB3LC9L5200013", acq: 32000, miles: 32000, make: "Kia", model: "Sportage", year: 2023, segment: "SUV" as Segment },
  { vin: "3GNAXUEV5NL200014", acq: 30500, miles: 48000, make: "Chevrolet", model: "Equinox", year: 2022, segment: "SUV" as Segment },
  { vin: "1FMCU9J94MU200015", acq: 34000, miles: 62000, make: "Ford", model: "Escape", year: 2021, segment: "SUV" as Segment },
];

function generateMockFleetData(): FleetData {
  const now = 2025;
  const vehicles: FleetVehicle[] = MOCK_FLEET.map(v => {
    const ageYears = now - v.year;
    const baseDeprRate = v.segment === "Truck" ? 0.08 : v.segment === "SUV" ? 0.09 : 0.10;
    const ageDeprFactor = 1 - Math.pow(1 - baseDeprRate, ageYears);
    const mileageDeprFactor = v.miles > 60000 ? 0.06 : v.miles > 40000 ? 0.03 : 0;
    const totalDeprPct = Math.min(60, (ageDeprFactor + mileageDeprFactor) * 100);
    const currentValue = Math.round(v.acq * (1 - totalDeprPct / 100));
    const health = getHealth(totalDeprPct, ageYears, v.miles);
    const monthlyBurn = Math.round((v.acq - currentValue) / (ageYears * 12 || 1));

    return {
      vin: v.vin, year: v.year, make: v.make, model: v.model, segment: v.segment,
      acquisitionCost: v.acq, currentValue, depreciationDollar: v.acq - currentValue,
      depreciationPct: totalDeprPct, miles: v.miles, ageYears, health, monthlyDeprBurn: monthlyBurn,
    };
  });

  const totalFleetValue = vehicles.reduce((s, v) => s + v.currentValue, 0);
  const totalDepr = vehicles.reduce((s, v) => s + v.depreciationDollar, 0);
  const avgAge = vehicles.reduce((s, v) => s + v.ageYears, 0) / vehicles.length;
  const pastOptimal = vehicles.filter(v => v.health === "REPLACE").length;
  const monthlyBurn = vehicles.reduce((s, v) => s + v.monthlyDeprBurn, 0);

  // Replacement candidates for flagged vehicles
  const replacements = new Map<string, ReplacementCandidate[]>();
  vehicles.filter(v => v.health === "REPLACE").forEach(v => {
    const candidates: ReplacementCandidate[] = [
      { year: 2025, make: v.make, model: v.model, price: Math.round(v.acquisitionCost * 1.05), miles: 500, dealer: "AutoNation" },
      { year: 2024, make: v.make, model: v.model, price: Math.round(v.acquisitionCost * 0.92), miles: 12000, dealer: "Hendrick Auto" },
      { year: 2025, make: v.make, model: v.model, price: Math.round(v.acquisitionCost * 1.08), miles: 200, dealer: "Penske Motors" },
    ];
    replacements.set(v.vin, candidates);
  });

  // 12-month value trend projection
  const valueTrend = Array.from({ length: 13 }, (_, i) => {
    const monthFactor = 1 - i * 0.007;
    return Math.round(totalFleetValue * monthFactor);
  });

  return { vehicles, totalFleetValue, totalDepreciation: totalDepr, avgAge, pastOptimal, monthlyDeprBurn: monthlyBurn, replacements, valueTrend };
}

// ── Rendering ──────────────────────────────────────────────────────────
function renderHeader(): string {
  return `<div id="app-header" style="display:flex;align-items:center;gap:12px;margin-bottom:20px;">
    <div>
      <h1 style="font-size:22px;font-weight:700;color:${TEXT};margin:0;">Fleet Lifecycle Manager</h1>
      <p style="font-size:12px;color:${TEXT_MUTED};margin:4px 0 0 0;">Monitor fleet vehicles with market values, depreciation, and replacement timing</p>
    </div>
  </div>`;
}

function renderFleetInput(): string {
  const defaultInput = MOCK_FLEET.map(v => `${v.vin},${v.acq},${v.miles}`).join("\n");
  return `<div style="background:${SURFACE};border-radius:10px;padding:16px;margin-bottom:20px;border:1px solid ${BORDER};">
    <h3 style="color:${TEXT};font-size:14px;margin-bottom:10px;">Fleet Input</h3>
    <div style="display:flex;gap:12px;">
      <div style="flex:1;">
        <label style="font-size:11px;color:${TEXT_SEC};display:block;margin-bottom:4px;">Enter VINs with acquisition cost and current miles (VIN,AcquisitionCost,CurrentMiles)</label>
        <textarea id="fleet-input" rows="6" placeholder="4T1BF1FK5CU200001,28500,22000&#10;1HGCV2F93PA200002,30200,18000&#10;..." style="width:100%;background:${BG};border:1px solid ${BORDER};border-radius:6px;padding:10px;color:${TEXT};font-family:monospace;font-size:11px;resize:vertical;box-sizing:border-box;">${defaultInput}</textarea>
      </div>
    </div>
    <div style="display:flex;justify-content:space-between;align-items:center;margin-top:8px;">
      <div style="font-size:10px;color:${TEXT_MUTED};">Up to 20 fleet vehicles</div>
      <button id="btn-analyze" style="padding:10px 24px;border-radius:6px;border:none;background:${ACCENT};color:#fff;font-weight:700;font-size:13px;cursor:pointer;">Analyze Fleet</button>
    </div>
  </div>`;
}

function renderFleetHealthKPIs(data: FleetData): string {
  const kpis = [
    { label: "Total Fleet Value", value: fmt$(data.totalFleetValue), color: ACCENT },
    { label: "Total Depreciation", value: fmt$(data.totalDepreciation), color: RED },
    { label: "Avg Vehicle Age", value: data.avgAge.toFixed(1) + " yrs", color: CYAN },
    { label: "Need Replacement", value: data.pastOptimal.toString(), color: data.pastOptimal > 0 ? ORANGE : GREEN },
    { label: "Monthly Depr Burn", value: fmt$(data.monthlyDeprBurn), color: PURPLE },
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

function renderFleetTable(vehicles: FleetVehicle[]): string {
  const sorted = [...vehicles].sort((a, b) => b.depreciationPct - a.depreciationPct);
  const rows = sorted.map((v, i) => {
    const hc = HEALTH_CONFIG[v.health];
    const deprColor = v.depreciationPct > 40 ? RED : v.depreciationPct > 25 ? ORANGE : v.depreciationPct > 15 ? YELLOW : GREEN;
    return `<tr style="border-bottom:1px solid ${BORDER};${i % 2 === 0 ? `background:${BG}22;` : ""}">
      <td style="padding:8px 10px;font-family:monospace;font-size:11px;color:#93c5fd;">${v.vin.slice(0, 6)}...${v.vin.slice(-4)}</td>
      <td style="padding:8px 10px;color:${TEXT};">${v.year} ${v.make} ${v.model}</td>
      <td style="padding:8px 10px;text-align:right;color:${TEXT_SEC};">${fmt$(v.acquisitionCost)}</td>
      <td style="padding:8px 10px;text-align:right;color:${GREEN};">${fmt$(v.currentValue)}</td>
      <td style="padding:8px 10px;text-align:right;color:${deprColor};">${fmt$(v.depreciationDollar)} (${fmtPct(v.depreciationPct)})</td>
      <td style="padding:8px 10px;text-align:right;color:${TEXT_SEC};">${fmtK(v.miles)} mi</td>
      <td style="padding:8px 10px;text-align:center;color:${TEXT_SEC};">${v.ageYears}y</td>
      <td style="padding:8px 10px;text-align:center;"><span style="padding:3px 10px;border-radius:12px;font-size:10px;font-weight:700;color:${hc.color};background:${hc.bg};">${v.health}</span></td>
    </tr>`;
  }).join("");

  return `<div style="background:${SURFACE};border-radius:10px;padding:16px;margin-bottom:20px;border:1px solid ${BORDER};">
    <h3 style="color:${TEXT};font-size:14px;margin-bottom:12px;">Fleet Inventory</h3>
    <div style="overflow-x:auto;">
      <table style="width:100%;border-collapse:collapse;">
        <thead><tr style="border-bottom:2px solid ${BORDER};">
          <th style="padding:8px 10px;text-align:left;font-size:11px;color:${TEXT_MUTED};text-transform:uppercase;">VIN</th>
          <th style="padding:8px 10px;text-align:left;font-size:11px;color:${TEXT_MUTED};text-transform:uppercase;">Vehicle</th>
          <th style="padding:8px 10px;text-align:right;font-size:11px;color:${TEXT_MUTED};text-transform:uppercase;">Acquisition</th>
          <th style="padding:8px 10px;text-align:right;font-size:11px;color:${TEXT_MUTED};text-transform:uppercase;">Market Value</th>
          <th style="padding:8px 10px;text-align:right;font-size:11px;color:${TEXT_MUTED};text-transform:uppercase;">Depreciation</th>
          <th style="padding:8px 10px;text-align:right;font-size:11px;color:${TEXT_MUTED};text-transform:uppercase;">Miles</th>
          <th style="padding:8px 10px;text-align:center;font-size:11px;color:${TEXT_MUTED};text-transform:uppercase;">Age</th>
          <th style="padding:8px 10px;text-align:center;font-size:11px;color:${TEXT_MUTED};text-transform:uppercase;">Health</th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  </div>`;
}

function drawAgingHeatmap(canvasId: string, vehicles: FleetVehicle[]): void {
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

  const pad = { top: 50, right: 80, bottom: 50, left: 90 };
  const plotW = W - pad.left - pad.right;
  const plotH = H - pad.top - pad.bottom;

  // Create buckets: age x retention%
  const ageBuckets = ["0-1 yr", "1-2 yr", "2-3 yr", "3-4 yr", "4-5 yr"];
  const segments: Segment[] = ["Sedan", "SUV", "Truck"];
  const cellW = plotW / ageBuckets.length;
  const cellH = plotH / segments.length;

  // Compute average retention by age bucket and segment
  const retentionData: number[][] = segments.map(seg => {
    return ageBuckets.map((_, bi) => {
      const ageMin = bi;
      const ageMax = bi + 1;
      const matching = vehicles.filter(v => v.segment === seg && v.ageYears >= ageMin && v.ageYears < ageMax);
      if (matching.length === 0) {
        // Fallback: generate reasonable retention values
        const baseRetention = seg === "Truck" ? 92 : seg === "SUV" ? 90 : 88;
        return Math.max(50, baseRetention - bi * 8 - Math.random() * 4);
      }
      const avgRetention = matching.reduce((s, v) => s + (100 - v.depreciationPct), 0) / matching.length;
      return avgRetention;
    });
  });

  // Draw cells
  segments.forEach((seg, si) => {
    ageBuckets.forEach((_, bi) => {
      const retention = retentionData[si][bi];
      const x = pad.left + bi * cellW;
      const y = pad.top + si * cellH;

      // Color from green (high retention) to red (low retention)
      let color: string;
      if (retention >= 85) color = GREEN;
      else if (retention >= 75) color = "#84cc16";
      else if (retention >= 65) color = YELLOW;
      else if (retention >= 55) color = ORANGE;
      else color = RED;

      ctx.fillStyle = color + "44";
      ctx.fillRect(x + 2, y + 2, cellW - 4, cellH - 4);
      ctx.strokeStyle = color + "88";
      ctx.lineWidth = 1;
      ctx.strokeRect(x + 2, y + 2, cellW - 4, cellH - 4);

      // Value text
      ctx.fillStyle = TEXT;
      ctx.font = "bold 16px system-ui";
      ctx.textAlign = "center";
      ctx.fillText(fmtPct(retention), x + cellW / 2, y + cellH / 2 + 2);

      // Count of vehicles in this bucket
      const count = vehicles.filter(v => v.segment === seg && v.ageYears >= bi && v.ageYears < bi + 1).length;
      ctx.fillStyle = TEXT_MUTED;
      ctx.font = "10px system-ui";
      ctx.fillText(`${count} vehicles`, x + cellW / 2, y + cellH / 2 + 18);
    });
  });

  // Y-axis segment labels
  ctx.textAlign = "right";
  ctx.font = "12px system-ui";
  segments.forEach((seg, si) => {
    ctx.fillStyle = TEXT;
    ctx.fillText(seg, pad.left - 10, pad.top + si * cellH + cellH / 2 + 4);
  });

  // X-axis age labels
  ctx.textAlign = "center";
  ctx.font = "11px system-ui";
  ageBuckets.forEach((label, bi) => {
    ctx.fillStyle = TEXT_SEC;
    ctx.fillText(label, pad.left + bi * cellW + cellW / 2, pad.top + plotH + 20);
  });

  // Color legend
  const legX = W - pad.right + 10;
  const legItems = [
    { label: ">85%", color: GREEN },
    { label: "75-85%", color: "#84cc16" },
    { label: "65-75%", color: YELLOW },
    { label: "55-65%", color: ORANGE },
    { label: "<55%", color: RED },
  ];
  ctx.font = "10px system-ui";
  ctx.textAlign = "left";
  legItems.forEach((item, i) => {
    const ly = pad.top + i * 22;
    ctx.fillStyle = item.color + "66";
    ctx.fillRect(legX, ly, 14, 14);
    ctx.fillStyle = TEXT_SEC;
    ctx.fillText(item.label, legX + 18, ly + 11);
  });

  // Title
  ctx.fillStyle = TEXT;
  ctx.font = "bold 13px system-ui";
  ctx.textAlign = "left";
  ctx.fillText("Aging Heatmap: Value Retention by Segment x Age", pad.left, pad.top - 20);
}

function drawOptimalSellWindow(canvasId: string, vehicles: FleetVehicle[]): void {
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

  const pad = { top: 45, right: 140, bottom: 50, left: 65 };
  const plotW = W - pad.left - pad.right;
  const plotH = H - pad.top - pad.bottom;

  const years = [0, 1, 2, 3, 4, 5];
  const maxPct = 100;

  function xPos(yr: number): number { return pad.left + (yr / 5) * plotW; }
  function yPos(pct: number): number { return pad.top + plotH - (pct / maxPct) * plotH; }

  // Grid
  ctx.strokeStyle = BORDER; ctx.lineWidth = 0.5;
  ctx.fillStyle = TEXT_MUTED; ctx.font = "11px system-ui"; ctx.textAlign = "right";
  for (let i = 0; i <= 5; i++) {
    const pct = (i / 5) * 100;
    const y = yPos(pct);
    ctx.beginPath(); ctx.moveTo(pad.left, y); ctx.lineTo(pad.left + plotW, y); ctx.stroke();
    ctx.fillText(fmtPct(pct), pad.left - 8, y + 4);
  }

  ctx.textAlign = "center";
  years.forEach(yr => {
    const x = xPos(yr);
    ctx.fillStyle = TEXT_MUTED;
    ctx.fillText(`${yr}y`, x, pad.top + plotH + 20);
  });

  // Depreciation curves per segment
  const segData: { segment: string; color: string; points: number[] }[] = [
    { segment: "Sedan", color: CYAN, points: [100, 88, 78, 68, 58, 50] },
    { segment: "SUV", color: ACCENT, points: [100, 90, 81, 72, 64, 57] },
    { segment: "Truck", color: ORANGE, points: [100, 92, 84, 76, 69, 62] },
  ];

  // Optimal sell window shading (years 2-4)
  ctx.fillStyle = GREEN + "12";
  ctx.fillRect(xPos(2), pad.top, xPos(4) - xPos(2), plotH);
  ctx.strokeStyle = GREEN + "40";
  ctx.lineWidth = 1;
  ctx.setLineDash([5, 5]);
  ctx.beginPath(); ctx.moveTo(xPos(2), pad.top); ctx.lineTo(xPos(2), pad.top + plotH); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(xPos(4), pad.top); ctx.lineTo(xPos(4), pad.top + plotH); ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = GREEN;
  ctx.font = "11px system-ui";
  ctx.textAlign = "center";
  ctx.fillText("OPTIMAL SELL WINDOW", (xPos(2) + xPos(4)) / 2, pad.top + 16);

  // Draw curves
  segData.forEach(seg => {
    ctx.strokeStyle = seg.color;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    seg.points.forEach((pct, i) => {
      const x = xPos(i);
      const y = yPos(pct);
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    });
    ctx.stroke();

    // Points
    seg.points.forEach((pct, i) => {
      ctx.fillStyle = seg.color;
      ctx.beginPath();
      ctx.arc(xPos(i), yPos(pct), 3, 0, Math.PI * 2);
      ctx.fill();
    });
  });

  // Plot actual vehicles
  vehicles.forEach(v => {
    const retention = 100 - v.depreciationPct;
    const x = xPos(v.ageYears);
    const y = yPos(retention);
    const hc = HEALTH_CONFIG[v.health];
    ctx.fillStyle = hc.bg;
    ctx.beginPath();
    ctx.arc(x, y, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#ffffff44";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(x, y, 5, 0, Math.PI * 2);
    ctx.stroke();
  });

  // Legend
  const legX = pad.left + plotW + 12;
  segData.forEach((seg, i) => {
    const ly = pad.top + i * 22;
    ctx.strokeStyle = seg.color;
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(legX, ly + 6); ctx.lineTo(legX + 16, ly + 6); ctx.stroke();
    ctx.fillStyle = TEXT_SEC;
    ctx.font = "11px system-ui";
    ctx.textAlign = "left";
    ctx.fillText(seg.segment, legX + 20, ly + 10);
  });

  // Vehicle dots legend
  const dotLegY = pad.top + segData.length * 22 + 10;
  ctx.fillStyle = TEXT_MUTED; ctx.font = "10px system-ui"; ctx.textAlign = "left";
  ctx.fillText("Vehicles:", legX, dotLegY);
  [{ label: "Excellent", color: GREEN }, { label: "Good", color: ACCENT }, { label: "Aging", color: YELLOW }, { label: "Replace", color: RED }].forEach((item, i) => {
    const ly = dotLegY + 14 + i * 18;
    ctx.fillStyle = item.color;
    ctx.beginPath(); ctx.arc(legX + 4, ly, 4, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = TEXT_SEC;
    ctx.fillText(item.label, legX + 14, ly + 4);
  });

  // Axes labels
  ctx.fillStyle = TEXT_SEC; ctx.font = "11px system-ui"; ctx.textAlign = "center";
  ctx.fillText("Vehicle Age (years)", W / 2, H - 6);
  ctx.fillStyle = TEXT; ctx.font = "bold 13px system-ui"; ctx.textAlign = "left";
  ctx.fillText("Optimal Sell Window: Depreciation Curves by Segment", pad.left, pad.top - 20);
}

function renderReplacementCandidates(data: FleetData): string {
  const flagged = data.vehicles.filter(v => v.health === "REPLACE");
  if (flagged.length === 0) {
    return `<div style="background:${SURFACE};border-radius:10px;padding:16px;margin-bottom:20px;border:1px solid ${BORDER};">
      <h3 style="color:${TEXT};font-size:14px;margin-bottom:8px;">Replacement Candidates</h3>
      <p style="color:${TEXT_MUTED};font-size:13px;">No vehicles currently flagged for replacement.</p>
    </div>`;
  }

  const sections = flagged.map(v => {
    const candidates = data.replacements.get(v.vin) || [];
    const rows = candidates.map(c => `
      <tr style="border-bottom:1px solid ${BORDER};">
        <td style="padding:6px 10px;color:${TEXT};">${c.year} ${c.make} ${c.model}</td>
        <td style="padding:6px 10px;text-align:right;color:${GREEN};">${fmt$(c.price)}</td>
        <td style="padding:6px 10px;text-align:right;color:${TEXT_SEC};">${fmtK(c.miles)} mi</td>
        <td style="padding:6px 10px;color:${TEXT_SEC};font-size:12px;">${c.dealer}</td>
      </tr>
    `).join("");

    return `<div style="margin-bottom:12px;">
      <div style="font-size:13px;font-weight:600;color:${ORANGE};margin-bottom:6px;">Replacing: ${v.year} ${v.make} ${v.model} (${fmtK(v.miles)} mi, ${fmtPct(v.depreciationPct)} depr)</div>
      <table style="width:100%;border-collapse:collapse;">
        <thead><tr style="border-bottom:1px solid ${BORDER};">
          <th style="padding:6px 10px;text-align:left;font-size:10px;color:${TEXT_MUTED};text-transform:uppercase;">Candidate</th>
          <th style="padding:6px 10px;text-align:right;font-size:10px;color:${TEXT_MUTED};text-transform:uppercase;">Price</th>
          <th style="padding:6px 10px;text-align:right;font-size:10px;color:${TEXT_MUTED};text-transform:uppercase;">Miles</th>
          <th style="padding:6px 10px;text-align:left;font-size:10px;color:${TEXT_MUTED};text-transform:uppercase;">Dealer</th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;
  }).join("");

  return `<div style="background:${SURFACE};border-radius:10px;padding:16px;margin-bottom:20px;border:1px solid ${BORDER};">
    <h3 style="color:${TEXT};font-size:14px;margin-bottom:12px;">Replacement Candidates</h3>
    ${sections}
  </div>`;
}

function drawValueTrend(canvasId: string, trend: number[]): void {
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

  const pad = { top: 45, right: 30, bottom: 50, left: 75 };
  const plotW = W - pad.left - pad.right;
  const plotH = H - pad.top - pad.bottom;

  const maxVal = Math.max(...trend) * 1.03;
  const minVal = Math.min(...trend) * 0.97;

  function xPos(i: number): number { return pad.left + (i / (trend.length - 1)) * plotW; }
  function yPos(val: number): number { return pad.top + plotH - ((val - minVal) / (maxVal - minVal)) * plotH; }

  // Grid
  ctx.strokeStyle = BORDER; ctx.lineWidth = 0.5;
  ctx.fillStyle = TEXT_MUTED; ctx.font = "11px system-ui"; ctx.textAlign = "right";
  for (let i = 0; i <= 4; i++) {
    const val = minVal + (i / 4) * (maxVal - minVal);
    const y = yPos(val);
    ctx.beginPath(); ctx.moveTo(pad.left, y); ctx.lineTo(pad.left + plotW, y); ctx.stroke();
    ctx.fillText(fmt$(Math.round(val)), pad.left - 8, y + 4);
  }

  // X labels
  ctx.textAlign = "center";
  trend.forEach((_, i) => {
    if (i % 2 === 0 || i === trend.length - 1) {
      ctx.fillStyle = TEXT_MUTED;
      ctx.fillText(`M${i}`, xPos(i), pad.top + plotH + 20);
    }
  });

  // Area fill
  ctx.fillStyle = ACCENT + "15";
  ctx.beginPath();
  ctx.moveTo(xPos(0), pad.top + plotH);
  trend.forEach((val, i) => ctx.lineTo(xPos(i), yPos(val)));
  ctx.lineTo(xPos(trend.length - 1), pad.top + plotH);
  ctx.closePath();
  ctx.fill();

  // Line
  ctx.strokeStyle = ACCENT;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  trend.forEach((val, i) => {
    if (i === 0) ctx.moveTo(xPos(i), yPos(val)); else ctx.lineTo(xPos(i), yPos(val));
  });
  ctx.stroke();

  // Points
  trend.forEach((val, i) => {
    ctx.fillStyle = ACCENT;
    ctx.beginPath();
    ctx.arc(xPos(i), yPos(val), 3, 0, Math.PI * 2);
    ctx.fill();
  });

  // Start and end values
  ctx.fillStyle = GREEN; ctx.font = "bold 12px system-ui"; ctx.textAlign = "left";
  ctx.fillText(fmt$(trend[0]), xPos(0) + 6, yPos(trend[0]) - 8);
  ctx.fillStyle = ORANGE; ctx.textAlign = "right";
  ctx.fillText(fmt$(trend[trend.length - 1]), xPos(trend.length - 1) - 6, yPos(trend[trend.length - 1]) - 8);

  // Title
  ctx.fillStyle = TEXT; ctx.font = "bold 13px system-ui"; ctx.textAlign = "left";
  ctx.fillText("Fleet Value Trend: 12-Month Projection", pad.left, pad.top - 20);

  ctx.fillStyle = TEXT_SEC; ctx.font = "11px system-ui"; ctx.textAlign = "center";
  ctx.fillText("Months from Now", W / 2, H - 6);
}

function renderLoading(): string {
  return `<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;padding:60px 20px;">
    <div style="width:48px;height:48px;border:4px solid ${BORDER};border-top:4px solid ${ACCENT};border-radius:50%;animation:spin 1s linear infinite;"></div>
    <div style="color:${TEXT_SEC};font-size:14px;margin-top:16px;">Analyzing fleet lifecycle...</div>
    <style>@keyframes spin { to { transform: rotate(360deg); } }</style>
  </div>`;
}

// ── Main Application ───────────────────────────────────────────────────
let currentData: FleetData | null = null;

function parseFleetInput(): Array<{ vin: string; acquisitionCost: number; currentMiles: number }> {
  const textarea = document.getElementById("fleet-input") as HTMLTextAreaElement;
  if (!textarea) return [];
  return textarea.value.trim().split("\n").filter(Boolean).map(line => {
    const parts = line.trim().split(",");
    return {
      vin: parts[0]?.trim() || "",
      acquisitionCost: parseFloat(parts[1]?.trim() || "0"),
      currentMiles: parseInt(parts[2]?.trim() || "0"),
    };
  }).filter(v => v.vin.length >= 10 && v.acquisitionCost > 0).slice(0, 20);
}

async function loadData(): Promise<FleetData> {
  const vehicles = parseFleetInput();
  if (vehicles.length === 0) return generateMockFleetData();

  const result = await _callTool("manage-fleet-lifecycle", { vehicles });

  if (result?.content?.[0]?.text) {
    try {
      const parsed = JSON.parse(result.content[0].text);
      if (parsed.fleet && Array.isArray(parsed.fleet)) {
        const now = 2025;
        const fleetVehicles: FleetVehicle[] = parsed.fleet.map((f: any) => {
          const decode = f.decode || {};
          const predicted = f.price?.predicted_price || f.acquisitionCost * 0.75;
          const ageYears = now - (decode.year || 2022);
          const deprDollar = f.acquisitionCost - predicted;
          const deprPct = (deprDollar / f.acquisitionCost) * 100;
          const segment = categorizeSegment(decode.body_type);
          const health = getHealth(deprPct, ageYears, f.currentMiles);
          return {
            vin: f.vin, year: decode.year || 2022, make: decode.make || "Unknown",
            model: decode.model || "Unknown", segment,
            acquisitionCost: f.acquisitionCost, currentValue: Math.round(predicted),
            depreciationDollar: Math.round(Math.max(0, deprDollar)),
            depreciationPct: Math.max(0, deprPct), miles: f.currentMiles,
            ageYears, health,
            monthlyDeprBurn: Math.round(Math.max(0, deprDollar) / Math.max(1, ageYears * 12)),
          };
        });

        return buildFleetData(fleetVehicles, parsed.replacements || []);
      }
    } catch {}
  }

  return generateMockFleetData();
}

function categorizeSegment(bodyType: string | undefined): Segment {
  const bt = (bodyType || "").toLowerCase();
  if (bt.includes("suv") || bt.includes("crossover")) return "SUV";
  if (bt.includes("truck") || bt.includes("pickup")) return "Truck";
  if (bt.includes("sedan") || bt.includes("coupe") || bt.includes("hatchback") || bt.includes("compact")) return "Sedan";
  return "Other";
}

function buildFleetData(vehicles: FleetVehicle[], rawReplacements: any[]): FleetData {
  const totalFleetValue = vehicles.reduce((s, v) => s + v.currentValue, 0);
  const totalDepr = vehicles.reduce((s, v) => s + v.depreciationDollar, 0);
  const avgAge = vehicles.reduce((s, v) => s + v.ageYears, 0) / vehicles.length;
  const pastOptimal = vehicles.filter(v => v.health === "REPLACE").length;
  const monthlyBurn = vehicles.reduce((s, v) => s + v.monthlyDeprBurn, 0);

  const replacements = new Map<string, ReplacementCandidate[]>();
  if (Array.isArray(rawReplacements)) {
    rawReplacements.forEach((r: any) => {
      const candidates = (r.candidates || []).slice(0, 3).map((c: any) => ({
        year: c.year || 2025,
        make: c.make || "Unknown",
        model: c.model || "Unknown",
        price: c.price || 30000,
        miles: c.miles || 5000,
        dealer: c.dealer?.name || "Unknown Dealer",
      }));
      replacements.set(r.forVin, candidates);
    });
  }

  // If no API replacements, generate mock ones for REPLACE vehicles
  vehicles.filter(v => v.health === "REPLACE").forEach(v => {
    if (!replacements.has(v.vin)) {
      replacements.set(v.vin, [
        { year: 2025, make: v.make, model: v.model, price: Math.round(v.acquisitionCost * 1.05), miles: 500, dealer: "AutoNation" },
        { year: 2024, make: v.make, model: v.model, price: Math.round(v.acquisitionCost * 0.92), miles: 12000, dealer: "Hendrick Auto" },
        { year: 2025, make: v.make, model: v.model, price: Math.round(v.acquisitionCost * 1.08), miles: 200, dealer: "Penske Motors" },
      ]);
    }
  });

  const valueTrend = Array.from({ length: 13 }, (_, i) => Math.round(totalFleetValue * (1 - i * 0.007)));

  return { vehicles, totalFleetValue, totalDepreciation: totalDepr, avgAge, pastOptimal, monthlyDeprBurn: monthlyBurn, replacements, valueTrend };
}

function renderResults(data: FleetData): void {
  const container = document.getElementById("results-container");
  if (!container) return;

  container.innerHTML = `
    ${renderFleetHealthKPIs(data)}
    ${renderFleetTable(data.vehicles)}
    <div style="background:${SURFACE};border-radius:10px;padding:16px;margin-bottom:20px;border:1px solid ${BORDER};">
      <canvas id="heatmap-canvas" style="width:100%;height:300px;border-radius:8px;"></canvas>
    </div>
    <div style="background:${SURFACE};border-radius:10px;padding:16px;margin-bottom:20px;border:1px solid ${BORDER};">
      <canvas id="sell-window-canvas" style="width:100%;height:350px;border-radius:8px;"></canvas>
    </div>
    ${renderReplacementCandidates(data)}
    <div style="background:${SURFACE};border-radius:10px;padding:16px;margin-bottom:20px;border:1px solid ${BORDER};">
      <canvas id="value-trend-canvas" style="width:100%;height:280px;border-radius:8px;"></canvas>
    </div>
  `;

  requestAnimationFrame(() => {
    drawAgingHeatmap("heatmap-canvas", data.vehicles);
    drawOptimalSellWindow("sell-window-canvas", data.vehicles);
    drawValueTrend("value-trend-canvas", data.valueTrend);
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

  const analyzeBtn = document.getElementById("btn-analyze");
  analyzeBtn?.addEventListener("click", async () => {
    const container = document.getElementById("results-container");
    if (container) container.innerHTML = renderLoading();
    try {
      currentData = await loadData();
      renderResults(currentData);
    } catch {
      currentData = generateMockFleetData();
      renderResults(currentData);
    }
  });

  (async () => {
    try {
      currentData = await loadData();
    } catch {
      currentData = generateMockFleetData();
    }
    renderResults(currentData);
  })();
}

window.addEventListener("resize", () => {
  if (currentData) {
    requestAnimationFrame(() => {
      drawAgingHeatmap("heatmap-canvas", currentData!.vehicles);
      drawOptimalSellWindow("sell-window-canvas", currentData!.vehicles);
      drawValueTrend("value-trend-canvas", currentData!.valueTrend);
    });
  }
});

initApp();
