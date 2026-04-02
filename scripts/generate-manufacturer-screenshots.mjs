#!/usr/bin/env node
/**
 * Generates professional placeholder screenshots for new manufacturer apps
 * using Puppeteer to render styled HTML and capture as PNG.
 */
import puppeteer from "puppeteer";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SCREENSHOTS_DIR = path.resolve(__dirname, "..", "static", "screenshots");

const APPS = [
  {
    id: "oem-depreciation-tracker",
    name: "OEM Depreciation Tracker",
    tagline: "How fast are your models losing value vs the competition?",
    icon: "&#9660;",
    color: "#ef4444",
    widgets: [
      { type: "chart", label: "Depreciation Curves", desc: "Your brand vs competitors over 36 months", chartType: "line" },
      { type: "table", label: "Model Residual Rankings", rows: ["Camry — 72% retained", "Accord — 69% retained", "Altima — 61% retained", "Civic — 74% retained", "Corolla — 76% retained"] },
      { type: "kpi", label: "Brand Avg Retention", value: "68%", delta: "-2.1%", deltaColor: "#ef4444" },
      { type: "kpi", label: "Segment Benchmark", value: "65%", delta: "+3pp above", deltaColor: "#22c55e" },
      { type: "heatmap", label: "Geographic Retention", desc: "State-level price retention heatmap" },
    ],
  },
  {
    id: "ev-transition-monitor",
    name: "EV Transition Monitor",
    tagline: "Track your electrification progress against the market",
    icon: "&#9889;",
    color: "#22c55e",
    widgets: [
      { type: "chart", label: "EV Mix % Trend", desc: "Your brand EV penetration over 12 months", chartType: "area" },
      { type: "table", label: "Competitor EV Leaderboard", rows: ["Tesla — 52.3% share", "Hyundai — 8.7% share", "Ford — 7.2% share", "Chevrolet — 6.8% share", "BMW — 5.1% share"] },
      { type: "kpi", label: "Your EV Mix", value: "12.4%", delta: "+3.2pp YoY", deltaColor: "#22c55e" },
      { type: "kpi", label: "Market EV Mix", value: "9.8%", delta: "+2.1pp YoY", deltaColor: "#22c55e" },
      { type: "heatmap", label: "State EV Adoption", desc: "Your brand's EV sales by state" },
    ],
  },
  {
    id: "model-contenting-analyzer",
    name: "Model Contenting Analyzer",
    tagline: "Which trims and configs are the market buying?",
    icon: "&#9881;",
    color: "#8b5cf6",
    widgets: [
      { type: "pie", label: "Trim Distribution", slices: ["SE — 34%", "XLE — 28%", "Limited — 22%", "TRD — 16%"] },
      { type: "bar", label: "Days on Market by Trim", bars: [{ name: "SE", val: 18 }, { name: "XLE", val: 24 }, { name: "Limited", val: 31 }, { name: "TRD", val: 42 }] },
      { type: "kpi", label: "Fastest Trim", value: "SE", delta: "18 avg DOM", deltaColor: "#22c55e" },
      { type: "kpi", label: "Slowest Trim", value: "TRD", delta: "42 avg DOM", deltaColor: "#ef4444" },
      { type: "table", label: "Supply vs Demand", rows: ["SE — Undersupplied", "XLE — Balanced", "Limited — Oversupplied", "TRD — Oversupplied"] },
    ],
  },
  {
    id: "market-momentum-report",
    name: "Market Momentum Report",
    tagline: "Monthly market pulse for strategic planning",
    icon: "&#9650;",
    color: "#0ea5e9",
    widgets: [
      { type: "kpiStrip", items: [
        { label: "Market Volume", value: "1.42M", delta: "+4.2%", deltaColor: "#22c55e" },
        { label: "Your Share", value: "14.8%", delta: "+0.3pp", deltaColor: "#22c55e" },
        { label: "Pricing Power", value: "102.1%", delta: "-0.4%", deltaColor: "#ef4444" },
        { label: "Days Supply", value: "52", delta: "+3 days", deltaColor: "#f59e0b" },
      ]},
      { type: "table", label: "Brand Momentum (MoM)", rows: ["Toyota +1.2pp", "Honda +0.6pp", "Hyundai +0.4pp", "Ford -0.3pp", "Nissan -0.8pp"] },
      { type: "chart", label: "Segment Mix Shift", desc: "SUV vs Sedan vs Truck volume trend", chartType: "stacked" },
      { type: "table", label: "Active Incentives", rows: ["$2,500 Cash Back — Camry", "1.9% APR / 60mo — RAV4", "$299/mo Lease — Corolla"] },
    ],
  },
  {
    id: "incentive-effectiveness-dashboard",
    name: "Incentive Effectiveness Dashboard",
    tagline: "Are your incentives moving metal?",
    icon: "&#36;",
    color: "#f59e0b",
    widgets: [
      { type: "matrix", label: "Model-Incentive Matrix", cols: ["Cash Back", "APR", "Lease"], rows: ["Camry — $2,500 | 1.9% | $299/mo", "RAV4 — $1,500 | 2.9% | $349/mo", "Highlander — $3,000 | — | —", "Corolla — $1,000 | 0.9% | $249/mo"] },
      { type: "kpi", label: "Avg DOM (w/ incentive)", value: "28 days", delta: "-12 days", deltaColor: "#22c55e" },
      { type: "kpi", label: "Avg DOM (no incentive)", value: "40 days", delta: "baseline", deltaColor: "#94a3b8" },
      { type: "table", label: "Recommendations", rows: ["Highlander — Increase support", "Camry — On track", "RAV4 — Reduce spend", "Corolla — On track"] },
    ],
  },
];

