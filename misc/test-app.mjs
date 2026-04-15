#!/usr/bin/env node
/**
 * Test a single app: start puppeteer, navigate, fill form, wait for results, screenshot.
 * Usage: node misc/test-app.mjs <app-name> [--api-key KEY]
 */
import puppeteer from "puppeteer";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const screenshotDir = join(__dirname, "..", "static", "screenshots");
const BASE = "http://localhost:3001";
const API_KEY = process.argv.find(a => a.startsWith("--api-key="))?.split("=")[1] || "gzEqvcY4JVv4GnFRb95zhC05KKC5YzPN";
const APP_NAME = process.argv[2];

if (!APP_NAME) {
  console.error("Usage: node misc/test-app.mjs <app-name>");
  process.exit(1);
}

// Test data for different app types
const TEST_VIN = "KNDCB3LC9L5359658";  // 2020 Kia Telluride
const TEST_ZIP = "80202";  // Denver, CO
const TEST_MILES = "28000";
const TEST_STATE = "CO";
const TEST_DEALER_ID = "908741";  // A real dealer ID
const TEST_PRICE = "32000";
const TEST_MAKE = "Toyota";
const TEST_MODEL = "Camry";
const TEST_YEAR = "2022";

// VINs for multi-VIN apps
const TEST_VINS = [
  "KNDCB3LC9L5359658",  // 2020 Kia Telluride
  "1HGCV1F34LA036506",  // 2020 Honda Accord
  "3MW5R7J09M8C15282",  // 2021 BMW 3 Series
];

async function testApp(appName) {
  const browser = await puppeteer.launch({
    headless: "shell",
    args: ["--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"],
    protocolTimeout: 120000,
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900, deviceScaleFactor: 1 });

  // Set API key in localStorage before navigating
  const url = `${BASE}/apps/${appName}/dist/index.html?api_key=${API_KEY}`;
  console.log(`Opening: ${url}`);

  try {
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 15000 });
    await new Promise(r => setTimeout(r, 2000));

    // Take initial screenshot
    await page.screenshot({
      path: join(screenshotDir, `${appName}-initial.png`),
      clip: { x: 0, y: 0, width: 1280, height: 900 },
    });
    console.log(`Initial screenshot saved: ${appName}-initial.png`);

    // Fill in forms based on app type
    const filled = await fillForm(page, appName);

    if (filled) {
      // Wait for API response
      console.log("Waiting for API data to load...");
      await new Promise(r => setTimeout(r, 10000));

      // Scroll to see all content
      await page.evaluate(() => window.scrollTo(0, 0));
      await new Promise(r => setTimeout(r, 1000));

      // Take result screenshot
      await page.screenshot({
        path: join(screenshotDir, `${appName}.png`),
        clip: { x: 0, y: 0, width: 1280, height: 900 },
      });
      console.log(`Result screenshot saved: ${appName}.png`);

      // Check for errors or empty states
      const pageContent = await page.evaluate(() => document.body.innerText);
      if (pageContent.includes("Error") || pageContent.includes("error")) {
        console.warn("⚠️  Page may contain errors");
      }

      // Get the full page height for scrolled screenshot
      const bodyHeight = await page.evaluate(() => document.body.scrollHeight);
      if (bodyHeight > 900) {
        // Take full page screenshot
        await page.screenshot({
          path: join(screenshotDir, `${appName}-full.png`),
          fullPage: true,
        });
        console.log(`Full page screenshot saved: ${appName}-full.png`);
      }
    } else {
      console.log("No form to fill for this app, taking screenshot as-is");
    }

    // Log any console errors
    page.on("console", msg => {
      if (msg.type() === "error") console.log(`Console error: ${msg.text()}`);
    });

  } catch (e) {
    console.error(`Error testing ${appName}:`, e.message);
    await page.screenshot({
      path: join(screenshotDir, `${appName}-error.png`),
      clip: { x: 0, y: 0, width: 1280, height: 900 },
    });
  }

  await browser.close();
}

