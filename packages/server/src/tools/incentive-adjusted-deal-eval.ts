import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerApp } from "../register-app.js";
import { MarketCheckClient } from "@mcp-apps/shared";

export function registerIncentiveAdjustedDealEval(server: McpServer) {
  const client = new MarketCheckClient();

  registerApp({
    server,
    toolName: "evaluate-incentive-deal",
    title: "Incentive-Adjusted Deal Evaluator",
    description: "Combines deal evaluation with OEM incentives to calculate true out-of-pocket cost after rebates, low-APR savings, and lease offers.",
    htmlFileName: "incentive-adjusted-deal-eval",
    inputSchema: {
      type: "object",
      properties: {
        vin: { type: "string", description: "17-character Vehicle Identification Number" },
        zip: { type: "string", description: "ZIP code for regional incentives" },
        asking_price: { type: "number", description: "Dealer's asking price in dollars" },
      },
      required: ["vin"],
    },
    handler: async (args: { vin: string; zip?: string; asking_price?: number }) => {
      try {
        // 1. Decode VIN
        const vinData = await client.decodeVin(args.vin);

        const vehicle = {
          vin: args.vin,
          year: vinData.year ?? 0,
          make: vinData.make ?? "Unknown",
          model: vinData.model ?? "Unknown",
          trim: vinData.trim ?? "",
          bodyType: vinData.body_type ?? "",
          fuelType: vinData.fuel_type ?? "",
          msrp: vinData.msrp ?? 0,
        };

        // 2. Predict price + search incentives + search active comparables
        const [priceResult, incentivesResult, searchResult] = await Promise.all([
          client.predictPrice({
            vin: args.vin,
            dealer_type: "franchise",
            zip: args.zip,
          }),
          args.zip
            ? client.searchOemIncentivesByZip({
                oem: vehicle.make,
                zip: args.zip,
                model: vehicle.model,
              })
            : Promise.resolve(null),
          client.searchActiveCars({
            year: String(vehicle.year),
            make: vehicle.make,
            model: vehicle.model,
            zip: args.zip,
            radius: 75,
            rows: 5,
            stats: "price",
          }),
        ]);

        const predictedPrice = priceResult.predicted_price ?? priceResult.price ?? 0;
        const askingPrice = args.asking_price ?? predictedPrice;

        // Build comparables
        const listings = searchResult.listings ?? [];
        const comparables = listings
          .filter((l: any) => l.vin !== args.vin)
          .slice(0, 5)
          .map((l: any) => ({
            year: l.year ?? vehicle.year,
            make: l.make ?? vehicle.make,
            model: l.model ?? vehicle.model,
            trim: l.trim ?? "",
            price: l.price ?? 0,
            miles: l.miles ?? 0,
            city: l.dealer?.city ?? "",
            state: l.dealer?.state ?? "",
            dealerName: l.dealer?.name ?? "Unknown",
          }));

        const result = {
          vehicle,
          stickerPrice: vehicle.msrp,
          askingPrice,
          predictedFMV: predictedPrice,
          incentivesRaw: incentivesResult,
          comparables,
          searchStats: searchResult.stats,
        };

        return { content: [{ type: "text", text: JSON.stringify(result) }] };
      } catch (e: any) {
        return { content: [{ type: "text", text: JSON.stringify({ error: e.message }) }] };
      }
    },
  });
}
