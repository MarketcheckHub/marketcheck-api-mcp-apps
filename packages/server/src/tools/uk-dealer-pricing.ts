import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerApp } from "../register-app.js";
import { MarketCheckClient } from "@mcp-apps/shared";

export function registerUkDealerPricing(server: McpServer) {
  const client = new MarketCheckClient();

  registerApp({
    server,
    toolName: "scan-uk-lot-pricing",
    title: "UK Dealer Pricing Dashboard",
    description:
      "Analyse a UK dealer's inventory against local market pricing. Shows overpriced/underpriced units, aging heatmap, recent sales evidence, and price action recommendations.",
    htmlFileName: "uk-dealer-pricing",
    inputSchema: {
      type: "object",
      properties: {
        dealer_name: {
          type: "string",
          description: "Name of the UK dealer to analyse",
        },
        postal_code: {
          type: "string",
          description: "UK postal code for local market comparison",
        },
        radius: {
          type: "number",
          description: "Search radius in miles (default 30)",
        },
      },
      required: ["dealer_name", "postal_code"],
    },
    handler: async (args: {
      dealer_name: string;
      postal_code: string;
      radius?: number;
    }) => {
      try {
        const radius = args.radius ?? 30;

        // 1. Search the dealer's inventory
        const dealerInventory = await client.searchUkActiveCars({
          postal_code: args.postal_code,
          radius: 5,
          rows: 50,
          stats: "price,miles,dom",
        });

        const listings: any[] = dealerInventory?.listings ?? [];

        // 2. For each vehicle, get market comps
        const inventory = await Promise.all(
          listings.slice(0, 50).map(async (listing: any) => {
            const listedPrice = listing.price ?? 0;
            const miles = listing.miles ?? 0;
            const dom = listing.dom ?? 0;
            const make = listing.make ?? "";
            const model = listing.model ?? "";
            const year = listing.year ?? 0;
            const trim = listing.trim ?? "";

            let marketAvg = listedPrice;
            let marketCount = 0;
            try {
              if (make && model) {
                const comps = await client.searchUkActiveCars({
                  make,
                  model,
                  year: String(year),
                  postal_code: args.postal_code,
                  radius,
                  rows: 0,
                  stats: "price",
                });
                marketAvg = comps?.stats?.price?.mean
                  ? Math.round(comps.stats.price.mean)
                  : listedPrice;
                marketCount = comps?.num_found ?? 0;
              }
            } catch {
              // non-critical
            }

            const gapGBP = listedPrice - marketAvg;
            const gapPct =
              marketAvg > 0
                ? Math.round(((gapGBP / marketAvg) * 100) * 10) / 10
                : 0;

            let action = "HOLD";
            if (gapPct > 5) action = "REDUCE";
            else if (gapPct < -5) action = "RAISE";
            else action = "COMPETITIVE";

            return {
              vin: listing.vin ?? "",
              year,
              make,
              model,
              trim,
              listedPrice,
              marketAvg,
              gapGBP: Math.round(gapGBP),
              gapPct,
              miles,
              dom,
              marketCount,
              action,
            };
          })
        );

        // 3. Recent sales evidence
        let recentSales: any[] = [];
        try {
          const recent = await client.searchUkRecentCars({
            postal_code: args.postal_code,
            radius,
            rows: 20,
            stats: "price",
          });
          recentSales = (recent?.listings ?? []).map((l: any) => ({
            year: l.year ?? 0,
            make: l.make ?? "",
            model: l.model ?? "",
            trim: l.trim ?? "",
            price: l.price ?? 0,
            miles: l.miles ?? 0,
            dom: l.dom ?? 0,
            soldDate: l.last_seen ?? "",
          }));
        } catch {
          // not critical
        }

        // 4. Aging buckets
        const aging = [
          { label: "0-30d", min: 0, max: 30, count: 0, color: "#10b981" },
          { label: "31-60d", min: 31, max: 60, count: 0, color: "#f59e0b" },
          { label: "61-90d", min: 61, max: 90, count: 0, color: "#f97316" },
          { label: "90+d", min: 91, max: 9999, count: 0, color: "#ef4444" },
        ];
        for (const v of inventory) {
          for (const b of aging) {
            if (v.dom >= b.min && v.dom <= b.max) {
              b.count++;
              break;
            }
          }
        }

        // 5. KPIs
        const totalUnits = inventory.length;
        const avgPrice =
          totalUnits > 0
            ? Math.round(
                inventory.reduce((s, v) => s + v.listedPrice, 0) / totalUnits
              )
            : 0;
        const avgMiles =
          totalUnits > 0
            ? Math.round(
                inventory.reduce((s, v) => s + v.miles, 0) / totalUnits
              )
            : 0;
        const pctOverpriced =
          totalUnits > 0
            ? Math.round(
                (inventory.filter((v) => v.action === "REDUCE").length /
                  totalUnits) *
                  100
              )
            : 0;
        const pctUnderpriced =
          totalUnits > 0
            ? Math.round(
                (inventory.filter((v) => v.action === "RAISE").length /
                  totalUnits) *
                  100
              )
            : 0;

        // 6. Action summary
        const actionSummary = {
          reduce: inventory.filter((v) => v.action === "REDUCE").length,
          hold: inventory.filter((v) => v.action === "COMPETITIVE").length,
          raise: inventory.filter((v) => v.action === "RAISE").length,
        };

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                dealerName: args.dealer_name,
                inventory,
                aging,
                recentSales,
                kpis: {
                  totalUnits,
                  avgPrice,
                  avgMiles,
                  pctOverpriced,
                  pctUnderpriced,
                },
                actionSummary,
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
