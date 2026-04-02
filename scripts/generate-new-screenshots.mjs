#!/usr/bin/env node
/**
 * Generates placeholder screenshots for all new apps added from cowork plugins.
 */
import puppeteer from "puppeteer";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SCREENSHOTS_DIR = path.resolve(__dirname, "..", "static", "screenshots");

const APPS = [
  // ── Dealer ──
  {
    id: "deal-finder",
    name: "Deal Finder",
    tagline: "Best deals scored by price, DOM, and market position",
    icon: "&#9733;",
    color: "#f59e0b",
    widgets: [
      { type: "table", label: "Top Deals Found", rows: ["2022 Camry SE — $22,400 — Score: 92", "2023 Accord Sport — $24,100 — Score: 88", "2021 Civic EX — $19,800 — Score: 85", "2022 Altima SR — $20,200 — Score: 82", "2023 Corolla LE — $21,600 — Score: 79"] },
      { type: "kpi", label: "Best Deal Score", value: "92", delta: "Strong Buy", deltaColor: "#22c55e" },
      { type: "kpi", label: "Avg Market Delta", value: "-$2,400", delta: "Below market", deltaColor: "#22c55e" },
      { type: "chart", label: "Price vs Market Position", desc: "Deal candidates plotted against predicted fair price", chartType: "line" },
      { type: "table", label: "Negotiation Leverage", rows: ["127 DOM — price drop likely", "3 dealer hops — motivated seller", "23 comps below asking", "Supply/Demand: 1.8x"] },
    ],
  },
  // ── Dealership Group ──
  {
    id: "group-health-scorecard",
    name: "Group Health Scorecard",
    tagline: "0-100 health score per rooftop with alerts",
    icon: "&#9829;",
    color: "#f97316",
    widgets: [
      { type: "kpiStrip", items: [
        { label: "Downtown Toyota", value: "87", delta: "Healthy", deltaColor: "#22c55e" },
        { label: "Westside Honda", value: "64", delta: "Watch", deltaColor: "#f59e0b" },
        { label: "East Ford", value: "42", delta: "Concern", deltaColor: "#ef4444" },
        { label: "Group Avg", value: "71", delta: "Watch", deltaColor: "#f59e0b" },
      ]},
      { type: "table", label: "Score Breakdown — East Ford", rows: ["Aging penalty: -28 (45% over 60 DOM)", "DOM penalty: -18 (avg 53 days)", "Mix alignment: +8", "Floor plan burn: $12,400/mo"] },
      { type: "table", label: "Top 3 Group Actions", rows: ["1. Price 12 aged units at East Ford (-$38K burn)", "2. Transfer 5 SUVs Downtown → East", "3. Restock Westside with trucks (D/S 2.1x)"] },
    ],
  },
  // ── Analyst ──
  {
    id: "oem-stock-tracker",
    name: "OEM Stock Tracker",
    tagline: "Leading indicators for automotive tickers",
    icon: "&#9650;",
    color: "#8b5cf6",
    widgets: [
      { type: "kpiStrip", items: [
        { label: "F (Ford)", value: "BULLISH", delta: "+4.2% vol MoM", deltaColor: "#22c55e" },
        { label: "GM", value: "NEUTRAL", delta: "+0.8% vol MoM", deltaColor: "#94a3b8" },
        { label: "TM (Toyota)", value: "BULLISH", delta: "+2.1% share", deltaColor: "#22c55e" },
        { label: "TSLA", value: "CAUTION", delta: "-1.4% share", deltaColor: "#f59e0b" },
      ]},
      { type: "table", label: "Volume Momentum (MoM)", rows: ["Ford — 142K (+4.2%) BULLISH", "Toyota — 198K (+2.1%) BULLISH", "GM — 165K (+0.8%) NEUTRAL", "Tesla — 48K (-1.4%) CAUTION", "Stellantis — 89K (-3.1%) BEARISH"] },
      { type: "chart", label: "Pricing Power Index", desc: "Price-over-MSRP % by OEM (higher = stronger)", chartType: "stacked" },
    ],
  },
  {
    id: "pricing-power-tracker",
    name: "Pricing Power Tracker",
    tagline: "Discount-to-MSRP trends as margin signals",
    icon: "&#36;",
    color: "#8b5cf6",
    widgets: [
      { type: "chart", label: "Brand Pricing Power", desc: "Price-over-MSRP % — above 100% = selling above sticker", chartType: "stacked" },
      { type: "table", label: "Brand Rankings (MSRP Premium)", rows: ["Toyota — 103.2% (above sticker)", "Honda — 101.4% (above sticker)", "Ford — 98.7% (slight discount)", "Nissan — 95.1% (discounting)", "Stellantis — 91.8% (deep discount)"] },
      { type: "kpi", label: "Above Sticker", value: "34%", delta: "of brands", deltaColor: "#22c55e" },
      { type: "kpi", label: "Below Sticker", value: "66%", delta: "of brands", deltaColor: "#ef4444" },
    ],
  },
  {
    id: "market-share-analyzer",
    name: "Market Share Analyzer",
    tagline: "Brand share with basis-point changes",
    icon: "&#9670;",
    color: "#8b5cf6",
    widgets: [
      { type: "table", label: "Market Share Rankings", rows: ["Toyota — 15.2% (+32 bps)", "GM — 14.8% (-18 bps)", "Ford — 13.1% (+45 bps)", "Hyundai/Kia — 11.4% (+67 bps)", "Stellantis — 8.9% (-54 bps)"] },
      { type: "kpi", label: "Biggest Gainer", value: "Hyundai/Kia", delta: "+67 bps", deltaColor: "#22c55e" },
      { type: "kpi", label: "Biggest Loser", value: "Stellantis", delta: "-54 bps", deltaColor: "#ef4444" },
      { type: "chart", label: "Segment Conquest Analysis", desc: "Share shifts by body type (SUV, Sedan, Truck)", chartType: "stacked" },
      { type: "heatmap", label: "Geographic Share Heatmap", desc: "State-level brand share distribution" },
    ],
  },
  // ── Auction House ──
  {
    id: "auction-run-list-analyzer",
    name: "Auction Run List Analyzer",
    tagline: "Pre-sale VIN evaluation with hammer price predictions",
    icon: "&#9654;",
    color: "#84cc16",
    widgets: [
      { type: "table", label: "Run List Evaluation", rows: ["VIN ...9658 — Forte — $16,200 hammer — BUY", "VIN ...0001 — Accord — $21,800 hammer — BUY", "VIN ...3344 — Altima — $12,400 hammer — CAUTION", "VIN ...7721 — F-150 — $28,900 hammer — BUY", "VIN ...5512 — Malibu — $9,800 hammer — PASS"] },
      { type: "kpi", label: "Run List VINs", value: "24", delta: "evaluated", deltaColor: "#94a3b8" },
      { type: "kpi", label: "Expected Sell-Through", value: "78%", delta: "19 of 24", deltaColor: "#22c55e" },
      { type: "chart", label: "Retail vs Wholesale Spread", desc: "Expected margin per vehicle on run list", chartType: "stacked" },
    ],
  },
  {
    id: "consignment-sourcer",
    name: "Consignment Sourcer",
    tagline: "Find dealers with aged inventory ripe for consignment",
    icon: "&#9654;",
    color: "#84cc16",
    widgets: [
      { type: "table", label: "Consignment Prospects", rows: ["ABC Motors — 18 aged units — $4,200/mo burn", "Valley Auto — 12 aged units — $2,800/mo burn", "Quick Cars Inc — 9 aged units — $1,900/mo burn", "Metro Autos — 7 aged units — $1,400/mo burn"] },
      { type: "kpi", label: "Dealers Found", value: "14", delta: "in 75mi radius", deltaColor: "#94a3b8" },
      { type: "kpi", label: "Total Aged Units", value: "87", delta: "60+ DOM", deltaColor: "#ef4444" },
      { type: "chart", label: "Aging Distribution", desc: "Units by days-on-market bucket across target dealers", chartType: "stacked" },
    ],
  },
  {
    id: "auction-dealer-targeting",
    name: "Auction Dealer Targeting",
    tagline: "Identify high-volume buyers in your target market",
    icon: "&#9654;",
    color: "#84cc16",
    widgets: [
      { type: "table", label: "Top Buyer Prospects", rows: ["Mega Auto Group — 342 units — Franchise", "Valley Motors — 187 units — Franchise", "Quick Deal Auto — 124 units — Independent", "Metro Cars LLC — 98 units — Independent", "Prime Auto Sales — 76 units — Independent"] },
      { type: "kpi", label: "Active Dealers", value: "48", delta: "in 50mi radius", deltaColor: "#94a3b8" },
      { type: "kpi", label: "Total Inventory", value: "3,240", delta: "active units", deltaColor: "#0ea5e9" },
      { type: "pie", label: "Dealer Type Mix", slices: ["Franchise — 62%", "Independent — 31%", "BHPH — 7%"] },
    ],
  },
  // ── Lender Sales ──
  {
    id: "floor-plan-opportunity-scanner",
    name: "Floor Plan Opportunity Scanner",
    tagline: "Find dealers with aging inventory who need floor plan",
    icon: "&#8599;",
    color: "#14b8a6",
    widgets: [
      { type: "table", label: "Floor Plan Opportunities", rows: ["Valley Auto — $8,400/mo burn — 32% aged", "Quick Cars — $6,200/mo burn — 41% aged", "Metro Autos — $4,800/mo burn — 28% aged", "City Motors — $3,900/mo burn — 35% aged"] },
      { type: "kpi", label: "Hot Prospects", value: "8", delta: "90+ DOM > 30%", deltaColor: "#ef4444" },
      { type: "kpi", label: "Total Burn", value: "$42K/mo", delta: "across prospects", deltaColor: "#f59e0b" },
      { type: "chart", label: "DOM Distribution", desc: "Aging inventory distribution across prospect dealers", chartType: "stacked" },
    ],
  },
  {
    id: "dealer-intelligence-brief",
    name: "Dealer Intelligence Brief",
    tagline: "Dealer profile data for pitch prep",
    icon: "&#8599;",
    color: "#14b8a6",
    widgets: [
      { type: "kpiStrip", items: [
        { label: "Inventory Size", value: "187", delta: "active units", deltaColor: "#94a3b8" },
        { label: "Avg DOM", value: "38", delta: "days", deltaColor: "#f59e0b" },
        { label: "Aged (60+ DOM)", value: "24%", delta: "45 units", deltaColor: "#ef4444" },
        { label: "Est. Floor Plan", value: "$52K/mo", delta: "exposure", deltaColor: "#94a3b8" },
      ]},
      { type: "pie", label: "Brand Mix", slices: ["Toyota — 34%", "Honda — 22%", "Ford — 18%", "Other — 26%"] },
      { type: "table", label: "Key Talking Points", rows: ["24% aged inventory = floor plan pain point", "Heavy truck mix aligns with our products", "No current floor plan provider detected", "Regional demand for trucks at 2.1x D/S"] },
    ],
  },
  {
    id: "subprime-opportunity-finder",
    name: "Subprime Opportunity Finder",
    tagline: "Identify subprime-heavy dealers for lending products",
    icon: "&#8599;",
    color: "#14b8a6",
    widgets: [
      { type: "table", label: "Subprime Dealer Prospects", rows: ["EZ Auto Sales — 89% older vehicles — Avg $12K", "Drive Now Motors — 82% older vehicles — Avg $10K", "Budget Cars LLC — 78% older vehicles — Avg $11K", "Value Auto Group — 71% older vehicles — Avg $14K"] },
      { type: "kpi", label: "BHPH Dealers", value: "12", delta: "in target area", deltaColor: "#94a3b8" },
      { type: "kpi", label: "Avg Vehicle Age", value: "7.2 yrs", delta: "across prospects", deltaColor: "#f59e0b" },
      { type: "chart", label: "Price Point Distribution", desc: "Vehicle price distribution across subprime-signal dealers", chartType: "stacked" },
    ],
  },
];

