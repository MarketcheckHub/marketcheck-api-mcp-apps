import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerApp } from "../register-app.js";
import { MarketCheckClient } from "@mcp-apps/shared";

export function registerDealerInventoryFitScorer(server: McpServer) {
  const client = new MarketCheckClient();

  registerApp({
    server,
    toolName: "score-dealer-fit",
    title: "Dealer Inventory Fit Scorer",
    description:
      "Enter a dealership ID and candidate VINs to see which cars match the dealer's sales DNA. Scores vehicles on brand fit, body type, and market demand.",
    htmlFileName: "dealer-inventory-fit-scorer",
    inputSchema: {
      type: "object",
      properties: {
        dealer_id: {
          type: "string",
          description: "Dealer ID or dealer domain to evaluate against",
        },
        zip: {
          type: "string",
          description: "Dealer ZIP code for pricing context",
        },
        vins: {
          type: "string",
          description: "Comma-separated candidate VINs to score",
        },
      },
      required: ["dealer_id", "vins"],
    },
    handler: async (args: { dealer_id: string; zip?: string; vins: string }) => {
      try {
        const vinList = args.vins
          .split(",")
          .map((v) => v.trim())
          .filter((v) => v.length >= 11)
          .slice(0, 20);

        // Get dealer vehicle rankings to understand dealer preferences
        let dealerRankings: any = null;
        try {
          dealerRankings = await client.rankVehiclesForDealer({
            dealer_id: args.dealer_id,
          });
        } catch {
          // Dealer ranking may not be available
        }

        // For each VIN: decode + predict price
        const candidates = await Promise.all(
          vinList.map(async (vin) => {
            try {
              const [decode, price] = await Promise.all([
                client.decodeVin(vin),
                client.predictPrice({
                  vin,
                  zip: args.zip,
                }),
              ]);

              return {
                vin,
                decode,
                price,
                dealerRankings,
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
                dealer_id: args.dealer_id,
                zip: args.zip,
                candidates,
                dealerRankings,
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