async function fillForm(page, appName) {
  try {
    // VIN-based apps
    const vinApps = [
      "appraiser-workbench", "claims-valuation-workbench", "deal-evaluator",
      "trade-in-estimator", "comparables-explorer", "vin-market-report",
      "vin-history-detective", "incentive-adjusted-deal-eval",
      "underwriting-decision-support", "pricing-transparency-report",
    ];

    // State/market-based apps
    const stateApps = [
      "used-car-market-index", "stocking-intelligence", "market-trends-dashboard",
      "depreciation-analyzer", "regional-demand-allocator", "auto-journalist-briefing",
      "insurance-premium-benchmarker",
    ];

    // Dealer-based apps
    const dealerApps = [
      "lot-pricing-dashboard", "dealer-group-scorecard", "group-operations-center",
      "inventory-balancer", "location-benchmarking", "dealer-conquest-analyzer",
      "watchlist-monitor",
    ];

    // Multi-VIN apps
    const multiVinApps = [
      "auction-arbitrage-finder", "lender-portfolio-stress-test",
      "rental-fleet-valuator", "fleet-lifecycle-manager",
      "wholesale-vehicle-router", "dealer-inventory-fit-scorer",
    ];

    // Search-based apps
    const searchApps = [
      "car-search-app", "car-search-compare", "uk-market-explorer",
      "uk-dealer-pricing", "uk-market-trends",
    ];

    // Incentive apps
    const incentiveApps = [
      "oem-incentives-explorer", "incentive-deal-finder",
    ];

    // Market/segment apps that auto-load
    const autoLoadApps = [
      "ev-collateral-risk", "ev-market-monitor", "portfolio-risk-monitor",
      "brand-command-center", "earnings-signal-dashboard", "territory-pipeline",
      "auction-lane-planner", "market-anomaly-detector",
    ];

    if (vinApps.includes(appName)) {
      return await fillVinForm(page, appName);
    } else if (stateApps.includes(appName)) {
      return await fillStateForm(page, appName);
    } else if (dealerApps.includes(appName)) {
      return await fillDealerForm(page, appName);
    } else if (multiVinApps.includes(appName)) {
      return await fillMultiVinForm(page, appName);
    } else if (searchApps.includes(appName)) {
      return await fillSearchForm(page, appName);
    } else if (incentiveApps.includes(appName)) {
      return await fillIncentiveForm(page, appName);
    } else if (autoLoadApps.includes(appName)) {
      // These apps auto-load data, just wait
      console.log("Auto-load app, waiting for data...");
      await new Promise(r => setTimeout(r, 8000));
      return true;
    }

    // Try generic approach: look for any visible inputs
    return await fillGenericForm(page);
  } catch (e) {
    console.warn(`Form fill failed: ${e.message}`);
    return false;
  }
}

async function fillVinForm(page, appName) {
  // Try common VIN input selectors
  const vinSelectors = ['#vin-input', '#vin', 'input[placeholder*="VIN"]', 'input[placeholder*="vin"]', 'input[maxlength="17"]'];
  const zipSelectors = ['#zip-input', '#zip', 'input[placeholder*="zip"]', 'input[placeholder*="ZIP"]', 'input[placeholder*="Zip"]'];
  const milesSelectors = ['#miles-input', '#miles', '#mileage', 'input[placeholder*="mile"]', 'input[placeholder*="Mile"]'];
  const priceSelectors = ['#price-input', '#asking-price', '#askingPrice', 'input[placeholder*="price"]', 'input[placeholder*="Price"]'];

  await typeInFirst(page, vinSelectors, TEST_VIN);
  await typeInFirst(page, zipSelectors, TEST_ZIP);
  await typeInFirst(page, milesSelectors, TEST_MILES);

  if (appName === "deal-evaluator") {
    await typeInFirst(page, priceSelectors, TEST_PRICE);
  }

  // Click submit button
  await clickSubmit(page);
  return true;
}

async function fillStateForm(page, appName) {
  const stateSelectors = ['#state-input', '#state', 'input[placeholder*="state"]', 'input[placeholder*="State"]', 'select#state'];
  const zipSelectors = ['#zip-input', '#zip', 'input[placeholder*="zip"]', 'input[placeholder*="ZIP"]'];

  await typeInFirst(page, stateSelectors, TEST_STATE);
  await typeInFirst(page, zipSelectors, TEST_ZIP);

  await clickSubmit(page);
  return true;
}

async function fillDealerForm(page, appName) {
  const dealerSelectors = ['#dealer-id', '#dealerId', '#dealer-input', 'input[placeholder*="dealer"]', 'input[placeholder*="Dealer"]'];
  const zipSelectors = ['#zip-input', '#zip', 'input[placeholder*="zip"]', 'input[placeholder*="ZIP"]'];
  const stateSelectors = ['#state-input', '#state', 'input[placeholder*="state"]', 'input[placeholder*="State"]'];

  await typeInFirst(page, dealerSelectors, TEST_DEALER_ID);
  await typeInFirst(page, zipSelectors, TEST_ZIP);
  await typeInFirst(page, stateSelectors, TEST_STATE);

  await clickSubmit(page);
  return true;
}

