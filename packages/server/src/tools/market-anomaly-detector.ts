import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerApp } from "../register-app.js";
import { MarketCheckClient } from "@mcp-apps/shared";

export function registerMarketAnomalyDetector(server: McpServer) {
  const client = new MarketCheckClient();

  registerApp({
    server,
    toolName: "detect-market-anomalies",
    title: "Market Anomaly Detector",
    description: "Scan market for pricing anomalies — vehicles listed significantly below market value. Uses statistical analysis to find outliers.",
    htmlFileName: "market-anomaly-detector",
    inputSchema: {
      type: "object",
      properties: {
        make: { type: "string", description: "Vehicle make (e.g. Toyota)" },
        model: { type: "string", description: "Vehicle model (e.g. RAV4)" },
        year: { type: "string", description: "Model year or range (e.g. 2022 or 2020-2024)" },
        state: { type: "string", description: "US state code (e.g. CO)" },
        sensitivity: { type: "number", description: "Anomaly sensitivity in standard deviations (1-3, default 2)" },
      },
      required: ["make", "model"],
    },
    handler: async (args: { make: string; model: string; year?: string; state?: string; sensitivity?: number }) => {
      try {
        const searchResult = await client.searchActiveCars({
          make: args.make,
          model: args.model,
          year: args.year,
          state: args.state,
          rows: 50,
          stats: "price,miles,dom",
          sort_by: "price",
          sort_order: "asc",
        });

        const listings = searchResult?.listings || [];
        const outlierVins = listings.slice(0, 5).map((l: any) => l.vin).filter(Boolean);

        const predictions = await Promise.all(
          outlierVins.map(async (vin: string) => {
            try {
              const pred = await client.predictPrice({ vin, dealer_type: "franchise" });
              return { vin, prediction: pred };
            } catch (e: any) {
              return { vin, error: e.message };
            }
          })
        );

        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              search: searchResult,
              predictions,
              params: args,
            }),
          }],
        };
      } catch (e: any) {
        return { content: [{ type: "text", text: JSON.stringify({ error: e.message }) }] };
      }
    },
  });
}
