#!/usr/bin/env node
/**
 * Inject responsive CSS into all 25 apps.
 * Adds a <style> tag via JS that handles mobile layouts.
 */
import { readdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const appsDir = join(import.meta.dirname, "..", "packages", "apps");

const RESPONSIVE_INJECT = `
// ── Responsive CSS Injection ───────────────────────────────────────────
(function injectResponsiveStyles() {
  const s = document.createElement("style");
  s.textContent = \`
    @media (max-width: 768px) {
      body { font-size: 13px !important; }
      table { font-size: 12px !important; }
      th, td { padding: 6px 8px !important; }
      h1 { font-size: 18px !important; }
      h2 { font-size: 15px !important; }
      canvas { max-width: 100% !important; }
      input, select, button { font-size: 14px !important; }
      /* Fix grid/flex layouts to stack on mobile */
      [style*="display:flex"][style*="gap"],
      [style*="display: flex"][style*="gap"] { flex-wrap: wrap !important; }
      [style*="grid-template-columns: repeat"] { grid-template-columns: 1fr !important; }
      [style*="grid-template-columns:repeat"] { grid-template-columns: 1fr !important; }
      /* Ensure tables scroll horizontally */
      div[style*="overflow-x:auto"], div[style*="overflow-x: auto"] { -webkit-overflow-scrolling: touch; }
      table { min-width: 600px; }
      /* Stack panels that use percentage widths */
      [style*="width:35%"], [style*="width:40%"], [style*="width:25%"],
      [style*="width:50%"], [style*="width:60%"], [style*="width:65%"],
      [style*="width: 35%"], [style*="width: 40%"], [style*="width: 25%"],
      [style*="width: 50%"], [style*="width: 60%"], [style*="width: 65%"] {
        width: 100% !important;
        min-width: 0 !important;
      }
    }
    @media (max-width: 480px) {
      body { padding: 8px !important; }
      h1 { font-size: 16px !important; }
      th, td { padding: 4px 6px !important; font-size: 11px !important; }
      input, select { max-width: 100% !important; width: 100% !important; box-sizing: border-box !important; }
    }
  \`;
  document.head.appendChild(s);
})();
`;

const apps = readdirSync(appsDir).filter(d => existsSync(join(appsDir, d, "src", "main.ts")));
let patched = 0;

for (const app of apps) {
  const mainPath = join(appsDir, app, "src", "main.ts");
  let code = readFileSync(mainPath, "utf-8");

  if (code.includes("injectResponsiveStyles")) {
    console.log(`  - ${app} (already patched)`);
    continue;
  }

  // Insert after the data provider block (or at the start if no data provider)
  const marker = "// ── End Data Provider";
  const idx = code.indexOf(marker);
  if (idx !== -1) {
    const insertAt = code.indexOf("\n", idx) + 1;
    code = code.slice(0, insertAt) + RESPONSIVE_INJECT + code.slice(insertAt);
  } else {
    // Prepend after imports
    const lastImportEnd = code.lastIndexOf("import ");
    if (lastImportEnd !== -1) {
      const afterImport = code.indexOf("\n", code.indexOf(";", lastImportEnd)) + 1;
      code = code.slice(0, afterImport) + RESPONSIVE_INJECT + code.slice(afterImport);
    } else {
      code = RESPONSIVE_INJECT + code;
    }
  }

  writeFileSync(mainPath, code);
  console.log(`  ✓ ${app}`);
  patched++;
}

console.log(`\nDone: ${patched} apps patched with responsive CSS.`);
