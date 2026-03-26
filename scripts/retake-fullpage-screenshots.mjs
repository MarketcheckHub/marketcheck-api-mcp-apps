#!/usr/bin/env node
import puppeteer from "puppeteer";
import { readdirSync, existsSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dirname, "..", "static", "screenshots");
const BASE = "http://localhost:3001";
const appsDir = join(__dirname, "..", "packages", "apps");

const apps = readdirSync(appsDir).filter(d => existsSync(join(appsDir, d, "dist", "index.html")));

async function run() {
  const browser = await puppeteer.launch({ headless: true, args: ["--no-sandbox"] });

  for (const app of apps) {
    if (app === "car-search-app") continue; // skip if being built
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 900 });

    try {
      await page.goto(`${BASE}/apps/${app}/dist/index.html`, { waitUntil: "networkidle0", timeout: 15000 });
      await new Promise(r => setTimeout(r, 2500));

      await page.screenshot({ path: join(outDir, `${app}.png`), fullPage: true });
      const size = statSync(join(outDir, `${app}.png`)).size;
      console.log(`✓ ${app} (${Math.round(size / 1024)}KB)`);
    } catch (e) {
      console.log(`✗ ${app}: ${e.message?.slice(0, 60)}`);
    }

    await page.close();
  }

  await browser.close();
  console.log("\nDone.");
}

run();
