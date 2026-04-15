import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerApp } from "../register-app.js";
import { MarketCheckClient } from "@mcp-apps/shared";

export function registerFleetLifecycleManager(server: McpServer) {
  const client = new MarketCheckClient();

  registerApp({
    server,
    toolName: "manage-fleet-lifecycle",
    title: "Fleet Lifecycle Manager",
    description: "Monitor a fleet of vehicles with current market values, depreciation, and optimal replacement timing. Includes replacement candidate search.",
    htmlFileName: "fleet-lifecycle-manager",
    inputSchema: {
      type: "object",
      properties: {
        vehicles: {
          type: "array",
          items: {
            type: "object",
            properties: {
              vin: { type: "string" },
              acquisitionCost: { type: "number" },
              currentMiles: { type: "number" },
            },
          },
          description: "Fleet vehicles with VIN, acquisition cost, and current miles",
        },
      },
      required: ["vehicles"],
    },
    handler: async (args: { vehicles: Array<{ vin: string; acquisitionCost: number; currentMiles: number }> }) => {
      try {
        const results = await Promise.all(
          args.vehicles.slice(0, 20).map(async (v) => {
            try {
              const [decode, price] = await Promise.all([
                client.decodeVin(v.vin),
                client.predictPrice({ vin: v.vin, miles: v.currentMiles, dealer_type: "franchise" }),
              ]);
              return { ...v, decode, price, error: null };
            } catch (e: any) {
              return { ...v, error: e.message };
            }
          })
        );

        // Get replacement candidates for flagged vehicles
        const flaggedVehicles = results.filter((r) => {
          if (r.error) return false;
          const currentValue = r.price?.predicted_price || 0;
          const deprPct = ((r.acquisitionCost - currentValue) / r.acquisitionCost) * 100;
          return deprPct > 40 || r.currentMiles > 80000;
        });

        const replacements = await Promise.all(
          flaggedVehicles.slice(0, 5).map(async (v) => {
            try {
              const bodyType = v.decode?.body_type || "SUV";
              const candidates = await client.searchActiveCars({
                body_type: bodyType,
                year: "2024-2025",
                rows: 3,
                sort_by: "price",
                sort_order: "asc",
              });
              return { forVin: v.vin, candidates: candidates?.listings || [] };
            } catch {
              return { forVin: v.vin, candidates: [] };
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
            text: JSON.stringify({
              fleet: results,
              replacements,
              segments: segmentData,
            }),
          }],
        };
      } catch (e: any) {
        return { content: [{ type: "text", text: JSON.stringify({ error: e.message }) }] };
      }
    },
  });
}
