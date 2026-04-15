import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerApp } from "../register-app.js";
import { MarketCheckClient } from "@mcp-apps/shared";

export function registerUkMarketExplorer(server: McpServer) {
  const client = new MarketCheckClient();

  registerApp({
    server,
    toolName: "search-uk-cars",
    title: "UK Market Explorer",
    description: "Search and compare used cars across the UK market. Postal code search, GBP pricing, UK-specific filters, photo card grid, scatter plots, and side-by-side comparison.",
    htmlFileName: "uk-market-explorer",
    inputSchema: {
      type: "object",
      properties: {
        postal_code: { type: "string", description: "UK postal code for location search, e.g. SW1A 1AA" },
        radius: { type: "number", description: "Search radius in miles (10, 25, 50, 100)" },
        make: { type: "string", description: "Vehicle make, e.g. Ford, BMW, Volkswagen" },
        model: { type: "string", description: "Vehicle model, e.g. Golf, Fiesta" },
        year: { type: "string", description: "Year or year range, e.g. 2022 or 2020-2024" },
        price_range: { type: "string", description: "Price range in GBP, e.g. 10000-30000" },
        miles_range: { type: "string", description: "Mileage range, e.g. 0-50000" },
        rows: { type: "number", description: "Number of results to return (default 20)" },
      },
      required: [],
    },
    handler: async (args: {
      postal_code?: string;
      radius?: number;
      make?: string;
      model?: string;
      year?: string;
      price_range?: string;
      miles_range?: string;
      rows?: number;
    }) => {
      try {
        const params: Record<string, any> = {
          rows: args.rows ?? 20,
          stats: "price,miles",
        };
        if (args.postal_code) params.postal_code = args.postal_code;
        if (args.radius) params.radius = args.radius;
        if (args.make) params.make = args.make;
        if (args.model) params.model = args.model;
        if (args.year) params.year = args.year;
        if (args.price_range) params.price_range = args.price_range;
        if (args.miles_range) params.miles_range = args.miles_range;

        const [activeResult, recentResult] = await Promise.all([
          client.searchUkActiveCars(params),
          client.searchUkRecentCars({
            make: args.make,
            model: args.model,
            year: args.year,
            postal_code: args.postal_code,
            radius: args.radius,
            rows: 10,
            stats: "price,miles",
          }),
        ]);

        const listings = (activeResult.listings ?? []).map((l: any) => ({
          id: l.id ?? l.vin ?? Math.random().toString(36).slice(2),
          year: l.year,
          make: l.make,
          model: l.model,
          trim: l.trim ?? "",
          price: l.price ?? 0,
          miles: l.miles ?? 0,
          city: l.dealer?.city ?? l.location?.city ?? "",
          dealer_name: l.dealer?.name ?? "",
          body_type: l.body_type ?? "",
          fuel_type: l.fuel_type ?? "",
          engine: l.engine ?? "",
          transmission: l.transmission ?? "",
          exterior_color: l.exterior_color ?? "",
          registration: l.registration ?? "",
        }));

        const recent_sales = (recentResult.listings ?? []).map((l: any) => ({
          year: l.year,
          make: l.make,
          model: l.model,
          trim: l.trim ?? "",
          price: l.price ?? 0,
          miles: l.miles ?? 0,
          sold_date: l.last_seen_at ?? l.sold_date ?? "",
          city: l.dealer?.city ?? l.location?.city ?? "",
        }));

        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              listings,
              num_found: activeResult.num_found ?? listings.length,
              stats: activeResult.stats,
              recent_sales,
            }),
          }],
        };
      } catch (e: any) {
        return { content: [{ type: "text", text: JSON.stringify({ error: e.message }) }] };
      }
    },
  });
}
