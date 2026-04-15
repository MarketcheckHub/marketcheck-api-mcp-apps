#!/usr/bin/env node
/**
 * Fix the IIFE scoping issue in all new apps.
 * Moves helper functions from inside the IIFE try-catch to module scope.
 *
 * Before:
 *   const _safeApp = (() => { try { return new App({...});
 *   function _getAuth() {...}
 *   ...
 *   } catch { return null; } })();
 *
 * After:
 *   let _safeApp = null;
 *   try { _safeApp = new App({...}); } catch {}
 *   function _getAuth() {...}
 *   ...
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const appsDir = join(__dirname, "..", "packages", "apps");

const newApps = [
  "car-story", "vin-history-detective", "pricing-transparency-report",
  "incentive-deal-finder", "wholesale-vehicle-router", "dealer-inventory-fit-scorer",
  "uk-market-explorer", "uk-market-trends", "underwriting-decision-support",
  "insurance-premium-benchmarker", "incentive-adjusted-deal-eval", "auto-journalist-briefing",
  "auction-arbitrage-finder", "uk-dealer-pricing", "dealer-conquest-analyzer",
  "market-anomaly-detector", "lender-portfolio-stress-test", "rental-fleet-valuator",
  "fleet-lifecycle-manager"
];

for (const app of newApps) {
  const filePath = join(appsDir, app, "src", "main.ts");
  let code = readFileSync(filePath, "utf-8");

  // Find the IIFE opening pattern
  const iifeOpenPattern = /const _safeApp = \(\(\) => \{ try \{ return new App\(\{ name: "([^"]+)" \}\);/;
  const iifeClosePattern = /\s*\} catch \{ return null; \} \}\)\(\);/;

  const openMatch = code.match(iifeOpenPattern);
  if (!openMatch) {
    console.log(`⚠ ${app}: IIFE open pattern not found, skipping`);
    continue;
  }

  const appName = openMatch[1];

  // Find the closing line
  const closeMatch = code.match(iifeClosePattern);
  if (!closeMatch) {
    console.log(`⚠ ${app}: IIFE close pattern not found, skipping`);
    continue;
  }

  // Get the index positions
  const openEnd = code.indexOf(openMatch[0]) + openMatch[0].length;
  const closeStart = code.indexOf(closeMatch[0]);

  // Extract the functions between open and close
  const innerCode = code.substring(openEnd, closeStart);

  // Build the new structure
  const beforeIIFE = code.substring(0, code.indexOf(openMatch[0]));
  const afterIIFE = code.substring(closeStart + closeMatch[0].length);

  const newCode = `${beforeIIFE}let _safeApp: any = null;
try { _safeApp = new App({ name: "${appName}" }); } catch {}

${innerCode.trim()}
${afterIIFE}`;

  writeFileSync(filePath, newCode, "utf-8");
  console.log(`✓ ${app}`);
}

console.log("\nDone.");
