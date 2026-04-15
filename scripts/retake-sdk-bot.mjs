import puppeteer from "puppeteer";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { statSync } from "node:fs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = "/Users/anandmahajan/projects/claude/marketcheck-mcp-apps";
const outDir = join(root, "static", "screenshots");
const BASE = `http://localhost:3005`;
const AK = process.env.ANTHROPIC_API_KEY;
const MK = process.env.MARKETCHECK_API_KEY;

async function run() {
  const browser = await puppeteer.launch({ headless: "shell", args: ["--no-sandbox","--disable-gpu"], protocolTimeout: 300000 });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });

  // Set keys
  await page.goto(`${BASE}/apps/chat-sdk-bot/dist/index.html`, { waitUntil: "domcontentloaded", timeout: 15000 });
  await page.evaluate((a, m) => {
    localStorage.setItem("mc_llm_key", a);
    localStorage.setItem("mc_llm_provider", "anthropic");
    localStorage.setItem("mc_api_key", m);
  }, AK, MK);
  await page.goto(`${BASE}/apps/chat-sdk-bot/dist/index.html`, { waitUntil: "domcontentloaded", timeout: 15000 });
  await new Promise(r => setTimeout(r, 2000));

  const queries = [
    "What are the top 5 selling used car brands in Texas?",
    "Find current Toyota incentives near ZIP 75201",
  ];

  for (let qi = 0; qi < queries.length; qi++) {
    const q = queries[qi];
    console.log(`[${qi+1}] "${q.slice(0,55)}..."`);
    const ta = await page.waitForSelector("textarea", { timeout: 5000 });
    await ta.click({ clickCount: 3 });
    await ta.type(q, { delay: 8 });
    const buttons = await page.$$("button");
    for (const btn of buttons) {
      const t = await btn.evaluate(el => el.textContent);
      if (t?.trim() === "Send") { await btn.click(); break; }
    }
    console.log("  waiting...");
    await new Promise(r => setTimeout(r, 6000));
    for (let i = 0; i < 24; i++) {
      const bt = await page.evaluate(() => {
        for (const b of document.querySelectorAll("button")) {
          if (b.textContent?.trim() === "Send") return "Send";
          if (b.textContent?.trim() === "...") return "...";
        }
        return "unknown";
      });
      if (bt === "Send") break;
      await new Promise(r => setTimeout(r, 5000));
    }
    await new Promise(r => setTimeout(r, 3000));
    await page.evaluate(() => {
      const el = document.querySelector("[style*='overflow-y:auto']") || document.querySelector("[style*='overflow-y: auto']");
      if (el) el.scrollTop = el.scrollHeight;
    });
    await new Promise(r => setTimeout(r, 1000));

    const suffix = qi === 0 ? "" : `-${qi + 1}`;
    const fn = `chat-sdk-bot${suffix}.png`;
    await page.screenshot({ path: join(outDir, fn), clip: { x: 0, y: 0, width: 1280, height: 900 } });
    const sz = statSync(join(outDir, fn)).size;
    console.log(`  ✓ ${fn} (${Math.round(sz/1024)}KB)`);
  }
  await page.close();
  await browser.close();
  console.log("Done.");
}
run();
