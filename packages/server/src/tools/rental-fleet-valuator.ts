import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerApp } from "../register-app.js";
import { MarketCheckClient } from "@mcp-apps/shared";

export function registerRentalFleetValuator(server: McpServer) {
  const client = new MarketCheckClient();

  registerApp({
    server,
    toolName: "value-rental-fleet",
    title: "Rental & Subscription Fleet Valuator",
    description: "Mileage-adjusted fleet valuation with optimal rotation timing. Project depreciation curves and identify vehicles past optimal hold period.",
    htmlFileName: "rental-fleet-valuator",
    inputSchema: {
      type: "object",
      properties: {
        vehicles: {
          type: "array",
          items: {
            type: "object",
            properties: {
              vin: { type: "string" },
              currentMiles: { type: "number" },
              monthlyMileage: { type: "number", description: "Average monthly mileage rate" },
            },
          },
          description: "Fleet vehicles with VIN, current miles, and monthly mileage rate",
        },
      },
      required: ["vehicles"],
    },
    handler: async (args: { vehicles: Array<{ vin: string; currentMiles: number; monthlyMileage: number }> }) => {
      try {
        const results = await Promise.all(
          args.vehicles.slice(0, 20).map(async (v) => {
            try {
              const [decode, priceNow] = await Promise.all([
                client.decodeVin(v.vin),
                client.predictPrice({ vin: v.vin, miles: v.currentMiles, dealer_type: "franchise" }),
              ]);

              // Predict at future mileage points: 6, 12, 18 months
              const projections = await Promise.all(
                [6, 12, 18].map(async (months) => {
                  const futureMiles = v.currentMiles + v.monthlyMileage * months;
                  try {
                    const pred = await client.predictPrice({ vin: v.vin, miles: futureMiles, dealer_type: "franchise" });
                    return { months, miles: futureMiles, prediction: pred };
                  } catch {
                    return { months, miles: futureMiles, prediction: null };
                  }
                })
              );

              return { ...v, decode, priceNow, projections, error: null };
            } catch (e: any) {
              return { ...v, error: e.message };
            }
          })
        );

        const segmentData = await client.getSoldSummary({
          ranking_dimensions: "body_type",
          ranking_measure: "average_sale_price,sold_count",
        });

        return {
          content: [{
            type: "text",
            text: JSON.stringify({ fleet: results, segments: segmentData }),
          }],
        };
      } catch (e: any) {
        return { content: [{ type: "text", text: JSON.stringify({ error: e.message }) }] };
      }
    },
  });
}
