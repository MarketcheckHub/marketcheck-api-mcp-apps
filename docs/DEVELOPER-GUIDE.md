# MarketCheck Apps — Developer Guide & App Assignments

> **68 automotive market intelligence apps** built as standalone single-file HTML dashboards powered by MarketCheck APIs. Each app works in Demo (mock data), Live (real API), and MCP (AI assistant) modes.

**Live:** https://apps.marketcheck.com
**Repo:** https://github.com/MarketcheckHub/marketcheck-api-mcp-apps
**API Docs:** https://apidocs.marketcheck.com
**Get API Key:** https://developers.marketcheck.com

---

## App Assignments

Each developer is assigned a logical group of 2-4 apps based on segment and utility. Your job: **test with a real API key, fix bugs, polish the UI, update the app's landing page, and raise a PR.**

| # | Developer | Apps (IDs) | Segment | Notes |
|---|-----------|-----------|---------|-------|
| 1 | **abhijeet.shinde** | `deal-evaluator`, `incentive-adjusted-deal-eval` | Consumer — Deal Analysis | Both evaluate deals; one adds incentive overlay. Test with VINs + asking price. |
| 2 | **abhishek.yesga** | `car-search-app`, `car-search-compare` | Consumer — Search | SERP search + side-by-side comparison. Test filters, pagination, NLP search. |
| 3 | **abhishek.rajvir** | `trade-in-estimator`, `pricing-transparency-report` | Consumer/Dealer — Valuation | 3-tier valuation + shareable dealer report. Test VIN + mileage + condition. |
| 4 | **akash.ramteke** | `oem-incentives-explorer`, `incentive-deal-finder` | Consumer — Incentives | Cash back/APR/lease explorer + cross-brand deal finder. Test with make + ZIP. |
| 5 | **akshay.mangulkar** | `lot-pricing-dashboard`, `stocking-intelligence` | Dealer — Inventory Ops | Lot pricing against market + auction stocking guide. Test with dealer_id + state. |
| 6 | **aviral.srivastava** | `dealer-inventory-fit-scorer`, `dealer-conquest-analyzer`, `deal-finder` | Dealer — Strategy | Fit scoring + competitor analysis + deal sourcing. Test with VINs + dealer_id. |
| 7 | **deep.isane** | `appraiser-workbench`, `comparables-explorer` | Appraiser — Core | Full valuation studio + deep comp analysis. Test VIN and make/model flows. |
| 8 | **deepesh.patel** | `depreciation-analyzer`, `market-trends-dashboard` | Appraiser — Trends | Depreciation curves + macro market trends. Uses Enterprise Sold Summary API. |
| 9 | **divesh.patil** | `group-operations-center`, `inventory-balancer` | Dealership Group — Ops | Multi-store dashboard + transfer recommendations. Test with multiple dealer IDs. |
| 10 | **falgun.padme** | `location-benchmarking`, `group-health-scorecard` | Dealership Group — Analytics | Rooftop ranking + 0-100 health scores. `group-health-scorecard` is Coming Soon — build it. |
| 11 | **gaurav.j.patil** | `underwriting-decision-support`, `lender-portfolio-stress-test` | Lender — Underwriting | Single-loan LTV + portfolio stress scenarios. Test with VINs + loan amounts. |
| 12 | **gayatri.rakshe** | `portfolio-risk-monitor`, `ev-collateral-risk` | Lender — Portfolio Risk | Portfolio health + EV vs ICE risk. Uses Enterprise Sold Summary API. |
| 13 | **govind.sarkate** | `earnings-signal-dashboard`, `watchlist-monitor`, `dealer-group-scorecard` | Analyst — Market Intel | Pre-earnings signals + watchlist + group scorecard. Uses Enterprise Sold Summary API. |
| 14 | **jagruti.mahajan** | `oem-stock-tracker`, `pricing-power-tracker`, `market-share-analyzer` | Analyst — New (Coming Soon) | All 3 are Coming Soon — build them using the How to Build guides. |
| 15 | **jyoti.sherkar** | `claims-valuation-workbench`, `insurance-premium-benchmarker` | Insurer | Total-loss determination + premium benchmarking. Test with VIN + damage severity. |
| 16 | **komal.pawar** | `brand-command-center`, `regional-demand-allocator` | Manufacturer — Core | Brand vs competition + state-level demand allocation. Uses Enterprise API. |
| 17 | **mandar.wajage** | `oem-depreciation-tracker`, `ev-transition-monitor`, `model-contenting-analyzer` | Manufacturer — New (Coming Soon) | All 3 Coming Soon — build them using the How to Build guides. |
| 18 | **piyush.kumbhare** | `market-momentum-report`, `incentive-effectiveness-dashboard` | Manufacturer — New (Coming Soon) | Both Coming Soon — build using How to Build guides. |
| 19 | **sanskar.singh** | `auction-lane-planner`, `auction-arbitrage-finder` | Auction House — Core | Lane planning + wholesale/retail spread. Test with VINs + state/ZIP. |
| 20 | **soham.mirajgaonkar** | `auction-run-list-analyzer`, `consignment-sourcer`, `auction-dealer-targeting` | Auction House — New (Coming Soon) | All 3 Coming Soon — build them using the How to Build guides. |
| 21 | **suhas.patil** | `ev-market-monitor`, `vin-history-detective`, `market-anomaly-detector` | Cross-Segment | EV dashboard + VIN timeline + pricing outliers. Mixed API patterns. |
| 22 | **ujjwal.pandey** | `territory-pipeline`, `floor-plan-opportunity-scanner`, `dealer-intelligence-brief`, `subprime-opportunity-finder` | Lender Sales | Pipeline + 3 Coming Soon apps — build them. Test with ZIP + radius. |
| 23 | **yogesh.shah** | `uk-market-explorer`, `uk-market-trends`, `uk-dealer-pricing` | UK Market | All UK apps — use UK API endpoints. Test with UK postal codes (e.g., SW1A 1AA). UK API key required. |

