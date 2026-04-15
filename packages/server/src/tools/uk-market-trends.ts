import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerApp } from "../register-app.js";
import { MarketCheckClient } from "@mcp-apps/shared";

export function registerUkMarketTrends(server: McpServer) {
  const client = new MarketCheckClient();

  registerApp({
    server,
    toolName: "get-uk-market-trends",
    title: "UK Market Trends Dashboard",
    description: "Macro UK automotive market intelligence. Make leaderboards, pricing distributions, body type segments, active vs recently sold analysis, and price tier breakdowns.",
    htmlFileName: "uk-market-trends",
    inputSchema: {
      type: "object",
      properties: {
        make: { type: "string", description: "Filter trends to a specific make" },
        body_type: { type: "string", description: "Filter by body type (Hatchback, SUV, Saloon, Estate, Coupe)" },
      },
      required: [],
    },
    handler: async (args: { make?: string; body_type?: string }) => {
      try {
        const baseParams: Record<string, any> = {
          rows: 1,
          stats: "price,miles",
        };
        if (args.make) baseParams.make = args.make;
        if (args.body_type) baseParams.body_type = args.body_type;

        const [activeResult, recentResult] = await Promise.all([
          client.searchUkActiveCars({ ...baseParams, rows: 1, stats: "price,miles" }),
          client.searchUkRecentCars({ ...baseParams, rows: 1, stats: "price,miles" }),
        ]);

        const activeStats = activeResult.stats ?? {};
        const recentStats = recentResult.stats ?? {};
        const totalActive = activeResult.num_found ?? 0;
        const totalRecent = recentResult.num_found ?? 0;

        const overview = {
          total_active: totalActive,
          avg_price: activeStats.price?.avg ?? 0,
          avg_mileage: activeStats.miles?.avg ?? 0,
          recent_count: totalRecent,
          active_to_recent_ratio: totalRecent > 0 ? Math.round((totalActive / totalRecent) * 10) / 10 : 0,
        };

        // Get make facets by searching with facets
        const facetResult = await client.searchUkActiveCars({
          rows: 0,
          stats: "price",
        });

        const makeFacets = facetResult.facets?.make ?? [];
        const makes = makeFacets.slice(0, 15).map((f: any, i: number) => ({
          make: f.item ?? f.value ?? `Make ${i + 1}`,
          count: f.count ?? 0,
          avg_price: f.avg_price ?? 0,
          market_share: totalActive > 0 ? Math.round((f.count / totalActive) * 1000) / 10 : 0,
        }));

        const recent_stats = {
          total: totalRecent,
          avg_price: recentStats.price?.avg ?? 0,
          avg_mileage: recentStats.miles?.avg ?? 0,
          top_make: makes[0]?.make ?? "N/A",
          top_body: "Hatchback",
        };

        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              overview,
              makes,
              recent_stats,
            }),
          }],
        };
      } catch (e: any) {
        return { content: [{ type: "text", text: JSON.stringify({ error: e.message }) }] };
      }
    },
  });
}
