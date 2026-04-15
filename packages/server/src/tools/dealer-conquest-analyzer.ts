import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerApp } from "../register-app.js";
import { MarketCheckClient } from "@mcp-apps/shared";

export function registerDealerConquestAnalyzer(server: McpServer) {
  const client = new MarketCheckClient();

  registerApp({
    server,
    toolName: "analyze-dealer-conquest",
    title: "Dealer Conquest Analyzer",
    description:
      "Gap analysis of your inventory vs nearby competitors. Shows which models you should be stocking based on local demand and competitor inventory mix.",
    htmlFileName: "dealer-conquest-analyzer",
    inputSchema: {
      type: "object",
      properties: {
        dealer_id: {
          type: "string",
          description: "Your dealer ID to scan inventory for",
        },
        zip: {
          type: "string",
          description: "ZIP code for competitor and demand search",
        },
        radius: {
          type: "number",
          description: "Search radius in miles (25, 50, or 100). Default 50.",
        },
        state: {
          type: "string",
          description: "State code for sold summary demand data",
        },
      },
      required: ["dealer_id", "zip"],
    },
    handler: async (args: {
      dealer_id: string;
      zip: string;
      radius?: number;
      state?: string;
    }) => {
      try {
        const radius = args.radius ?? 50;
        const state = args.state ?? "";

        // 1. Fetch your dealer's inventory
        const myInventory = await client.searchActiveCars({
          dealer_id: args.dealer_id,
          rows: 50,
          facets: "make,model",
          stats: "price,miles,dom",
        });

        const myListings: any[] = myInventory?.listings ?? [];
        const myFacets = myInventory?.facets ?? {};

        // Build your make/model breakdown
        const myMakeModel: Record<string, number> = {};
        for (const listing of myListings) {
          const key = `${listing.make ?? "Unknown"}|${listing.model ?? "Unknown"}`;
          myMakeModel[key] = (myMakeModel[key] || 0) + 1;
        }

        // 2. Fetch nearby market inventory (competitors)
        const marketInventory = await client.searchActiveCars({
          zip: args.zip,
          radius,
          rows: 0,
          facets: "make,model,dealer_id",
          stats: "price,dom",
        });

        const marketFacets = marketInventory?.facets ?? {};
        const totalMarketListings = marketInventory?.num_found ?? 0;

        // Parse dealer facets to find top competitors
        const dealerFacet: any[] = marketFacets?.dealer_id ?? [];
        const competitors = dealerFacet
          .filter((d: any) => String(d.item) !== args.dealer_id)
          .slice(0, 5)
          .map((d: any) => ({
            dealerId: String(d.item),
            count: d.count ?? 0,
          }));

        // 3. For each competitor, get their inventory mix
        const competitorDetails = await Promise.all(
          competitors.map(async (comp: any) => {
            try {
              const inv = await client.searchActiveCars({
                dealer_id: comp.dealerId,
                rows: 0,
                facets: "make,model",
              });
              const facets = inv?.facets ?? {};
              const makeFacet: any[] = facets?.make ?? [];
              const modelFacet: any[] = facets?.model ?? [];

              return {
                dealerId: comp.dealerId,
                totalUnits: inv?.num_found ?? comp.count,
                topMakes: makeFacet.slice(0, 5).map((f: any) => ({
                  make: f.item,
                  count: f.count,
                })),
                topModels: modelFacet.slice(0, 8).map((f: any) => ({
                  model: f.item,
                  count: f.count,
                })),
              };
            } catch {
              return {
                dealerId: comp.dealerId,
                totalUnits: comp.count,
                topMakes: [],
                topModels: [],
              };
            }
          })
        );

        // 4. Build market make/model map
        const marketMakeModel: Record<string, number> = {};
        const makeFacet: any[] = marketFacets?.make ?? [];
        const modelFacet: any[] = marketFacets?.model ?? [];
        for (const f of modelFacet) {
          if (f.item) {
            marketMakeModel[f.item] = f.count ?? 0;
          }
        }

        // 5. Get demand data from sold summary
        let demandRankings: any[] = [];
        if (state) {
          try {
            const soldSummary = await client.getSoldSummary({
              state,
              ranking_dimensions: "make,model",
              ranking_measure: "sold_count",
              ranking_order: "desc",
              top_n: 20,
            });
            demandRankings = soldSummary?.rankings ?? [];
          } catch {
            // not critical
          }
        }

        // 6. Build gap analysis: models competitors stock that we don't
        const myModels = new Set(
          Object.keys(myMakeModel).map((k) => k.split("|")[1])
        );
        const gapModels: any[] = [];
        for (const ranking of demandRankings) {
          const model = ranking.model ?? "";
          if (model && !myModels.has(model)) {
            gapModels.push({
              make: ranking.make ?? "",
              model,
              demandScore: ranking.sold_count ?? 0,
              avgMarketPrice: ranking.average_sale_price
                ? Math.round(ranking.average_sale_price)
                : 0,
              potentialVolume: Math.min(
                Math.round((ranking.sold_count ?? 0) / 10),
                8
              ),
            });
          }
        }

        // 7. Market share comparison: your share vs market in top segments
        const myMakes: Record<string, number> = {};
        for (const listing of myListings) {
          const make = listing.make ?? "Unknown";
          myMakes[make] = (myMakes[make] || 0) + 1;
        }
        const topMarketMakes = makeFacet.slice(0, 5);
        const marketShareComparison = topMarketMakes.map((f: any) => ({
          make: f.item,
          marketCount: f.count ?? 0,
          marketPct:
            totalMarketListings > 0
              ? Math.round(((f.count ?? 0) / totalMarketListings) * 1000) / 10
              : 0,
          yourCount: myMakes[f.item] ?? 0,
          yourPct:
            myListings.length > 0
              ? Math.round(
                  ((myMakes[f.item] ?? 0) / myListings.length) * 1000
                ) / 10
              : 0,
        }));

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                yourInventory: {
                  totalUnits: myListings.length,
                  makeModelBreakdown: Object.entries(myMakeModel).map(
                    ([key, count]) => {
                      const [make, model] = key.split("|");
                      return { make, model, count };
                    }
                  ),
                },
                competitors: competitorDetails,
                gapAnalysis: gapModels.slice(0, 10),
                acquisitionRecommendations: gapModels.slice(0, 10),
                marketShareComparison,
                marketStats: {
                  totalMarketListings,
                  avgPrice: marketInventory?.stats?.price?.mean
                    ? Math.round(marketInventory.stats.price.mean)
                    : 0,
                  avgDom: marketInventory?.stats?.dom?.mean
                    ? Math.round(marketInventory.stats.dom.mean)
                    : 0,
                },
              }),
            },
          ],
        };
      } catch (e: any) {
        return {
          content: [
            { type: "text", text: JSON.stringify({ error: e.message }) },
          ],
        };
      }
    },
  });
}