**Remaining apps** (handled separately):
- `vin-market-report` — already tested and polished
- `used-car-market-index` — already tested (Enterprise API)
- `wholesale-vehicle-router` — assign if bandwidth allows
- `auto-journalist-briefing` — assign if bandwidth allows
- `fleet-lifecycle-manager`, `rental-fleet-valuator` — assign if bandwidth allows
- 7 Chat Demos (`chat-vercel-ai`, `chat-copilotkit`, etc.) — separate review cycle

---

## Quick Start

```bash
# 1. Clone and install
git clone https://github.com/MarketcheckHub/marketcheck-api-mcp-apps.git
cd marketcheck-api-mcp-apps
npm install

# 2. Build everything
npm run build

# 3. Create your branch
git checkout -b fix/YOUR-APP-ID          # e.g., fix/deal-evaluator

# 4. Run the server
PORT=4005 npm run serve

# 5. Open your app with a real API key
open "http://localhost:4005/apps/YOUR-APP-ID/dist/index.html?api_key=YOUR_KEY"

# 6. Open your app's "How to Build" guide (for reference)
open "http://localhost:4005/app/YOUR-APP-ID/"
```

---

## Your Deliverables

### For Existing Apps (already built)

1. **Test** the app in demo mode (no key) and live mode (with key)
2. **Fix** any bugs: mock data showing with real key, DOM/miles showing 0, console errors, broken charts, missing data fields
3. **Polish** the UI: verify all sections render, formatting is correct, responsive on mobile
4. **Update the landing page**: Edit the app definition in `scripts/generate-how-to-build.mjs` — enhance the description, add `useCases` and `urlParams` if missing, then run `node scripts/generate-how-to-build.mjs` to regenerate
5. **Raise a PR** with your changes

### For Coming Soon Apps (not yet built)

1. **Read** the How to Build guide at `http://localhost:4005/app/YOUR-APP-ID/` — it shows exactly which APIs to call, in what order, with what parameters
2. **Create** the app directory: `packages/apps/YOUR-APP-ID/`
3. **Build** the app following the architecture pattern below (copy from an existing app like `deal-evaluator` or `trade-in-estimator`)
4. **Implement** `_fetchDirect()` with the API calls from the How to Build guide
5. **Add** realistic `getMockData()` for demo mode
6. **Build** the UI rendering
7. **Update the landing page** in `scripts/generate-how-to-build.mjs` with richer description, use cases, URL params
8. **Raise a PR**