async function fillMultiVinForm(page, appName) {
  // These apps take comma-separated VINs or have a textarea
  const vinSelectors = ['#vins', '#vin-input', '#vins-input', 'textarea', 'input[placeholder*="VIN"]', 'input[placeholder*="vin"]'];
  const zipSelectors = ['#zip-input', '#zip', 'input[placeholder*="zip"]', 'input[placeholder*="ZIP"]'];

  await typeInFirst(page, vinSelectors, TEST_VINS.join(","));
  await typeInFirst(page, zipSelectors, TEST_ZIP);

  await clickSubmit(page);
  return true;
}

async function fillSearchForm(page, appName) {
  const makeSelectors = ['#make-input', '#make', 'input[placeholder*="make"]', 'input[placeholder*="Make"]', 'select#make'];
  const modelSelectors = ['#model-input', '#model', 'input[placeholder*="model"]', 'input[placeholder*="Model"]'];
  const zipSelectors = ['#zip-input', '#zip', 'input[placeholder*="zip"]', 'input[placeholder*="ZIP"]', 'input[placeholder*="postal"]'];

  await typeInFirst(page, makeSelectors, TEST_MAKE);
  await typeInFirst(page, modelSelectors, TEST_MODEL);
  await typeInFirst(page, zipSelectors, TEST_ZIP);

  await clickSubmit(page);
  return true;
}

async function fillIncentiveForm(page, appName) {
  const makeSelectors = ['#make-input', '#make', 'input[placeholder*="make"]', 'input[placeholder*="Make"]', 'select#make'];
  const zipSelectors = ['#zip-input', '#zip', 'input[placeholder*="zip"]', 'input[placeholder*="ZIP"]'];

  await typeInFirst(page, makeSelectors, TEST_MAKE);
  await typeInFirst(page, zipSelectors, TEST_ZIP);

  await clickSubmit(page);
  return true;
}

async function fillGenericForm(page) {
  // Look for any input fields and try to fill them
  const inputs = await page.$$("input:not([type=hidden]):not([type=checkbox]):not([type=radio])");
  if (inputs.length === 0) return false;

  for (const input of inputs) {
    const placeholder = await input.evaluate(el => el.placeholder?.toLowerCase() || "");
    const id = await input.evaluate(el => el.id?.toLowerCase() || "");
    const name = id || placeholder;

    if (name.includes("vin")) await input.type(TEST_VIN);
    else if (name.includes("zip") || name.includes("postal")) await input.type(TEST_ZIP);
    else if (name.includes("mile") || name.includes("mileage")) await input.type(TEST_MILES);
    else if (name.includes("state")) await input.type(TEST_STATE);
    else if (name.includes("make")) await input.type(TEST_MAKE);
    else if (name.includes("model")) await input.type(TEST_MODEL);
    else if (name.includes("price")) await input.type(TEST_PRICE);
    else if (name.includes("dealer")) await input.type(TEST_DEALER_ID);
  }

  await clickSubmit(page);
  return true;
}

async function typeInFirst(page, selectors, value) {
  for (const sel of selectors) {
    try {
      const el = await page.$(sel);
      if (el) {
        await el.click({ clickCount: 3 }); // Select all
        await el.type(value);
        return true;
      }
    } catch {}
  }
  return false;
}

async function clickSubmit(page) {
  // Try multiple submit button strategies
  const buttonSelectors = [
    'button[type="submit"]',
    'button.submit-btn',
    'button.primary-btn',
    'button.search-btn',
    'button.analyze-btn',
    'button.appraise-btn',
    'button.evaluate-btn',
    'button.run-btn',
    'button.go-btn',
    'button.fetch-btn',
    'button.load-btn',
  ];

  for (const sel of buttonSelectors) {
    try {
      const btn = await page.$(sel);
      if (btn) { await btn.click(); return true; }
    } catch {}
  }

  // Try finding button by text content
  try {
    const clicked = await page.evaluate(() => {
      const buttons = [...document.querySelectorAll("button")];
      const actionBtn = buttons.find(b => {
        const text = b.textContent?.toLowerCase() || "";
        return text.includes("search") || text.includes("analyze") || text.includes("appraise") ||
               text.includes("evaluate") || text.includes("estimate") || text.includes("submit") ||
               text.includes("run") || text.includes("go") || text.includes("fetch") ||
               text.includes("load") || text.includes("get") || text.includes("scan") ||
               text.includes("find") || text.includes("check") || text.includes("generate") ||
               text.includes("calculate") || text.includes("explore") || text.includes("look") ||
               text.includes("decode") || text.includes("trace") || text.includes("route") ||
               text.includes("score") || text.includes("test") || text.includes("value") ||
               text.includes("benchmark") || text.includes("brief") || text.includes("detect");
      });
      if (actionBtn) { actionBtn.click(); return true; }
      return false;
    });
    return clicked;
  } catch {
    return false;
  }
}

// Run
testApp(APP_NAME);