// ── Widget renderers (same as manufacturer script) ──────────────────────

function renderWidget(w) {
  if (w.type === "kpi") {
    return `<div style="background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:20px;flex:1;min-width:160px;">
      <div style="font-size:11px;color:#64748b;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:8px;">${w.label}</div>
      <div style="font-size:32px;font-weight:800;color:#0f172a;line-height:1;">${w.value}</div>
      <div style="font-size:13px;font-weight:600;color:${w.deltaColor};margin-top:4px;">${w.delta}</div>
    </div>`;
  }
  if (w.type === "kpiStrip") {
    return `<div style="display:flex;gap:12px;grid-column:1/-1;">
      ${w.items.map(i => `<div style="background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:16px 20px;flex:1;">
        <div style="font-size:10px;color:#64748b;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px;">${i.label}</div>
        <div style="font-size:26px;font-weight:800;color:#0f172a;line-height:1;">${i.value}</div>
        <div style="font-size:12px;font-weight:600;color:${i.deltaColor};margin-top:4px;">${i.delta}</div>
      </div>`).join("")}
    </div>`;
  }
  if (w.type === "table") {
    return `<div style="background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:20px;min-width:280px;">
      <div style="font-size:12px;color:#64748b;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:12px;">${w.label}</div>
      ${w.rows.map((r, i) => `<div style="padding:8px 0;border-top:${i > 0 ? "1px solid #f1f5f9" : "none"};font-size:13px;color:#334155;display:flex;align-items:center;gap:8px;">
        <span style="width:6px;height:6px;border-radius:50%;background:${i < 2 ? "#22c55e" : i < 3 ? "#f59e0b" : "#94a3b8"};flex-shrink:0;"></span>${r}
      </div>`).join("")}
    </div>`;
  }
  if (w.type === "chart") {
    const svg = w.chartType === "line" ? `<svg viewBox="0 0 300 100" style="width:100%;height:120px;">
      <polyline points="0,80 30,72 60,65 90,55 120,50 150,48 180,42 210,38 240,30 270,25 300,20" fill="none" stroke="${w.color || "#3b82f6"}" stroke-width="2.5"/>
      <polyline points="0,75 30,70 60,68 90,60 120,58 150,52 180,50 210,45 240,42 270,38 300,35" fill="none" stroke="#94a3b8" stroke-width="2" stroke-dasharray="4,4"/>
    </svg>` : `<svg viewBox="0 0 300 100" style="width:100%;height:120px;">
      <rect x="10" y="30" width="35" height="70" rx="3" fill="#3b82f6" opacity="0.8"/><rect x="10" y="50" width="35" height="50" rx="3" fill="#0ea5e9" opacity="0.6"/>
      <rect x="55" y="25" width="35" height="75" rx="3" fill="#3b82f6" opacity="0.8"/><rect x="55" y="45" width="35" height="55" rx="3" fill="#0ea5e9" opacity="0.6"/>
      <rect x="100" y="20" width="35" height="80" rx="3" fill="#3b82f6" opacity="0.8"/><rect x="100" y="42" width="35" height="58" rx="3" fill="#0ea5e9" opacity="0.6"/>
      <rect x="145" y="35" width="35" height="65" rx="3" fill="#3b82f6" opacity="0.8"/><rect x="145" y="52" width="35" height="48" rx="3" fill="#0ea5e9" opacity="0.6"/>
      <rect x="190" y="28" width="35" height="72" rx="3" fill="#3b82f6" opacity="0.8"/><rect x="190" y="48" width="35" height="52" rx="3" fill="#0ea5e9" opacity="0.6"/>
      <rect x="235" y="22" width="35" height="78" rx="3" fill="#3b82f6" opacity="0.8"/><rect x="235" y="40" width="35" height="60" rx="3" fill="#0ea5e9" opacity="0.6"/>
    </svg>`;
    return `<div style="background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:20px;min-width:300px;flex:2;">
      <div style="font-size:12px;color:#64748b;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;">${w.label}</div>
      <div style="font-size:11px;color:#94a3b8;margin-bottom:8px;">${w.desc}</div>
      ${svg}
    </div>`;
  }
  if (w.type === "pie") {
    const colors = ["#8b5cf6","#a78bfa","#c4b5fd","#ddd6fe"];
    return `<div style="background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:20px;min-width:240px;">
      <div style="font-size:12px;color:#64748b;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:12px;">${w.label}</div>
      <svg viewBox="0 0 120 120" style="width:120px;height:120px;display:block;margin:0 auto 12px;">
        <circle cx="60" cy="60" r="50" fill="none" stroke="${colors[0]}" stroke-width="20" stroke-dasharray="107 207" stroke-dashoffset="-25" opacity="0.9"/>
        <circle cx="60" cy="60" r="50" fill="none" stroke="${colors[1]}" stroke-width="20" stroke-dasharray="88 226" stroke-dashoffset="-132" opacity="0.7"/>
        <circle cx="60" cy="60" r="50" fill="none" stroke="${colors[2]}" stroke-width="20" stroke-dasharray="69 245" stroke-dashoffset="-220" opacity="0.5"/>
      </svg>
      ${w.slices.map((s, i) => `<div style="font-size:12px;color:#334155;padding:3px 0;display:flex;align-items:center;gap:6px;"><span style="width:8px;height:8px;border-radius:50%;background:${colors[i] || "#94a3b8"};flex-shrink:0;"></span>${s}</div>`).join("")}
    </div>`;
  }
  if (w.type === "heatmap") {
    return `<div style="background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:20px;min-width:280px;">
      <div style="font-size:12px;color:#64748b;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;">${w.label}</div>
      <div style="font-size:11px;color:#94a3b8;margin-bottom:12px;">${w.desc}</div>
      <div style="display:grid;grid-template-columns:repeat(10,1fr);gap:3px;">
        ${Array.from({length:50}, () => `<div style="aspect-ratio:1;border-radius:3px;background:rgba(139,92,246,${(Math.random()*0.7+0.15).toFixed(2)});"></div>`).join("")}
      </div>
    </div>`;
  }
  return "";
}

const SEGMENT_COLORS = {
  "Dealer": "#f59e0b", "Dealership Group": "#f97316", "Analyst": "#8b5cf6",
  "Auction House": "#84cc16", "Lender Sales": "#14b8a6",
};

function generateHTML(app) {
  const segColor = SEGMENT_COLORS[app.segment] || app.color;
  return `<!DOCTYPE html><html><head><meta charset="UTF-8">
<style>@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700;800&display=swap');
*{margin:0;padding:0;box-sizing:border-box;}body{font-family:'DM Sans',-apple-system,sans-serif;background:linear-gradient(135deg,#f8fafc,#f1f5f9);width:1280px;height:900px;overflow:hidden;padding:32px;}</style>
</head><body>
  <div style="display:flex;align-items:center;gap:16px;margin-bottom:24px;">
    <div style="width:48px;height:48px;border-radius:14px;background:${app.color};display:flex;align-items:center;justify-content:center;font-size:24px;color:#fff;font-weight:700;">${app.icon}</div>
    <div><div style="font-size:24px;font-weight:800;color:#0f172a;line-height:1.2;">${app.name}</div>
    <div style="font-size:14px;color:#64748b;margin-top:2px;">${app.tagline}</div></div>
    <div style="margin-left:auto;display:flex;gap:8px;">
      <span style="padding:5px 14px;border-radius:20px;font-size:11px;font-weight:700;background:${segColor}18;color:${segColor};border:1px solid ${segColor}33;">${app.segment || "App"}</span>
    </div>
  </div>
  <div style="display:flex;flex-wrap:wrap;gap:16px;align-items:flex-start;">
    ${app.widgets.map(w => renderWidget(w)).join("")}
  </div>
  <div style="position:absolute;bottom:20px;left:32px;right:32px;display:flex;align-items:center;justify-content:space-between;">
    <div style="font-size:12px;color:#94a3b8;">Powered by MarketCheck APIs</div>
    <div style="font-size:12px;color:#cbd5e1;">apps.marketcheck.com</div>
  </div>
</body></html>`;
}

async function main() {
  const browser = await puppeteer.launch({ headless: true, args: ["--no-sandbox"] });
  for (const app of APPS) {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 900 });
    await page.setContent(generateHTML(app), { waitUntil: "networkidle0" });
    await new Promise(r => setTimeout(r, 1500));
    const outPath = path.join(SCREENSHOTS_DIR, `${app.id}.png`);
    await page.screenshot({ path: outPath, type: "png" });
    await page.close();
    console.log(`  ${app.id}.png`);
  }
  await browser.close();
  console.log(`\nGenerated ${APPS.length} screenshots.`);
}
main().catch(e => { console.error(e); process.exit(1); });