---

## Architecture: How Every App Works

### The Dual-Mode Data Provider Pattern

Every app follows the same pattern in a single `src/main.ts` file:

```
┌─────────────────────────────────────────────────────────┐
│  src/main.ts                                            │
│                                                         │
│  1. _getAuth()        → Check URL/localStorage for key  │
│  2. _detectAppMode()  → Returns "live" | "mcp" | "demo" │
│  3. _mcApi()          → Direct fetch to MarketCheck API  │
│  4. _fetchDirect()    → Orchestrate multiple API calls   │
│  5. _callTool()       → Try Direct → Proxy → MCP → Mock │
│  6. getMockData()     → Realistic demo data              │
│  7. main()            → Build UI, wire events            │
│  8. renderResults()   → Display data as charts/tables    │
└─────────────────────────────────────────────────────────┘
```

### Auth Detection

```typescript
function _getAuth(): { mode: "api_key" | "oauth_token" | null; value: string | null } {
  const params = new URLSearchParams(location.search);
  const token = params.get("access_token") ?? localStorage.getItem("mc_access_token");
  if (token) return { mode: "oauth_token", value: token };
  const key = params.get("api_key") ?? localStorage.getItem("mc_api_key");
  if (key) return { mode: "api_key", value: key };
  return { mode: null, value: null };
}
```

### Mode Detection (CRITICAL — get this right)

```typescript
function _detectAppMode(): "mcp" | "live" | "demo" {
  if (_getAuth().value) return "live";                      // Has API key → live
  if (_safeApp && window.parent !== window) return "mcp";   // In MCP host → MCP
  return "demo";                                            // No key → demo
}
```

### Direct API Calls

```typescript
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

// Convenience wrappers
function _mcDecode(vin) { return _mcApi("/decode/car/neovin/" + vin + "/specs"); }
function _mcPredict(p)  { return _mcApi("/predict/car/us/marketcheck_price/comparables", p); }
function _mcActive(p)   { return _mcApi("/search/car/active", p); }
function _mcRecent(p)   { return _mcApi("/search/car/recents", p); }
function _mcHistory(vin) { return _mcApi("/history/car/" + vin); }
function _mcSold(p)     { return _mcApi("/api/v1/sold-vehicles/summary", p); }
```

### Data Orchestration (example: Deal Evaluator)

```typescript
async function _fetchDirect(args) {
  const decode = await _mcDecode(args.vin);
  const [prediction, history] = await Promise.all([
    _mcPredict({ ...args, dealer_type: "franchise" }),
    _mcHistory(args.vin),
  ]);
  const activeComps = await _mcActive({
    make: decode?.make, model: decode?.model,
    year: decode?.year ? `${decode.year - 1}-${decode.year + 1}` : undefined,
    zip: args.zip, radius: 75, stats: "price,miles,dom", rows: 10,
  });
  return { decode, prediction, activeComps, history };
}
```

### Demo Banner (must be in every app)

```typescript
if (_detectAppMode() === "demo") {
  const _db = document.createElement("div");
  _db.id = "_demo_banner";
  _db.style.cssText = "background:linear-gradient(135deg,#92400e22,#f59e0b11);border:1px solid #f59e0b44;border-radius:10px;padding:14px 20px;margin-bottom:12px;display:flex;align-items:center;gap:14px;flex-wrap:wrap;";
  _db.innerHTML = `
    <div style="flex:1;min-width:200px;">
      <div style="font-size:13px;font-weight:700;color:#fbbf24;">&#9888; Demo Mode — Showing sample data</div>
      <div style="font-size:12px;color:#d97706;">Enter your MarketCheck API key for real data.
        <a href="https://developers.marketcheck.com" target="_blank" style="color:#fbbf24;text-decoration:underline;">Get a free key</a></div>
    </div>
    <div style="display:flex;gap:8px;align-items:center;">
      <input id="_banner_key" type="text" placeholder="Paste your API key"
        style="padding:8px 12px;border-radius:6px;border:1px solid #f59e0b44;background:#0f172a;color:#e2e8f0;font-size:13px;width:220px;" />
      <button id="_banner_save"
        style="padding:8px 16px;border-radius:6px;border:none;background:#f59e0b;color:#0f172a;font-size:12px;font-weight:700;cursor:pointer;">Activate</button>
    </div>`;
  container.appendChild(_db);
  _db.querySelector("#_banner_save").addEventListener("click", () => {
    const k = _db.querySelector("#_banner_key").value.trim();
    if (!k) return;
    localStorage.setItem("mc_api_key", k);
    _db.innerHTML = '<div style="font-size:13px;font-weight:700;color:#10b981;">&#10003; API key saved — reloading...</div>';
    setTimeout(() => location.reload(), 800);
  });
  _db.querySelector("#_banner_key").addEventListener("keydown", (e) => {
    if (e.key === "Enter") _db.querySelector("#_banner_save").click();
  });
}
```

