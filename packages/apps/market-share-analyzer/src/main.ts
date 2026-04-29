import { App } from "@modelcontextprotocol/ext-apps";

let _safeApp: any = null;
try { _safeApp = new App({ name: "market-share-analyzer" }); } catch {}

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
  if (_getAuth().value) return "live";
  if (_safeApp && window.parent !== window) return "mcp";
  return "demo";
}

function _getUrlParams(): Record<string, string> {
  const params = new URLSearchParams(location.search);
  const out: Record<string, string> = {};
  for (const k of ["state", "bodyType"]) {
    const v = params.get(k);
    if (v) out[k] = v;
  }
  return out;
}

const _MC = "https://api.marketcheck.com";

async function _mcApi(path: string, params: Record<string, any> = {}): Promise<any> {
  const auth = _getAuth();
  if (!auth.value) return null;
  const prefix = path.startsWith("/api/") ? "" : "/v2";
  const url = new URL(_MC + prefix + path);
  if (auth.mode === "api_key") url.searchParams.set("api_key", auth.value);
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== "") url.searchParams.set(k, String(v));
  }
  const headers: Record<string, string> = {};
  if (auth.mode === "oauth_token") headers["Authorization"] = "Bearer " + auth.value;
  const res = await fetch(url.toString(), { headers });
  if (!res.ok) throw new Error("MC API " + res.status);
  return res.json();
}

const _mcSold = (p: Record<string, any>) => _mcApi("/api/v1/sold-vehicles/summary", p);

// Silence the async "Method not found" rejection when not iframed inside an MCP host
try { Promise.resolve((_safeApp as any)?.connect?.()).catch(() => {}); } catch {}

