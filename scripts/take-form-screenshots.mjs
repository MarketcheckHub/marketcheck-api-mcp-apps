#!/usr/bin/env node
/**
 * Take "filled form" screenshots for apps that have input forms.
 * Uses Puppeteer to fill fields, click submit, wait for results, then screenshot.
 * Produces: {app}-form.png (initial state) and {app}-result.png (after submit)
 */
import puppeteer from "puppeteer";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dirname, "..", "static", "screenshots");
const BASE = "http://localhost:3001";

const apps = [
  {
    id: "trade-in-estimator",
    actions: async (page) => {
      // VIN is pre-filled, just need to fill mileage/zip and click
      await page.waitForSelector("input", { timeout: 5000 });
      // Find mileage input (second input)
      const inputs = await page.$$("input");
      if (inputs[1]) { await inputs[1].click({ clickCount: 3 }); await inputs[1].type("45200"); }
      if (inputs[2]) { await inputs[2].click({ clickCount: 3 }); await inputs[2].type("90210"); }
      // Click a condition card (Good)
      const buttons = await page.$$("div[style*='cursor:pointer'], div[style*='cursor: pointer']");
      for (const btn of buttons) {
        const text = await page.evaluate(el => el.textContent, btn);
        if (text?.includes("Good")) { await btn.click(); break; }
      }
      // Click the main action button
      const actionBtns = await page.$$("button");
      for (const btn of actionBtns) {
        const text = await page.evaluate(el => el.textContent, btn);
        if (text?.includes("Get My Value") || text?.includes("Estimate") || text?.includes("Submit")) {
          await btn.click(); break;
        }
      }
      await new Promise(r => setTimeout(r, 2000));
    },
  },
  {
    id: "deal-evaluator",
    actions: async (page) => {
      await page.waitForSelector("input", { timeout: 5000 });
      const inputs = await page.$$("input");
      // VIN should be pre-filled, fill price and mileage
      if (inputs[1]) { await inputs[1].click({ clickCount: 3 }); await inputs[1].type("15500"); }
      if (inputs[2]) { await inputs[2].click({ clickCount: 3 }); await inputs[2].type("42000"); }
      if (inputs[3]) { await inputs[3].click({ clickCount: 3 }); await inputs[3].type("90210"); }
      // Click evaluate
      const actionBtns = await page.$$("button");
      for (const btn of actionBtns) {
        const text = await page.evaluate(el => el.textContent, btn);
        if (text?.includes("Evaluate") || text?.includes("Check") || text?.includes("Submit")) {
          await btn.click(); break;
        }
      }
      await new Promise(r => setTimeout(r, 2000));
    },
  },
  {
    id: "appraiser-workbench",
    actions: async (page) => {
      await page.waitForSelector("input", { timeout: 5000 });
      const inputs = await page.$$("input");
      // Fill VIN
      if (inputs[0]) { await inputs[0].click({ clickCount: 3 }); await inputs[0].type("KNDCB3LC9L5359658"); }
      // Mileage
      if (inputs[1]) { await inputs[1].click({ clickCount: 3 }); await inputs[1].type("45200"); }
      // ZIP
      if (inputs[2]) { await inputs[2].click({ clickCount: 3 }); await inputs[2].type("90210"); }
      // Click Appraise
      const actionBtns = await page.$$("button");
      for (const btn of actionBtns) {
        const text = await page.evaluate(el => el.textContent, btn);
        if (text?.includes("Appraise") || text?.includes("Submit")) {
          await btn.click(); break;
        }
      }
      await new Promise(r => setTimeout(r, 2000));
    },
  },
  {
    id: "car-search-compare",
    actions: async (page) => {
      // This app auto-loads mock data, just wait
      await new Promise(r => setTimeout(r, 3000));
    },
  },
  {
    id: "earnings-signal-dashboard",
    actions: async (page) => {
      await page.waitForSelector("select, button", { timeout: 5000 });
      // Select a ticker and click Analyze
      const selects = await page.$$("select");
      if (selects[0]) { await selects[0].select("GM"); }
      const actionBtns = await page.$$("button");
      for (const btn of actionBtns) {
        const text = await page.evaluate(el => el.textContent, btn);
        if (text?.includes("Analyze") || text?.includes("Scan") || text?.includes("Load")) {
          await btn.click(); break;
        }
      }
      await new Promise(r => setTimeout(r, 2000));
    },
  },
  {
    id: "claims-valuation-workbench",
    actions: async (page) => {
      await page.waitForSelector("input, button", { timeout: 5000 });
      const inputs = await page.$$("input");
      if (inputs[0]) { await inputs[0].click({ clickCount: 3 }); await inputs[0].type("KNDCB3LC9L5359658"); }
      if (inputs[1]) { await inputs[1].click({ clickCount: 3 }); await inputs[1].type("45200"); }
      if (inputs[2]) { await inputs[2].click({ clickCount: 3 }); await inputs[2].type("90210"); }
      // Click Evaluate
      const actionBtns = await page.$$("button");
      for (const btn of actionBtns) {
        const text = await page.evaluate(el => el.textContent, btn);
        if (text?.includes("Evaluate") || text?.includes("Submit") || text?.includes("Assess")) {
          await btn.click(); break;
        }
      }
      await new Promise(r => setTimeout(r, 2000));
    },
  },
  {
    id: "comparables-explorer",
    actions: async (page) => {
      await page.waitForSelector("input, select, button", { timeout: 5000 });
      // Click Search button to load default data
      const actionBtns = await page.$$("button");
      for (const btn of actionBtns) {
        const text = await page.evaluate(el => el.textContent, btn);
        if (text?.includes("Search") || text?.includes("Find") || text?.includes("Load")) {
          await btn.click(); break;
        }
      }
      await new Promise(r => setTimeout(r, 2000));
    },
  },
  {
    id: "oem-incentives-explorer",
    actions: async (page) => {
      await page.waitForSelector("select, button", { timeout: 5000 });
      // Click Search
      const actionBtns = await page.$$("button");
      for (const btn of actionBtns) {
        const text = await page.evaluate(el => el.textContent, btn);
        if (text?.includes("Search") || text?.includes("Find")) {
          await btn.click(); break;
        }
      }
      await new Promise(r => setTimeout(r, 2000));
    },
  },
];

async function run() {
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  for (const app of apps) {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 900 });

    try {
      console.log(`  Processing ${app.id}...`);
      await page.goto(`${BASE}/apps/${app.id}/dist/index.html`, { waitUntil: "networkidle0", timeout: 15000 });

      // Take the "form" screenshot (initial state)
      await new Promise(r => setTimeout(r, 1500));
      await page.screenshot({ fullPage: true, path: join(outDir, `${app.id}-form.png`) });
      console.log(`    ✓ ${app.id}-form.png`);

      // Perform actions (fill form, click submit)
      await app.actions(page);

      // Take the "result" screenshot
      await page.screenshot({ fullPage: true, path: join(outDir, `${app.id}-result.png`) });
      console.log(`    ✓ ${app.id}-result.png`);

    } catch (e) {
      console.log(`    ✗ ${app.id}: ${e.message?.slice(0, 80)}`);
    }

    await page.close();
  }

  await browser.close();
  console.log("\nDone.");
}

run();