---

## MarketCheck API Quick Reference

| Endpoint | Purpose | Key Params |
|----------|---------|------------|
| `GET /v2/decode/car/neovin/{vin}/specs` | Decode VIN → specs | `vin` |
| `GET /v2/predict/car/us/marketcheck_price/comparables` | ML price prediction | `vin`, `miles`, `zip`, `dealer_type` (franchise/independent) |
| `GET /v2/search/car/active` | Search active listings | `make`, `model`, `year`, `zip`, `radius`, `rows`, `stats`, `sort_by`, `dealer_id`, `facets` |
| `GET /v2/search/car/recents` | Sold last 90 days | `make`, `model`, `zip`, `radius`, `rows`, `stats` |
| `GET /v2/history/car/{vin}` | VIN listing history | `sort_order` (asc/desc) |
| `GET /api/v1/sold-vehicles/summary` | Market intelligence **[Enterprise]** | `ranking_dimensions`, `ranking_measure`, `state`, `top_n`, `inventory_type` |
| `GET /v2/search/car/incentive/oem` | OEM incentives | `make`, `model`, `zip`, `rows` |
| `GET /v2/search/car/uk/active` | UK listings | `make`, `model`, `postal_code`, `radius` |
| `GET /v2/search/car/uk/recents` | UK sold | `make`, `model`, `rows`, `stats` |

**DOM gotcha:** Read both `l.dom ?? l.days_on_market ?? 0` on listings. Stats use `domStats.avg ?? domStats.mean`.

---

## Common Bugs & Fixes

| Bug | Cause | Fix |
|-----|-------|-----|
| Shows mock data with real API key | `_detectAppMode()` returns "mcp" | Check auth first: `if (_getAuth().value) return "live"` |
| DOM / Miles show 0 | API field name mismatch | `l.dom ?? l.days_on_market ?? 0` and `stats.dom ?? stats.days_on_market` |
| `McpError: Method not found` in console | MCP connect called outside host | Add `window.parent !== window` check in `_detectAppMode` |
| Demo banner missing | Same as mock data bug | Fix `_detectAppMode` — banner only shows when mode === "demo" |
| Total Loss shows `-$-410` | Double negative in formatting | Use `Math.abs(totalDep)` and conditional `-`/`+` prefix |
| Price history labels overlap | Points too close on timeline | Skip labels when points < 60px apart, keep first/last |

---

## Tech Stack — DO NOT DEVIATE

| Layer | Technology | DO NOT use |
|-------|-----------|------------|
| Language | TypeScript (vanilla) | No JSX, no CoffeeScript |
| Framework | **None** — pure DOM | No React, Vue, Svelte, Angular |
| Build | Vite + vite-plugin-singlefile | No Webpack, no Parcel |
| Styling | Inline `style.cssText` | No Tailwind, no CSS files, no SCSS |
| Charts | HTML Canvas API | No Chart.js, no D3, no Recharts |
| HTTP | Native `fetch()` | No Axios, no got |
| State | Local variables + localStorage | No Redux, no Zustand |

**Why?** Apps must be self-contained single HTML files that work inside MCP AI hosts. No external dependencies allowed in the built output.

---

## File Map

