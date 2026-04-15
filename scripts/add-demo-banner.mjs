#!/usr/bin/env node
/**
 * Adds the standard demo-mode API key banner to all apps that have _detectAppMode.
 * Skips apps that already have the banner. Skips vin-market-report (already done manually).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { readdirSync } from "node:fs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

const BANNER_CODE = `
  // ── Demo mode banner ──
  if (_detectAppMode() === "demo") {
    const _db = document.createElement("div");
    _db.id = "_demo_banner";
    _db.style.cssText = "background:linear-gradient(135deg,#92400e22,#f59e0b11);border:1px solid #f59e0b44;border-radius:10px;padding:14px 20px;margin-bottom:12px;display:flex;align-items:center;gap:14px;flex-wrap:wrap;";
    _db.innerHTML = \`
      <div style="flex:1;min-width:200px;">
        <div style="font-size:13px;font-weight:700;color:#fbbf24;margin-bottom:2px;">&#9888; Demo Mode — Showing sample data</div>
        <div style="font-size:12px;color:#d97706;">Enter your MarketCheck API key to see real market data. <a href="https://developers.marketcheck.com" target="_blank" style="color:#fbbf24;text-decoration:underline;">Get a free key</a></div>
      </div>
      <div style="display:flex;gap:8px;align-items:center;">
        <input id="_banner_key" type="text" placeholder="Paste your API key" style="padding:8px 12px;border-radius:6px;border:1px solid #f59e0b44;background:#0f172a;color:#e2e8f0;font-size:13px;width:220px;outline:none;" />
        <button id="_banner_save" style="padding:8px 16px;border-radius:6px;border:none;background:#f59e0b;color:#0f172a;font-size:12px;font-weight:700;cursor:pointer;white-space:nowrap;">Activate</button>
      </div>\`;
    container.appendChild(_db);
    _db.querySelector("#_banner_save").addEventListener("click", () => {
      const k = _db.querySelector("#_banner_key").value.trim();
      if (!k) return;
      localStorage.setItem("mc_api_key", k);
      _db.style.background = "linear-gradient(135deg,#05966922,#10b98111)";
      _db.style.borderColor = "#10b98144";
      _db.innerHTML = '<div style="font-size:13px;font-weight:700;color:#10b981;">&#10003; API key saved — reloading with live data...</div>';
      setTimeout(() => location.reload(), 800);
    });
    _db.querySelector("#_banner_key").addEventListener("keydown", (e) => { if (e.key === "Enter") _db.querySelector("#_banner_save").click(); });
  }`;

const appsDir = path.join(ROOT, "packages", "apps");
const files = readdirSync(appsDir)
  .map(d => path.join(appsDir, d, "src", "main.ts"))
  .filter(f => fs.existsSync(f));
let updated = 0, skipped = 0;

for (const file of files) {
  const src = fs.readFileSync(file, "utf8");
  const appName = path.basename(path.dirname(path.dirname(file)));

  // Skip if no _detectAppMode
  if (!src.includes("_detectAppMode")) { skipped++; continue; }
  // Skip if already has the banner
  if (src.includes("_demo_banner")) { console.log(`  SKIP (has banner): ${appName}`); skipped++; continue; }

  // Find the insertion point: right after "container.appendChild" or "document.body.appendChild(container)"
  // and before the header/first content section
  // Pattern: look for the line that appends container to body, then inject after it

  // Strategy: insert after the first "container.appendChild(header);" or right before "// ── Header"
  // More reliable: insert right after "document.body.appendChild(container);" or "outerWrap.appendChild(container);"

  let newSrc = src;
  let inserted = false;

  // Try pattern 1: document.body.appendChild(container);
  const bodyAppend = "document.body.appendChild(container);";
  if (src.includes(bodyAppend) && !inserted) {
    newSrc = src.replace(bodyAppend, bodyAppend + "\n" + BANNER_CODE);
    inserted = true;
  }

  // Try pattern 2: outerWrap.appendChild(container);
  if (!inserted && src.includes("outerWrap.appendChild(container);")) {
    newSrc = src.replace("outerWrap.appendChild(container);", "outerWrap.appendChild(container);\n" + BANNER_CODE);
    inserted = true;
  }

  // Try pattern 3: apps that use document.body.innerHTML = "" then append — inject after that
  if (!inserted && src.includes('document.body.innerHTML = ""')) {
    const bannerForBody = BANNER_CODE.replace(/container\.appendChild\(_db\)/g, "document.body.appendChild(_db)");
    // Insert after the first document.body.appendChild (the header)
    const headerAppendMatch = src.match(/document\.body\.appendChild\(header\);/);
    if (headerAppendMatch) {
      newSrc = src.replace(headerAppendMatch[0], headerAppendMatch[0] + "\n" + bannerForBody);
      inserted = true;
    }
  }

  // Try pattern 4: apps with multiline document.body.style.cssText = ... (no container)
  if (!inserted) {
    const bodyStyleMatch = src.match(/document\.body\.style\.cssText\s*=/);
    if (bodyStyleMatch) {
      // Find the first document.body.appendChild after the style line
      const styleIdx = src.indexOf(bodyStyleMatch[0]);
      const afterStyle = src.indexOf("document.body.appendChild(", styleIdx);
      if (afterStyle > -1) {
        const lineEnd = src.indexOf(";", afterStyle);
        if (lineEnd > -1) {
          const insertPoint = lineEnd + 1;
          const bannerForBody = BANNER_CODE.replace(/container\.appendChild\(_db\)/g, "document.body.appendChild(_db)");
          newSrc = src.slice(0, insertPoint) + "\n" + bannerForBody + src.slice(insertPoint);
          inserted = true;
        }
      }
    }
  }

  // Try pattern 5: apps with document.body.appendChild(root);
  if (!inserted && src.includes("document.body.appendChild(root)")) {
    const bannerForBody = BANNER_CODE.replace(/container\.appendChild\(_db\)/g, "document.body.insertBefore(_db, document.body.firstChild)");
    newSrc = src.replace("document.body.appendChild(root);", "document.body.appendChild(root);\n" + bannerForBody);
    inserted = true;
  }

  // Try pattern 6: fallback — inject after any document.body.appendChild line
  if (!inserted) {
    const match = src.match(/document\.body\.appendChild\(\w+\);/);
    if (match) {
      const bannerForBody = BANNER_CODE.replace(/container\.appendChild\(_db\)/g, "document.body.insertBefore(_db, document.body.firstChild)");
      // Insert only after the LAST document.body.appendChild to avoid breaking init
      const lastIdx = src.lastIndexOf(match[0]);
      const insertPoint = lastIdx + match[0].length;
      newSrc = src.slice(0, insertPoint) + "\n" + bannerForBody + src.slice(insertPoint);
      inserted = true;
    }
  }

  if (inserted) {
    fs.writeFileSync(file, newSrc);
    updated++;
    console.log(`  UPDATED: ${appName}`);
  } else {
    console.log(`  SKIP (no insertion point): ${appName}`);
    skipped++;
  }
}

console.log(`\nDone: ${updated} updated, ${skipped} skipped.`);
