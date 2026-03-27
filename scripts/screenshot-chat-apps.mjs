#!/usr/bin/env node
/**
 * Take screenshots of all 7 chat demo apps with 2-3 queries each.
 * Sets API keys, sends queries one at a time, screenshots after each response.
 *
 * Usage: node scripts/screenshot-chat-apps.mjs [PORT]
 */
import puppeteer from "puppeteer";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { statSync } from "node:fs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dirname, "..", "static", "screenshots");
const PORT = process.argv[2] ?? "3005";
const BASE = `http://localhost:${PORT}`;

const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY ?? "";
const MC_API_KEY = process.env.MARKETCHECK_API_KEY ?? "";

const CHAT_APPS = [
  {
    id: "chat-vercel-ai",
    queries: [
      "Search for used Toyota RAV4 under $30,000 near 90210",
      "Decode VIN 5YJSA1DG9DFP14705",
      "What are the top 5 selling used car brands in California?",
    ],
  },
  {
    id: "chat-copilotkit",
    queries: [
      "What are the top selling SUVs in Texas?",
      "Find current Honda incentives near ZIP 60601",
    ],
  },
  {
    id: "chat-assistant-ui",
    queries: [
      "Decode VIN 5YJSA1DG9DFP14705 and predict its price",
      "Search for used BMW 3 Series under $35K near Chicago",
      "What incentives does Ford offer near ZIP 30301?",
    ],
  },
  {
    id: "chat-sdk-bot",
    queries: [
      "Search Toyota Camry under $25K near Chicago",
      "Predict price for VIN WBA7E2C51JG123456",
    ],
  },
  {
    id: "chat-chainlit",
    queries: [
      "Search for used Hyundai Tucson under $28K near 90210",
      "What are the best-selling body types nationwide?",
      "Find Kia incentives near ZIP 75201",
    ],
  },
  {
    id: "chat-streamlit",
    queries: [
      "Search Honda CR-V under $30K near 98101",
      "Decode VIN 1HGCV1F34LA000001",
    ],
  },
  {
    id: "chat-langchain",
    queries: [
      "Decode VIN 1HGCV1F34LA000001 and predict its market value",
      "What are the top 10 selling used car brands in New York?",
      "Find current Toyota incentives near 60601",
    ],
  },
];

async function waitForResponse(page) {
  // Wait for initial API call
  await new Promise(r => setTimeout(r, 5000));
  // Poll until Send button re-appears (loading done) or 120s timeout
  for (let i = 0; i < 24; i++) {
    const btnText = await page.evaluate(() => {
      const btns = document.querySelectorAll("button");
      for (const b of btns) {
        if (b.textContent?.trim() === "Send") return "Send";
        if (b.textContent?.trim() === "...") return "...";
      }
      return "unknown";
    });
    if (btnText === "Send") break;
    await new Promise(r => setTimeout(r, 5000));
  }
  // Extra render time
  await new Promise(r => setTimeout(r, 3000));
}

async function sendQuery(page, query) {
  const textarea = await page.waitForSelector("textarea", { timeout: 5000 });
  await textarea.click({ clickCount: 3 }); // select all existing text
  await textarea.type(query, { delay: 8 });

  // Find and click Send button
  const buttons = await page.$$("button");
  for (const btn of buttons) {
    const text = await btn.evaluate(el => el.textContent);
    if (text?.trim() === "Send") {
      await btn.click();
      break;
    }
  }
}

async function run() {
  const browser = await puppeteer.launch({
    headless: "shell",
    args: ["--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"],
    protocolTimeout: 300000,
  });

  let total = 0;
  let success = 0;

  for (const app of CHAT_APPS) {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 900, deviceScaleFactor: 1 });

    try {
      console.log(`\n━━━ ${app.id} (${app.queries.length} queries) ━━━`);

      // Set localStorage keys
      await page.goto(`${BASE}/apps/${app.id}/dist/index.html`, {
        waitUntil: "domcontentloaded", timeout: 15000,
      });
      await page.evaluate((aKey, mKey) => {
        localStorage.setItem("mc_llm_key", aKey);
        localStorage.setItem("mc_llm_provider", "anthropic");
        localStorage.setItem("mc_api_key", mKey);
      }, ANTHROPIC_KEY, MC_API_KEY);

      // Reload with keys
      await page.goto(`${BASE}/apps/${app.id}/dist/index.html`, {
        waitUntil: "domcontentloaded", timeout: 15000,
      });
      await new Promise(r => setTimeout(r, 2000));

      for (let qi = 0; qi < app.queries.length; qi++) {
        const query = app.queries[qi];
        total++;

        console.log(`  [${qi + 1}/${app.queries.length}] "${query.slice(0, 60)}..."`);

        await sendQuery(page, query);
        console.log(`      waiting for response...`);
        await waitForResponse(page);

        // Scroll to bottom to show latest response
        await page.evaluate(() => {
          const chatArea = document.querySelector("[style*='overflow-y:auto']") || document.querySelector("[style*='overflow-y: auto']");
          if (chatArea) chatArea.scrollTop = chatArea.scrollHeight;
        });
        await new Promise(r => setTimeout(r, 1000));

        const suffix = qi === 0 ? "" : `-${qi + 1}`;
        const filename = `${app.id}${suffix}.png`;
        await page.screenshot({
          path: join(outDir, filename),
          clip: { x: 0, y: 0, width: 1280, height: 900 },
        });
        const size = statSync(join(outDir, filename)).size;
        console.log(`      ✓ ${filename} (${Math.round(size / 1024)}KB)`);
        success++;
      }
    } catch (e) {
      console.log(`  ✗ ${app.id}: ${e.message?.slice(0, 120)}`);
      // Save error-state screenshot
      try {
        await page.screenshot({
          path: join(outDir, `${app.id}.png`),
          clip: { x: 0, y: 0, width: 1280, height: 900 },
        });
      } catch {}
    }

    await page.close();
  }

  await browser.close();
  console.log(`\nDone. ${success}/${total} screenshots captured.`);
}

run();
