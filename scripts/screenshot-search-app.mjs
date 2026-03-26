#!/usr/bin/env node
import puppeteer from "puppeteer";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { statSync } from "node:fs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dirname, "..", "static", "screenshots");
const BASE = "http://localhost:3001";

async function run() {
  const browser = await puppeteer.launch({ headless: true, args: ["--no-sandbox"] });

  // 1. SERP view (default)
  console.log("Taking SERP screenshot...");
  const serp = await browser.newPage();
  await serp.setViewport({ width: 1280, height: 900 });
  await serp.goto(`${BASE}/apps/car-search-app/dist/index.html#/search`, { waitUntil: "networkidle0", timeout: 15000 });
  await new Promise(r => setTimeout(r, 3000));
  await serp.screenshot({ fullPage: true, path: join(outDir, "car-search-app.png") });
  await serp.screenshot({ fullPage: true, path: join(outDir, "car-search-app-form.png") });
  console.log(`  ✓ car-search-app.png (${Math.round(statSync(join(outDir, "car-search-app.png")).size / 1024)}KB)`);

  // 2. Vehicle Details view — click first card
  console.log("Taking Details screenshot...");
  // Try clicking a "View Details" button
  const detailsBtns = await serp.$$("button, a");
  for (const btn of detailsBtns) {
    const text = await serp.evaluate(el => el.textContent, btn);
    if (text?.includes("View Details") || text?.includes("Details")) {
      await btn.click();
      break;
    }
  }
  await new Promise(r => setTimeout(r, 2000));
  await serp.screenshot({ fullPage: true, path: join(outDir, "car-search-app-result.png") });
  console.log(`  ✓ car-search-app-result.png (Details) (${Math.round(statSync(join(outDir, "car-search-app-result.png")).size / 1024)}KB)`);
  await serp.close();

  // 3. NLP Search view
  console.log("Taking NLP search screenshot...");
  const nlp = await browser.newPage();
  await nlp.setViewport({ width: 1280, height: 900 });
  await nlp.goto(`${BASE}/apps/car-search-app/dist/index.html#/nlp`, { waitUntil: "networkidle0", timeout: 15000 });
  await new Promise(r => setTimeout(r, 2000));
  // Type a query
  const textarea = await nlp.$("textarea");
  if (textarea) {
    await textarea.type("Red Toyota Camry under $25,000 near Denver");
  }
  await new Promise(r => setTimeout(r, 1000));
  await nlp.screenshot({ fullPage: true, path: join(outDir, "car-search-app-nlp.png") });
  console.log(`  ✓ car-search-app-nlp.png (${Math.round(statSync(join(outDir, "car-search-app-nlp.png")).size / 1024)}KB)`);
  await nlp.close();

  await browser.close();
  console.log("\nDone.");
}

run();
