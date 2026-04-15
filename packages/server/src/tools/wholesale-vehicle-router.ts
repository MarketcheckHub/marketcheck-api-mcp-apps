import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerApp } from "../register-app.js";
import { MarketCheckClient } from "@mcp-apps/shared";

export function registerWholesaleVehicleRouter(server: McpServer) {
  const client = new MarketCheckClient();

  registerApp({
    server,
    toolName: "route-wholesale-vehicles",
    title: "Wholesale Vehicle Router",
    description:
      "Paste VINs and get dealer-match rankings showing which dealer should get which car. Decodes each VIN, ranks dealers, and predicts prices.",
    htmlFileName: "wholesale-vehicle-router",
    inputSchema: {
      type: "object",
      properties: {
        vins: {
          type: "string",
          description: "Comma-separated VINs (up to 20)",
        },
        zip: {
          type: "string",
          description: "ZIP code for dealer search radius",
        },
        radius: {
          type: "number",
          description: "Search radius in miles (default 50)",
        },
      },
      required: ["vins"],
    },
    handler: async (args: { vins: string; zip?: string; radius?: number }) => {
      try {
        const vinList = args.vins
          .split(",")
          .map((v) => v.trim())
          .filter((v) => v.length >= 11)
          .slice(0, 20);

        const results = await Promise.all(
          vinList.map(async (vin) => {
            try {
              const [decode, dealers, price] = await Promise.all([
                client.decodeVin(vin),
                client.rankDealersForVehicle({
                  vin,
                  zip: args.zip,
                  radius: args.radius || 50,
                }),
                client.predictPrice({
                  vin,
                  zip: args.zip,
                }),
              ]);

              return {
                vin,
                vehicle: decode,
                dealers: dealers,
                priceRange: price,
                error: null,
              };
            } catch (e: any) {
              return { vin, error: e.message };
            }
          })
        );

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                results,
                totalVins: vinList.length,
                zip: args.zip,
                radius: args.radius || 50,
              }),
            },
          ],
        };
      } catch (e: any) {
        return {
          content: [{ type: "text", text: JSON.stringify({ error: e.message }) }],
        };
      }
    },
  });
}