function renderWidget(w) {
  if (w.type === "kpi") {
    return `
      <div style="background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:20px;flex:1;min-width:160px;">
        <div style="font-size:11px;color:#64748b;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:8px;">${w.label}</div>
        <div style="font-size:32px;font-weight:800;color:#0f172a;line-height:1;">${w.value}</div>
        <div style="font-size:13px;font-weight:600;color:${w.deltaColor};margin-top:4px;">${w.delta}</div>
      </div>`;
  }
  if (w.type === "kpiStrip") {
    return `
      <div style="display:flex;gap:12px;grid-column:1/-1;">
        ${w.items.map(i => `
          <div style="background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:16px 20px;flex:1;">
            <div style="font-size:10px;color:#64748b;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px;">${i.label}</div>
            <div style="font-size:26px;font-weight:800;color:#0f172a;line-height:1;">${i.value}</div>
            <div style="font-size:12px;font-weight:600;color:${i.deltaColor};margin-top:4px;">${i.delta}</div>
          </div>`).join("")}
      </div>`;
  }
  if (w.type === "table" || w.type === "matrix") {
    return `
      <div style="background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:20px;min-width:280px;">
        <div style="font-size:12px;color:#64748b;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:12px;">${w.label}</div>
        ${(w.rows || []).map((r, i) => `<div style="padding:8px 0;border-top:${i > 0 ? "1px solid #f1f5f9" : "none"};font-size:13px;color:#334155;display:flex;align-items:center;gap:8px;">
          <span style="width:6px;height:6px;border-radius:50%;background:${i < 2 ? "#22c55e" : i < 3 ? "#f59e0b" : "#94a3b8"};flex-shrink:0;"></span>${r}
        </div>`).join("")}
      </div>`;
  }
  if (w.type === "chart") {
    const lines = w.chartType === "line" ? `
      <svg viewBox="0 0 300 100" style="width:100%;height:120px;">
        <polyline points="0,80 30,72 60,65 90,55 120,50 150,48 180,42 210,38 240,30 270,25 300,20" fill="none" stroke="#ef4444" stroke-width="2.5"/>
        <polyline points="0,75 30,70 60,68 90,60 120,58 150,52 180,50 210,45 240,42 270,38 300,35" fill="none" stroke="#3b82f6" stroke-width="2.5" stroke-dasharray="4,4"/>
        <polyline points="0,85 30,80 60,75 90,70 120,62 150,60 180,55 210,52 240,48 270,45 300,40" fill="none" stroke="#94a3b8" stroke-width="2" stroke-dasharray="2,3"/>
      </svg>` : w.chartType === "area" ? `
      <svg viewBox="0 0 300 100" style="width:100%;height:120px;">
        <defs><linearGradient id="ag" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#22c55e" stop-opacity="0.3"/><stop offset="100%" stop-color="#22c55e" stop-opacity="0.02"/></linearGradient></defs>
        <polygon points="0,90 30,85 60,78 90,70 120,62 150,55 180,48 210,42 240,38 270,32 300,28 300,100 0,100" fill="url(#ag)"/>
        <polyline points="0,90 30,85 60,78 90,70 120,62 150,55 180,48 210,42 240,38 270,32 300,28" fill="none" stroke="#22c55e" stroke-width="2.5"/>
      </svg>` : `
      <svg viewBox="0 0 300 100" style="width:100%;height:120px;">
        <rect x="10" y="30" width="35" height="70" rx="3" fill="#3b82f6" opacity="0.8"/><rect x="10" y="50" width="35" height="50" rx="3" fill="#0ea5e9" opacity="0.6"/>
        <rect x="55" y="25" width="35" height="75" rx="3" fill="#3b82f6" opacity="0.8"/><rect x="55" y="45" width="35" height="55" rx="3" fill="#0ea5e9" opacity="0.6"/>
        <rect x="100" y="20" width="35" height="80" rx="3" fill="#3b82f6" opacity="0.8"/><rect x="100" y="42" width="35" height="58" rx="3" fill="#0ea5e9" opacity="0.6"/>
        <rect x="145" y="35" width="35" height="65" rx="3" fill="#3b82f6" opacity="0.8"/><rect x="145" y="52" width="35" height="48" rx="3" fill="#0ea5e9" opacity="0.6"/>
        <rect x="190" y="28" width="35" height="72" rx="3" fill="#3b82f6" opacity="0.8"/><rect x="190" y="48" width="35" height="52" rx="3" fill="#0ea5e9" opacity="0.6"/>
        <rect x="235" y="22" width="35" height="78" rx="3" fill="#3b82f6" opacity="0.8"/><rect x="235" y="40" width="35" height="60" rx="3" fill="#0ea5e9" opacity="0.6"/>
      </svg>`;
    return `
      <div style="background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:20px;min-width:300px;flex:2;">
        <div style="font-size:12px;color:#64748b;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;">${w.label}</div>
        <div style="font-size:11px;color:#94a3b8;margin-bottom:8px;">${w.desc}</div>
        ${lines}
      </div>`;
  }
  if (w.type === "pie") {
    return `
      <div style="background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:20px;min-width:240px;">
        <div style="font-size:12px;color:#64748b;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:12px;">${w.label}</div>
        <svg viewBox="0 0 120 120" style="width:120px;height:120px;display:block;margin:0 auto 12px;">
          <circle cx="60" cy="60" r="50" fill="none" stroke="#8b5cf6" stroke-width="20" stroke-dasharray="107 207" stroke-dashoffset="-25" opacity="0.9"/>
          <circle cx="60" cy="60" r="50" fill="none" stroke="#a78bfa" stroke-width="20" stroke-dasharray="88 226" stroke-dashoffset="-132" opacity="0.7"/>
          <circle cx="60" cy="60" r="50" fill="none" stroke="#c4b5fd" stroke-width="20" stroke-dasharray="69 245" stroke-dashoffset="-220" opacity="0.5"/>
          <circle cx="60" cy="60" r="50" fill="none" stroke="#ddd6fe" stroke-width="20" stroke-dasharray="50 264" stroke-dashoffset="-289" opacity="0.4"/>
        </svg>
        ${w.slices.map((s, i) => `<div style="font-size:12px;color:#334155;padding:3px 0;display:flex;align-items:center;gap:6px;"><span style="width:8px;height:8px;border-radius:50%;background:${["#8b5cf6","#a78bfa","#c4b5fd","#ddd6fe"][i]};flex-shrink:0;"></span>${s}</div>`).join("")}
      </div>`;
  }
  if (w.type === "bar") {
    const maxVal = Math.max(...w.bars.map(b => b.val));
    return `
      <div style="background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:20px;min-width:260px;">
        <div style="font-size:12px;color:#64748b;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:12px;">${w.label}</div>
        ${w.bars.map(b => `
          <div style="margin-bottom:10px;">
            <div style="display:flex;justify-content:space-between;font-size:12px;color:#334155;margin-bottom:4px;"><span>${b.name}</span><span style="font-weight:600;">${b.val} days</span></div>
            <div style="height:8px;background:#f1f5f9;border-radius:4px;overflow:hidden;"><div style="width:${(b.val / maxVal) * 100}%;height:100%;background:${b.val < 25 ? "#22c55e" : b.val < 35 ? "#f59e0b" : "#ef4444"};border-radius:4px;"></div></div>
          </div>`).join("")}
      </div>`;
  }
  if (w.type === "heatmap") {
    return `
      <div style="background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:20px;min-width:280px;">
        <div style="font-size:12px;color:#64748b;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;">${w.label}</div>
        <div style="font-size:11px;color:#94a3b8;margin-bottom:12px;">${w.desc}</div>
        <div style="display:grid;grid-template-columns:repeat(10,1fr);gap:3px;">
          ${Array.from({length:50}, () => {
            const opacity = (Math.random() * 0.7 + 0.15).toFixed(2);
            return `<div style="aspect-ratio:1;border-radius:3px;background:rgba(239,68,68,${opacity});"></div>`;
          }).join("")}
        </div>
      </div>`;
  }
  return "";
}

function generateHTML(app) {
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700;800&display=swap');
* { margin:0; padding:0; box-sizing:border-box; }
body {
  font-family:'DM Sans',-apple-system,BlinkMacSystemFont,sans-serif;
  background:linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
  width:1280px; height:900px; overflow:hidden; padding:32px;
}
</style>
</head>
<body>
  <!-- Header -->
  <div style="display:flex;align-items:center;gap:16px;margin-bottom:24px;">
    <div style="width:48px;height:48px;border-radius:14px;background:${app.color};display:flex;align-items:center;justify-content:center;font-size:24px;color:#fff;font-weight:700;">${app.icon}</div>
    <div>
      <div style="font-size:24px;font-weight:800;color:#0f172a;line-height:1.2;">${app.name}</div>
      <div style="font-size:14px;color:#64748b;margin-top:2px;">${app.tagline}</div>
    </div>
    <div style="margin-left:auto;display:flex;gap:8px;">
      <span style="padding:5px 14px;border-radius:20px;font-size:11px;font-weight:700;background:${app.color}18;color:${app.color};border:1px solid ${app.color}33;letter-spacing:0.5px;">Manufacturer</span>
      <span style="padding:5px 14px;border-radius:20px;font-size:11px;font-weight:700;background:#f1f5f9;color:#64748b;border:1px solid #e2e8f0;">Enterprise API</span>
    </div>
  </div>

  <!-- Widgets -->
  <div style="display:flex;flex-wrap:wrap;gap:16px;align-items:flex-start;">
    ${app.widgets.map(w => renderWidget(w)).join("")}
  </div>

  <!-- Footer -->
  <div style="position:absolute;bottom:20px;left:32px;right:32px;display:flex;align-items:center;justify-content:space-between;">
    <div style="font-size:12px;color:#94a3b8;">Powered by MarketCheck APIs</div>
    <div style="font-size:12px;color:#cbd5e1;">apps.marketcheck.com</div>
  </div>
</body>
</html>`;
}

// ── Main ────────────────────────────────────────────────────────────────

async function main() {
  const browser = await puppeteer.launch({ headless: true, args: ["--no-sandbox"] });

  for (const app of APPS) {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 900 });
    await page.setContent(generateHTML(app), { waitUntil: "networkidle0" });
    // Wait for font load
    await new Promise(r => setTimeout(r, 1500));

    const outPath = path.join(SCREENSHOTS_DIR, `${app.id}.png`);
    await page.screenshot({ path: outPath, type: "png" });
    await page.close();
    console.log(`  ${app.id}.png`);
  }

  await browser.close();
  console.log(`\nGenerated ${APPS.length} manufacturer app screenshots.`);
}

main().catch(e => { console.error(e); process.exit(1); });