```
packages/apps/YOUR-APP-ID/
├── index.html          ← Entry point (don't change)
├── src/main.ts         ← ALL YOUR CODE HERE
├── vite.config.ts      ← Build config (don't change)
├── tsconfig.json       ← TS config (don't change)
├── package.json        ← Dependencies (don't change)
└── dist/index.html     ← Built output (auto-generated)

scripts/generate-how-to-build.mjs   ← Landing page definitions (update your app's entry)
public/app/YOUR-APP-ID/index.html   ← Generated landing page (auto-generated from script)
```

---

## How to Update Your App's Landing Page

1. Open `scripts/generate-how-to-build.mjs`
2. Find your app's entry in the `APPS` array (search for your app ID)
3. Enhance the `description` with detailed explanation of what the app does
4. Add `useCases` array (see vin-market-report for example):
   ```javascript
   useCases: [
     { persona: "Car Shoppers", desc: "Paste a VIN to see if it's a good deal..." },
     { persona: "Dealers", desc: "Use for trade-in appraisals..." },
   ],
   ```
5. Add `urlParams` array for deep-linking documentation:
   ```javascript
   urlParams: [
     { name: "api_key", desc: "Your MarketCheck API key" },
     { name: "vin", desc: "17-character VIN — auto-fills form and triggers analysis" },
   ],
   ```
6. Regenerate: `node scripts/generate-how-to-build.mjs`
7. Include the regenerated `public/app/YOUR-APP-ID/index.html` in your PR

---

## Build & Test Workflow

```bash
# After making changes to src/main.ts:
cd packages/apps/YOUR-APP-ID
npx vite build                    # Rebuild your app only (fast, ~500ms)

# After updating landing page in generate-how-to-build.mjs:
node scripts/generate-how-to-build.mjs   # Regenerate all landing pages

# Test locally:
PORT=4005 npm run serve           # Server at http://localhost:4005

# Test your app:
# Demo mode:  http://localhost:4005/apps/YOUR-APP-ID/dist/index.html
# Live mode:  http://localhost:4005/apps/YOUR-APP-ID/dist/index.html?api_key=YOUR_KEY
# Landing:    http://localhost:4005/app/YOUR-APP-ID/
```

---

## PR Checklist

Before submitting, verify:

- [ ] App works in **demo mode** — mock data renders, yellow banner shows
- [ ] App works in **live mode** — real API data, all fields populated
- [ ] No console errors (`McpError`, `TypeError`, etc.)
- [ ] All input fields work and accept URL params for deep-linking
- [ ] All output sections populate (charts, tables, gauges, comps)
- [ ] Currency: `$XX,XXX` format. Miles: `XX,XXX mi`. DOM: `XX days`
- [ ] Responsive on mobile (375px viewport)
- [ ] Landing page updated with richer description, use cases, URL params
- [ ] App builds cleanly: `npx vite build` (no errors)
- [ ] Only your app's files changed (don't modify other apps or shared code)
- [ ] Branch: `fix/YOUR-APP-ID` (from main)
- [ ] PR title: `Fix: APP-NAME — brief description of changes`

---

## Test VINs

| VIN | Vehicle | Good for |
|-----|---------|----------|
| `KNDCB3LC9L5359658` | 2020 Kia Forte | Default demo VIN |
| `1HGCV1F34LA000001` | Honda Civic | Comparisons |
| `5YJSA1E26MF000001` | Tesla Model S | EV testing |
| `1FTFW1E85MFA00001` | Ford F-150 | Truck / high value |

**US ZIPs:** `90210` (LA), `10001` (NYC), `60601` (Chicago), `77001` (Houston)
**UK Postcodes:** `SW1A 1AA` (London), `M1 1AE` (Manchester), `B1 1BB` (Birmingham)

---

## Reference Apps (look at these for patterns)

- **`vin-market-report`** — Most complete. Has history sidebar, cluster strips, range bars, URL params, use cases on landing page.
- **`trade-in-estimator`** — Clean dual-mode pattern. Good 3-tier valuation UI.
- **`deal-evaluator`** — Good gauge/canvas rendering example.
- **`car-search-app`** — Complex search with SERP, filters, pagination.

---

## Need Help?

- **How to Build guide:** `http://localhost:4005/app/YOUR-APP-ID/` — shows exact API calls, sequencing, parameters
- **API docs:** https://apidocs.marketcheck.com
- **Questions:** Raise an issue in the repo or ask in the team channel
