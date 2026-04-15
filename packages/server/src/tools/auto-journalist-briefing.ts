import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerApp } from "../register-app.js";
import { MarketCheckClient } from "@mcp-apps/shared";

export function registerAutoJournalistBriefing(server: McpServer) {
  const client = new MarketCheckClient();

  registerApp({
    server,
    toolName: "generate-market-briefing",
    title: "Auto Journalist Market Briefing",
    description: "One-page market briefing with key auto market stats, trending segments, and quotable data points for automotive media.",
    htmlFileName: "auto-journalist-briefing",
    inputSchema: {
      type: "object",
      properties: {},
      required: [],
    },
    handler: async () => {
      try {
        // Fetch multiple summary dimensions in parallel
        const [makeSummary, bodyTypeSummary, stateSummary, evSummary] = await Promise.all([
          client.getSoldSummary({
            ranking_dimensions: "make",
            ranking_measure: "sold_count,average_sale_price,average_days_on_market",
            ranking_order: "desc",
            top_n: 20,
          }),
          client.getSoldSummary({
            ranking_dimensions: "body_type",
            ranking_measure: "sold_count,average_sale_price,average_days_on_market",
            ranking_order: "desc",
            top_n: 15,
          }),
          client.getSoldSummary({
            ranking_dimensions: "state",
            ranking_measure: "sold_count,average_sale_price",
            ranking_order: "desc",
            top_n: 50,
          }),
          client.getSoldSummary({
            fuel_type_category: "EV",
            ranking_dimensions: "make,model",
            ranking_measure: "sold_count,average_sale_price,average_days_on_market",
            ranking_order: "desc",
            top_n: 10,
          }),
        ]);

        // Fetch model-level data for top gainers/losers
        const modelSummary = await client.getSoldSummary({
          ranking_dimensions: "make,model",
          ranking_measure: "sold_count,average_sale_price",
          ranking_order: "desc",
          top_n: 30,
        });

        const result = {
          makeSummary,
          bodyTypeSummary,
          stateSummary,
          evSummary,
          modelSummary,
        };

        return { content: [{ type: "text", text: JSON.stringify(result) }] };
      } catch (e: any) {
        return { content: [{ type: "text", text: JSON.stringify({ error: e.message }) }] };
      }
    },
  });
}