// ── Responsive CSS ─────────────────────────────────────────────────────
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
      [style*="grid-template-columns: repeat"] { grid-template-columns: 1fr !important; }
      [style*="grid-template-columns:repeat"] { grid-template-columns: 1fr !important; }
      div[style*="overflow-x:auto"], div[style*="overflow-x: auto"] { -webkit-overflow-scrolling: touch; }
    }
    @media (max-width: 480px) {
      body { padding: 8px !important; }
      h1 { font-size: 16px !important; }
      input, select { width: 100% !important; box-sizing: border-box !important; }
    }
  `;
  document.head.appendChild(s);
})();

// ── Types ──────────────────────────────────────────────────────────────
type Momentum = "Gaining" | "Losing" | "Stable";

interface MakeShareRow {
  make: string;
  currentVolume: number;
  priorVolume: number;
  currentShare: number;       // percent of total US sold (current period)
  priorShare: number;
  bpsChange: number;          // basis points: (currentShare - priorShare) * 100
  momentum: Momentum;
}

interface SegmentRow {
  bodyType: string;
  volume: number;
  share: number;
}

interface DashboardData {
  makes: MakeShareRow[];
  segments: SegmentRow[];
}

function classifyMomentum(bps: number): Momentum {
  if (bps >= 10) return "Gaining";
  if (bps <= -10) return "Losing";
  return "Stable";
}

function momentumColor(m: Momentum): string {
  return m === "Gaining" ? "#22c55e" : m === "Losing" ? "#ef4444" : "#94a3b8";
}

function momentumBg(m: Momentum): string {
  return m === "Gaining" ? "rgba(34,197,94,0.15)" : m === "Losing" ? "rgba(239,68,68,0.15)" : "rgba(148,163,184,0.12)";
}

// ── Mock Data ──────────────────────────────────────────────────────────
function getMockData(): DashboardData {
  const makeSeed: { make: string; cur: number; pri: number }[] = [
    { make: "Toyota",     cur: 215000, pri: 208000 },
    { make: "Ford",       cur: 192000, pri: 198000 },
    { make: "Chevrolet",  cur: 178000, pri: 176000 },
    { make: "Honda",      cur: 168000, pri: 162000 },
    { make: "Nissan",     cur: 92000,  pri: 95000  },
    { make: "Hyundai",    cur: 88000,  pri: 81000  },
    { make: "Tesla",      cur: 84000,  pri: 71000  },
    { make: "Kia",        cur: 79000,  pri: 75000  },
    { make: "Jeep",       cur: 71000,  pri: 78000  },
    { make: "Ram",        cur: 64000,  pri: 67000  },
    { make: "Subaru",     cur: 62000,  pri: 60000  },
    { make: "GMC",        cur: 58000,  pri: 56000  },
    { make: "BMW",        cur: 54000,  pri: 52000  },
    { make: "Mercedes",   cur: 49000,  pri: 51000  },
    { make: "Mazda",      cur: 46000,  pri: 42000  },
    { make: "Lexus",      cur: 41000,  pri: 39000  },
    { make: "Audi",       cur: 39000,  pri: 38000  },
    { make: "Volkswagen", cur: 37000,  pri: 41000  },
    { make: "Acura",      cur: 31000,  pri: 30000  },
    { make: "Cadillac",   cur: 28000,  pri: 29000  },
    { make: "Buick",      cur: 24000,  pri: 25000  },
    { make: "Volvo",      cur: 22000,  pri: 21000  },
    { make: "Lincoln",    cur: 18000,  pri: 19000  },
    { make: "Infiniti",   cur: 16000,  pri: 18000  },
    { make: "Mitsubishi", cur: 14000,  pri: 16000  },
  ];
  const totalCur = makeSeed.reduce((s, m) => s + m.cur, 0);
  const totalPri = makeSeed.reduce((s, m) => s + m.pri, 0);
  const makes: MakeShareRow[] = makeSeed.map((m) => {
    const cs = (m.cur / totalCur) * 100;
    const ps = (m.pri / totalPri) * 100;
    const bps = Math.round((cs - ps) * 100);
    return {
      make: m.make,
      currentVolume: m.cur,
      priorVolume: m.pri,
      currentShare: cs,
      priorShare: ps,
      bpsChange: bps,
      momentum: classifyMomentum(bps),
    };
  });

  const segSeed: { bodyType: string; vol: number }[] = [
    { bodyType: "SUV",         vol: 412000 },
    { bodyType: "Truck",       vol: 318000 },
    { bodyType: "Sedan",       vol: 287000 },
    { bodyType: "Crossover",   vol: 246000 },
    { bodyType: "Hatchback",   vol: 62000  },
    { bodyType: "Coupe",       vol: 48000  },
    { bodyType: "Van",         vol: 41000  },
    { bodyType: "Convertible", vol: 18000  },
    { bodyType: "Wagon",       vol: 12000  },
  ];
  const segTotal = segSeed.reduce((s, x) => s + x.vol, 0);
  const segments: SegmentRow[] = segSeed.map((s) => ({
    bodyType: s.bodyType, volume: s.vol, share: (s.vol / segTotal) * 100,
  }));

  return { makes, segments };
}

// ── Live API Orchestration ─────────────────────────────────────────────
async function _fetchDirect(stateCode?: string): Promise<DashboardData> {
  // Step 1 (parallel): current + prior make rankings.
  // Sold Summary has no date param, so the prior call returns the same shape as
  // current — bps change will be 0 in live mode. Calls are kept structurally
  // identical per the spec's apiFlow.
  const [currentRes, priorRes] = await Promise.all([
    _mcSold({
      ranking_dimensions: "make",
      ranking_measure: "sold_count",
      ranking_order: "desc",
      top_n: 25,
      inventory_type: "Used",
      state: stateCode,
    }),
    _mcSold({
      ranking_dimensions: "make",
      ranking_measure: "sold_count",
      ranking_order: "desc",
      top_n: 25,
      inventory_type: "Used",
      state: stateCode,
    }),
  ]);

  // Step 2: body_type segment breakdown.
  // Note: the original spec also called for a state-level geographic share via
  // ranking_dimensions=state, but the MarketCheck API only allows ranking_dimensions
  // values of body_type, dealership_group_name, make, model. The geographic-share
  // panel was removed because the API does not support that dimension.
  const segmentRes = await _mcSold({
    ranking_dimensions: "body_type",
    ranking_measure: "sold_count",
    ranking_order: "desc",
    inventory_type: "Used",
    state: stateCode,
  });

  const rowsOf = (r: any): any[] => r?.data ?? r?.rankings ?? r?.results ?? [];

  // Build prior-volume lookup keyed by make
  const priorByMake: Record<string, number> = {};
  for (const x of rowsOf(priorRes)) {
    const k = String(x.make ?? x.dimension_value ?? "").trim();
    if (k) priorByMake[k] = Number(x.sold_count) || 0;
  }
  const totalCurrent = rowsOf(currentRes).reduce((s, x: any) => s + (Number(x.sold_count) || 0), 0) || 1;
  const totalPrior = rowsOf(priorRes).reduce((s, x: any) => s + (Number(x.sold_count) || 0), 0) || 1;

  const makes: MakeShareRow[] = rowsOf(currentRes)
    .map((x: any) => {
      const make = String(x.make ?? x.dimension_value ?? "").trim();
      const cur = Number(x.sold_count) || 0;
      const pri = priorByMake[make] ?? 0;
      const cs = (cur / totalCurrent) * 100;
      const ps = (pri / totalPrior) * 100;
      const bps = Math.round((cs - ps) * 100);
      return {
        make,
        currentVolume: cur,
        priorVolume: pri,
        currentShare: cs,
        priorShare: ps,
        bpsChange: bps,
        momentum: classifyMomentum(bps),
      };
    })
    .filter((m) => m.make);

  const segTotal = rowsOf(segmentRes).reduce((s, x: any) => s + (Number(x.sold_count) || 0), 0) || 1;
  const segments: SegmentRow[] = rowsOf(segmentRes)
    .map((x: any) => {
      const bodyType = String(x.body_type ?? x.dimension_value ?? "").trim();
      const volume = Number(x.sold_count) || 0;
      return { bodyType, volume, share: (volume / segTotal) * 100 };
    })
    .filter((s) => s.bodyType);

  return { makes, segments };
}

// ── State ──────────────────────────────────────────────────────────────
const _urlParams = _getUrlParams();
let state = {
  stateCode: _urlParams.state ?? "",
  bodyTypeFilter: _urlParams.bodyType ?? "",
  data: null as DashboardData | null,
  loading: false,
  error: null as string | null,
};

async function loadData(): Promise<void> {
  state.loading = true;
  state.error = null;
  render();
  try {
    const mode = _detectAppMode();
    if (mode === "live") {
      state.data = await _fetchDirect(state.stateCode || undefined);
    } else {
      state.data = getMockData();
    }
  } catch (err: any) {
    state.error = err?.message ?? "Failed to load data";
    state.data = null;
  } finally {
    state.loading = false;
    render();
  }
}

// ── Canvas helpers ────────────────────────────────────────────────────
function setupCanvas(canvas: HTMLCanvasElement, w: number, h: number): CanvasRenderingContext2D | null {
  const dpr = window.devicePixelRatio || 1;
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  canvas.style.width = `${w}px`;
  canvas.style.height = `${h}px`;
  const ctx = canvas.getContext("2d");
  ctx?.scale(dpr, dpr);
  return ctx;
}

function drawScatter(canvas: HTMLCanvasElement, makes: MakeShareRow[]): void {
  const w = 720, h = 360;
  const ctx = setupCanvas(canvas, w, h);
  if (!ctx) return;
  ctx.clearRect(0, 0, w, h);
  if (makes.length === 0) return;

  const padL = 56, padR = 24, padT = 20, padB = 44;
  const plotW = w - padL - padR;
  const plotH = h - padT - padB;

  const volumes = makes.map((m) => Math.max(1, m.currentVolume));
  const logMin = Math.log10(Math.min(...volumes));
  const logMax = Math.log10(Math.max(...volumes));
  const logRange = (logMax - logMin) || 1;

  const shares = makes.map((m) => m.currentShare);
  const minShare = 0;
  const maxShare = Math.max(...shares) * 1.1 || 1;

  const xOf = (v: number) => padL + ((Math.log10(Math.max(1, v)) - logMin) / logRange) * plotW;
  const yOf = (s: number) => padT + (1 - (s - minShare) / (maxShare - minShare)) * plotH;

  // Grid
  ctx.strokeStyle = "rgba(148,163,184,0.08)";
  ctx.lineWidth = 1;
  for (let i = 0; i <= 4; i++) {
    const y = padT + (i / 4) * plotH;
    ctx.beginPath(); ctx.moveTo(padL, y); ctx.lineTo(padL + plotW, y); ctx.stroke();
    const x = padL + (i / 4) * plotW;
    ctx.beginPath(); ctx.moveTo(x, padT); ctx.lineTo(x, padT + plotH); ctx.stroke();
  }

  // Axis labels
  ctx.fillStyle = "#94a3b8";
  ctx.font = "10px -apple-system, BlinkMacSystemFont, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("Sold Volume (log scale)", padL + plotW / 2, h - 10);
  ctx.save();
  ctx.translate(14, padT + plotH / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.fillText("Market Share %", 0, 0);
  ctx.restore();

  // Y tick labels
  ctx.textAlign = "right";
  for (let i = 0; i <= 4; i++) {
    const v = minShare + (1 - i / 4) * (maxShare - minShare);
    const y = padT + (i / 4) * plotH;
    ctx.fillStyle = "#64748b";
    ctx.fillText(`${v.toFixed(1)}%`, padL - 6, y + 3);
  }
  // X tick labels (log)
  ctx.textAlign = "center";
  for (let i = 0; i <= 4; i++) {
    const logVal = logMin + (i / 4) * logRange;
    const v = Math.pow(10, logVal);
    const x = padL + (i / 4) * plotW;
    ctx.fillStyle = "#64748b";
    ctx.fillText(v >= 1000 ? `${Math.round(v / 1000)}k` : `${Math.round(v)}`, x, h - 26);
  }

  for (const m of makes) {
    const cx = xOf(m.currentVolume);
    const cy = yOf(m.currentShare);
    const color = momentumColor(m.momentum);
    ctx.fillStyle = color + "44";
    ctx.beginPath(); ctx.arc(cx, cy, 9, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = color;
    ctx.beginPath(); ctx.arc(cx, cy, 4, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#cbd5e1";
    ctx.font = "10px -apple-system, BlinkMacSystemFont, sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(m.make, cx + 6, cy - 6);
  }
}

// ── Rendering ──────────────────────────────────────────────────────────
function render(): void {
  document.body.innerHTML = "";

  const root = document.createElement("div");
  root.style.cssText = `
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    background: #0f172a; color: #e2e8f0; min-height: 100vh; padding: 20px;
  `;

  // ── Demo banner ──
  if (_detectAppMode() === "demo") {
    const _db = document.createElement("div");
    _db.style.cssText = "background:linear-gradient(135deg,#92400e22,#f59e0b11);border:1px solid #f59e0b44;border-radius:10px;padding:14px 20px;margin-bottom:14px;display:flex;align-items:center;gap:14px;flex-wrap:wrap;";
    _db.innerHTML = `
      <div style="flex:1;min-width:200px;">
        <div style="font-size:13px;font-weight:700;color:#fbbf24;margin-bottom:2px;">&#9888; Demo Mode — Showing sample data</div>
        <div style="font-size:12px;color:#d97706;">Enter your MarketCheck API key to see real market data. <a href="https://developers.marketcheck.com" target="_blank" style="color:#fbbf24;text-decoration:underline;">Get a free key</a></div>
      </div>
      <div style="display:flex;gap:8px;align-items:center;">
        <input id="_banner_key" type="text" placeholder="Paste your API key" style="padding:8px 12px;border-radius:6px;border:1px solid #f59e0b44;background:#0f172a;color:#e2e8f0;font-size:13px;width:220px;outline:none;" />
        <button id="_banner_save" style="padding:8px 16px;border-radius:6px;border:none;background:#f59e0b;color:#0f172a;font-size:12px;font-weight:700;cursor:pointer;white-space:nowrap;">Activate</button>
      </div>`;
    root.appendChild(_db);
    setTimeout(() => {
      const saveBtn = _db.querySelector("#_banner_save") as HTMLButtonElement | null;
      const inp = _db.querySelector("#_banner_key") as HTMLInputElement | null;
      saveBtn?.addEventListener("click", () => {
        const k = inp?.value.trim() ?? "";
        if (!k) return;
        localStorage.setItem("mc_api_key", k);
        _db.style.background = "linear-gradient(135deg,#05966922,#10b98111)";
        _db.style.borderColor = "#10b98144";
        _db.innerHTML = '<div style="font-size:13px;font-weight:700;color:#10b981;">&#10003; API key saved — reloading with live data...</div>';
        setTimeout(() => location.reload(), 800);
      });
      inp?.addEventListener("keydown", (e) => { if (e.key === "Enter") saveBtn?.click(); });
    }, 0);
  }

  // ── Header ──
  const header = document.createElement("div");
  header.style.cssText = "display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;padding-bottom:14px;border-bottom:1px solid rgba(148,163,184,0.15);gap:12px;flex-wrap:wrap;";
  const titleBlock = document.createElement("div");
  titleBlock.innerHTML = `
    <div style="font-size:22px;font-weight:700;color:#f1f5f9;margin-bottom:4px;">Market Share Analyzer</div>
    <div style="font-size:13px;color:#94a3b8;">Brand share with basis-point changes and conquest analysis</div>
  `;
  header.appendChild(titleBlock);

  const mode = _detectAppMode();
  const chipColors: Record<string, { bg: string; fg: string; label: string }> = {
    mcp: { bg: "#1e40af22", fg: "#60a5fa", label: "MCP" },
    live: { bg: "#05966922", fg: "#34d399", label: "LIVE" },
    demo: { bg: "#92400e88", fg: "#fbbf24", label: "DEMO" },
  };
  const c = chipColors[mode];
  const modeChip = document.createElement("div");
  modeChip.innerHTML = `<span style="padding:3px 10px;border-radius:10px;font-size:10px;font-weight:700;letter-spacing:0.5px;background:${c.bg};color:${c.fg};border:1px solid ${c.fg}33;">${c.label}</span>`;
  header.appendChild(modeChip);
  root.appendChild(header);

  // ── Input bar ──
  const inputBar = document.createElement("div");
  inputBar.style.cssText = "display:flex;align-items:center;gap:12px;background:#1e293b;border:1px solid rgba(148,163,184,0.15);border-radius:10px;padding:14px 18px;margin-bottom:18px;flex-wrap:wrap;";

  const stateLabel = document.createElement("label");
  stateLabel.textContent = "State";
  stateLabel.style.cssText = "font-size:13px;font-weight:600;color:#94a3b8;white-space:nowrap;";
  const stateInput = document.createElement("input");
  stateInput.type = "text";
  stateInput.value = state.stateCode;
  stateInput.placeholder = "(e.g. CA)";
  stateInput.maxLength = 2;
  stateInput.style.cssText = "background:#0f172a;color:#e2e8f0;border:1px solid rgba(148,163,184,0.25);border-radius:6px;padding:8px 12px;font-size:14px;width:90px;outline:none;text-transform:uppercase;";

  const bodyLabel = document.createElement("label");
  bodyLabel.textContent = "Body Type";
  bodyLabel.style.cssText = "font-size:13px;font-weight:600;color:#94a3b8;white-space:nowrap;";
  const bodyInput = document.createElement("input");
  bodyInput.type = "text";
  bodyInput.value = state.bodyTypeFilter;
  bodyInput.placeholder = "(e.g. SUV)";
  bodyInput.style.cssText = "background:#0f172a;color:#e2e8f0;border:1px solid rgba(148,163,184,0.25);border-radius:6px;padding:8px 12px;font-size:14px;width:140px;outline:none;";

  const analyzeBtn = document.createElement("button");
  analyzeBtn.textContent = state.loading ? "Loading..." : "Analyze";
  analyzeBtn.disabled = state.loading;
  analyzeBtn.style.cssText = `background:${state.loading ? "#1e40af" : "#3b82f6"};color:#fff;border:none;border-radius:6px;padding:8px 22px;font-size:14px;font-weight:600;cursor:${state.loading ? "wait" : "pointer"};`;
  analyzeBtn.addEventListener("click", () => {
    state.stateCode = stateInput.value.toUpperCase();
    state.bodyTypeFilter = bodyInput.value.trim();
    loadData();
  });

  inputBar.appendChild(stateLabel);
  inputBar.appendChild(stateInput);
  inputBar.appendChild(bodyLabel);
  inputBar.appendChild(bodyInput);
  inputBar.appendChild(analyzeBtn);
  root.appendChild(inputBar);

  // ── Error banner ──
  if (state.error) {
    const err = document.createElement("div");
    err.style.cssText = "background:rgba(239,68,68,0.1);border:1px solid rgba(239,68,68,0.3);border-radius:8px;padding:10px 14px;margin-bottom:14px;font-size:13px;color:#fca5a5;";
    err.textContent = `Live API failed: ${state.error}`;
    root.appendChild(err);
  }

  // ── Empty / loading state ──
  if (!state.data) {
    const empty = document.createElement("div");
    empty.style.cssText = "background:#1e293b;border:1px solid rgba(148,163,184,0.15);border-radius:10px;padding:60px 20px;text-align:center;";
    empty.innerHTML = state.loading
      ? `<div style="font-size:15px;color:#94a3b8;">Loading market share data...</div>`
      : `<div style="font-size:16px;color:#64748b;font-weight:500;">Click Analyze to load brand share, segment conquest, and geographic data</div>`;
    root.appendChild(empty);
    document.body.appendChild(root);
    return;
  }

  const { makes, segments } = state.data;

  // ── Brand Share Ranking Table ──
  const tableCard = document.createElement("div");
  tableCard.style.cssText = "background:#1e293b;border:1px solid rgba(148,163,184,0.15);border-radius:10px;margin-bottom:16px;overflow:hidden;";
  tableCard.innerHTML = `<div style="font-size:14px;font-weight:700;color:#f1f5f9;padding:16px 20px;border-bottom:1px solid rgba(148,163,184,0.1);">Brand Share Ranking — ${makes.length} makes</div>`;
  const tableWrap = document.createElement("div");
  tableWrap.style.cssText = "overflow-x:auto;";
  const table = document.createElement("table");
  table.style.cssText = "width:100%;border-collapse:collapse;";
  const thead = document.createElement("thead");
  const tr = document.createElement("tr");
  for (const h of ["Rank", "Make", "Volume", "Share", "Δ bps", "Momentum"]) {
    const th = document.createElement("th");
    th.textContent = h;
    th.style.cssText = `text-align:left;padding:10px 16px;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;color:#64748b;border-bottom:1px solid rgba(148,163,184,0.1);background:rgba(15,23,42,0.5);${h === "Momentum" ? "text-align:center;" : ""}${h === "Δ bps" ? "text-align:right;" : ""}`;
    tr.appendChild(th);
  }
  thead.appendChild(tr);
  table.appendChild(thead);
  const tbody = document.createElement("tbody");
  const sortedMakes = [...makes].sort((a, b) => b.currentVolume - a.currentVolume);
  for (let i = 0; i < sortedMakes.length; i++) {
    const m = sortedMakes[i];
    const row = document.createElement("tr");
    row.style.cssText = `border-bottom:1px solid rgba(148,163,184,0.06);${i % 2 === 1 ? "background:rgba(15,23,42,0.3);" : ""}`;
    const color = momentumColor(m.momentum);

    const tdRank = document.createElement("td");
    tdRank.textContent = `${i + 1}`;
    tdRank.style.cssText = "padding:10px 16px;font-size:13px;color:#64748b;font-variant-numeric:tabular-nums;";
    row.appendChild(tdRank);

    const tdMake = document.createElement("td");
    tdMake.textContent = m.make;
    tdMake.style.cssText = "padding:10px 16px;font-size:14px;font-weight:600;color:#f1f5f9;";
    row.appendChild(tdMake);

    const tdVol = document.createElement("td");
    tdVol.textContent = m.currentVolume.toLocaleString();
    tdVol.style.cssText = "padding:10px 16px;font-size:13px;color:#cbd5e1;font-variant-numeric:tabular-nums;";
    row.appendChild(tdVol);

    const tdShare = document.createElement("td");
    tdShare.textContent = `${m.currentShare.toFixed(2)}%`;
    tdShare.style.cssText = "padding:10px 16px;font-size:13px;font-weight:600;color:#e2e8f0;font-variant-numeric:tabular-nums;";
    row.appendChild(tdShare);

    const tdBps = document.createElement("td");
    const arrow = m.bpsChange > 0 ? "▲" : m.bpsChange < 0 ? "▼" : "·";
    tdBps.innerHTML = `<span style="color:${color};font-weight:600;">${arrow} ${m.bpsChange >= 0 ? "+" : ""}${m.bpsChange} bps</span>`;
    tdBps.style.cssText = "padding:10px 16px;font-size:13px;text-align:right;font-variant-numeric:tabular-nums;";
    row.appendChild(tdBps);

    const tdMom = document.createElement("td");
    tdMom.style.cssText = "padding:10px 16px;text-align:center;";
    tdMom.innerHTML = `<span style="display:inline-block;padding:3px 12px;border-radius:4px;font-size:11px;font-weight:700;letter-spacing:0.5px;color:${color};background:${momentumBg(m.momentum)};border:1px solid ${color}44;">${m.momentum.toUpperCase()}</span>`;
    row.appendChild(tdMom);

    tbody.appendChild(row);
  }
  table.appendChild(tbody);
  tableWrap.appendChild(table);
  tableCard.appendChild(tableWrap);
  root.appendChild(tableCard);

  // ── Volume vs Share Scatter ──
  const scatterCard = document.createElement("div");
  scatterCard.style.cssText = "background:#1e293b;border:1px solid rgba(148,163,184,0.15);border-radius:10px;padding:18px 20px;margin-bottom:16px;overflow-x:auto;";
  scatterCard.innerHTML = `<div style="font-size:14px;font-weight:700;color:#f1f5f9;margin-bottom:14px;">Volume vs Share — Color-Coded by Momentum</div>`;
  const scatterCanvas = document.createElement("canvas");
  scatterCanvas.style.cssText = "display:block;";
  scatterCard.appendChild(scatterCanvas);
  root.appendChild(scatterCard);
  requestAnimationFrame(() => drawScatter(scatterCanvas, makes));

  // ── Segment Conquest Matrix ──
  const segCard = document.createElement("div");
  segCard.style.cssText = "background:#1e293b;border:1px solid rgba(148,163,184,0.15);border-radius:10px;margin-bottom:16px;overflow:hidden;";
  segCard.innerHTML = `<div style="font-size:14px;font-weight:700;color:#f1f5f9;padding:16px 20px;border-bottom:1px solid rgba(148,163,184,0.1);">Segment Breakdown — ${segments.length} body types${state.bodyTypeFilter ? ` · highlighting "${state.bodyTypeFilter}"` : ""}</div>`;
  const segWrap = document.createElement("div");
  segWrap.style.cssText = "padding:14px 20px;";
  const maxSegVol = Math.max(...segments.map((s) => s.volume), 1);
  const sortedSegs = [...segments].sort((a, b) => b.volume - a.volume);
  for (const s of sortedSegs) {
    const isHighlighted = !!state.bodyTypeFilter && s.bodyType.toLowerCase() === state.bodyTypeFilter.toLowerCase();
    const row = document.createElement("div");
    row.style.cssText = `display:flex;align-items:center;gap:12px;padding:8px 0;${isHighlighted ? "background:rgba(59,130,246,0.08);border-radius:6px;padding:8px;" : ""}`;
    const label = document.createElement("div");
    label.textContent = s.bodyType;
    label.style.cssText = `width:120px;font-size:13px;color:${isHighlighted ? "#60a5fa" : "#e2e8f0"};font-weight:${isHighlighted ? "700" : "500"};`;
    const barTrack = document.createElement("div");
    barTrack.style.cssText = "flex:1;height:18px;background:rgba(148,163,184,0.1);border-radius:4px;overflow:hidden;";
    const barFill = document.createElement("div");
    const pct = (s.volume / maxSegVol) * 100;
    barFill.style.cssText = `height:100%;width:${pct}%;background:${isHighlighted ? "#60a5fa" : "#94a3b8"};border-radius:4px;`;
    barTrack.appendChild(barFill);
    const stats = document.createElement("div");
    stats.style.cssText = "width:160px;text-align:right;font-size:12px;color:#cbd5e1;font-variant-numeric:tabular-nums;";
    stats.innerHTML = `<span style="color:#f1f5f9;font-weight:600;">${s.volume.toLocaleString()}</span> · ${s.share.toFixed(1)}%`;
    row.appendChild(label);
    row.appendChild(barTrack);
    row.appendChild(stats);
    segWrap.appendChild(row);
  }
  segCard.appendChild(segWrap);
  root.appendChild(segCard);

  document.body.appendChild(root);
}

// ── Init ──────────────────────────────────────────────────────────────
render();
loadData();
