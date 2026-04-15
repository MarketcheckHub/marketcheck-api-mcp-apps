#!/usr/bin/env node
import puppeteer from "puppeteer";
import { readdirSync, existsSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dirname, "..", "static", "screenshots");
const BASE = "http://localhost:3001";
const appsDir = join(__dirname, "..", "packages", "apps");

const apps = readdirSync(appsDir).filter(d =>
  existsSync(join(appsDir, d, "dist", "index.html"))
);

async function run() {
  const browser = await puppeteer.launch({
    headless: "shell",
    args: ["--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"],
    protocolTimeout: 180000,
  });

  let success = 0;
  let failed = 0;

  for (const app of apps) {
    if (app === "car-search-app") continue;
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 900, deviceScaleFactor: 1 });

    try {
      await page.goto(`${BASE}/apps/${app}/dist/index.html`, {
        waitUntil: "domcontentloaded",
        timeout: 15000,
      });
      await new Promise(r => setTimeout(r, 3000));

      // Use clip to capture just the viewport area
      await page.screenshot({
        path: join(outDir, `${app}.png`),
        clip: { x: 0, y: 0, width: 1280, height: 900 },
      });
      const size = statSync(join(outDir, `${app}.png`)).size;
      console.log(`\u2713 ${app} (${Math.round(size / 1024)}KB)`);
      success++;
    } catch (e) {
      console.log(`\u2717 ${app}: ${e.message?.slice(0, 80)}`);
      failed++;
    }

    await page.close();
  }

  await browser.close();
  console.log(`\nDone. ${success} success, ${failed} failed.`);
}

run();
