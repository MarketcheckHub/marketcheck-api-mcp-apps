import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerApp } from "../register-app.js";
import { MarketCheckClient } from "@mcp-apps/shared";

export function registerLenderPortfolioStressTest(server: McpServer) {
  const client = new MarketCheckClient();

  registerApp({
    server,
    toolName: "stress-test-portfolio",
    title: "Lender Portfolio Stress Test",
    description: "Model what-if depreciation scenarios against a loan portfolio. Stress test collateral values under various market decline scenarios.",
    htmlFileName: "lender-portfolio-stress-test",
    inputSchema: {
      type: "object",
      properties: {
        vins: {
          type: "array",
          items: {
            type: "object",
            properties: {
              vin: { type: "string" },
              loanAmount: { type: "number" },
            },
          },
          description: "Array of VINs with loan amounts (up to 20)",
        },
        scenario: {
          type: "string",
          enum: ["ev_drop_20", "trucks_drop_15", "market_wide_10", "custom"],
          description: "Stress scenario to apply",
        },
        customDropPct: {
          type: "number",
          description: "Custom drop percentage (5-30), used when scenario is 'custom'",
        },
      },
      required: ["vins"],
    },
    handler: async (args: { vins: Array<{ vin: string; loanAmount: number }>; scenario?: string; customDropPct?: number }) => {
      try {
        const results = await Promise.all(
          args.vins.slice(0, 20).map(async (v) => {
            try {
              const [decode, price] = await Promise.all([
                client.decodeVin(v.vin),
                client.predictPrice({ vin: v.vin, dealer_type: "franchise" }),
              ]);
              return { ...v, decode, price, error: null };
            } catch (e: any) {
              return { ...v, error: e.message };
            }
          })
        );

        const segmentData = await client.getSoldSummary({
          ranking_dimensions: "body_type,fuel_type_category",
          ranking_measure: "average_sale_price,sold_count",
        });

        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              portfolio: results,
              segments: segmentData,
              scenario: args.scenario || "market_wide_10",
              customDropPct: args.customDropPct,
            }),
          }],
        };
      } catch (e: any) {
        return { content: [{ type: "text", text: JSON.stringify({ error: e.message }) }] };
      }
    },
  });
}
