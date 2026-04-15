import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerApp } from "../register-app.js";
import { MarketCheckClient } from "@mcp-apps/shared";

export function registerIncentiveDealFinder(server: McpServer) {
  const client = new MarketCheckClient();

  registerApp({
    server,
    toolName: "find-incentive-deals",
    title: "Incentive Deal Finder",
    description:
      "Search ALL OEM incentives nationwide by budget — find cashback, APR, and lease deals across every major brand without picking a brand first.",
    htmlFileName: "incentive-deal-finder",
    inputSchema: {
      type: "object",
      properties: {
        offer_type: {
          type: "string",
          description: "Filter by offer type: lease, finance/apr, cash/cashback, or omit for all",
        },
        max_monthly_payment: {
          type: "number",
          description: "Maximum monthly lease payment filter",
        },
        min_cashback: {
          type: "number",
          description: "Minimum cashback amount filter",
        },
        makes: {
          type: "string",
          description:
            "Comma-separated list of makes to search (e.g. Toyota,Honda,Ford). Omit to search all major brands.",
        },
        zip: {
          type: "string",
          description: "ZIP code for regional incentive availability",
        },
      },
      required: [],
    },
    handler: async (args: {
      offer_type?: string;
      max_monthly_payment?: number;
      min_cashback?: number;
      makes?: string;
      zip?: string;
    }) => {
      try {
        const defaultMakes = [
          "Toyota",
          "Honda",
          "Ford",
          "Chevrolet",
          "Hyundai",
          "Kia",
          "Nissan",
          "BMW",
          "Mercedes-Benz",
          "Volkswagen",
          "Subaru",
          "Mazda",
          "Jeep",
          "Ram",
          "GMC",
        ];

        const makesToSearch = args.makes
          ? args.makes.split(",").map((m) => m.trim())
          : defaultMakes;

        // Search incentives for each make in parallel
        const results = await Promise.all(
          makesToSearch.map(async (make) => {
            try {
              if (args.zip) {
                return {
                  make,
                  data: await client.searchOemIncentivesByZip({
                    oem: make,
                    zip: args.zip,
                  }),
                };
              } else {
                return {
                  make,
                  data: await client.searchOemIncentives({
                    oem: make,
                    offer_type: args.offer_type,
                  }),
                };
              }
            } catch {
              return { make, data: null };
            }
          })
        );

        const allOffers = results.flatMap((r) => {
          if (!r.data) return [];
          const items = Array.isArray(r.data) ? r.data : r.data?.incentives || [];
          return items.map((item: any) => ({
            ...item,
            make: r.make,
          }));
        });

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                offers: allOffers,
                totalMakesSearched: makesToSearch.length,
                filters: {
                  offer_type: args.offer_type,
                  max_monthly_payment: args.max_monthly_payment,
                  min_cashback: args.min_cashback,
                  zip: args.zip,
                },
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
