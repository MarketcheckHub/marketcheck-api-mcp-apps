import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerApp } from "../register-app.js";
import { MarketCheckClient } from "@mcp-apps/shared";

export function registerAuctionArbitrageFinder(server: McpServer) {
  const client = new MarketCheckClient();

  registerApp({
    server,
    toolName: "find-auction-arbitrage",
    title: "Auction Arbitrage Finder",
    description:
      "Compare wholesale vs retail price predictions for a batch of VINs to surface gross profit potential. Shows decoded specs, waterfall economics, and local retail demand.",
    htmlFileName: "auction-arbitrage-finder",
    inputSchema: {
      type: "object",
      properties: {
        vins: {
          type: "string",
          description: "Comma-separated list of VINs to analyze (up to 10)",
        },
        zip: {
          type: "string",
          description: "ZIP code for local market pricing and demand",
        },
      },
      required: ["vins", "zip"],
    },
    handler: async (args: { vins: string; zip: string }) => {
      try {
        const vinList = args.vins
          .split(/[,\n]+/)
          .map((v) => v.trim())
          .filter(Boolean)
          .slice(0, 10);

        const vehicles = await Promise.all(
          vinList.map(async (vin) => {
            // 1. Decode VIN
            let decoded: any = {};
            try {
              decoded = await client.decodeVin(vin);
            } catch {
              // continue with partial data
            }

            const year = decoded?.year ?? 0;
            const make = decoded?.make ?? "";
            const model = decoded?.model ?? "";
            const trim = decoded?.trim ?? "";
            const bodyType = decoded?.body_type ?? "";
            const engine = decoded?.engine ?? "";
            const drivetrain = decoded?.drivetrain ?? "";
            const miles = decoded?.miles ?? 35000;

            // 2. Predict wholesale price (independent dealer_type)
            let wholesalePrice = 0;
            try {
              const wp = await client.predictPrice({
                vin,
                miles,
                dealer_type: "independent",
                zip: args.zip,
              });
              wholesalePrice = wp?.predicted_price ?? 0;
            } catch {
              // fallback
            }

            // 3. Predict retail price (franchise dealer_type)
            let retailPrice = 0;
            let compCount = 0;
            try {
              const rp = await client.predictPrice({
                vin,
                miles,
                dealer_type: "franchise",
                zip: args.zip,
              });
              retailPrice = rp?.predicted_price ?? 0;
              compCount = rp?.comparables_count ?? 0;
            } catch {
              // fallback
            }

            // 4. Search active cars for local demand
            let activeCount = 0;
            let avgDom = 0;
            try {
              if (make && model) {
                const active = await client.searchActiveCars({
                  make,
                  model,
                  year: String(year),
                  zip: args.zip,
                  radius: 50,
                  rows: 0,
                  stats: "dom",
                });
                activeCount = active?.num_found ?? 0;
                avgDom = active?.stats?.dom?.mean
                  ? Math.round(active.stats.dom.mean)
                  : 0;
              }
            } catch {
              // not critical
            }

            const reconEstimate = 1500;
            const grossProfit = retailPrice - wholesalePrice - reconEstimate;
            const profitMargin =
              retailPrice > 0
                ? Math.round(
                    ((grossProfit / retailPrice) * 100) * 10
                  ) / 10
                : 0;

            return {
              vin,
              year,
              make,
              model,
              trim,
              bodyType,
              engine,
              drivetrain,
              miles,
              wholesalePrice: Math.round(wholesalePrice),
              retailPrice: Math.round(retailPrice),
              reconEstimate,
              grossProfit: Math.round(grossProfit),
              profitMargin,
              activeCount,
              avgDom,
              compCount,
            };
          })
        );

        // Sort by profit margin descending
        vehicles.sort((a, b) => b.profitMargin - a.profitMargin);

        return {
          content: [{ type: "text", text: JSON.stringify({ vehicles }) }],
        };
      } catch (e: any) {
        return {
          content: [{ type: "text", text: JSON.stringify({ error: e.message }) }],
        };
      }
    },
  });
}
