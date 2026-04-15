import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerApp } from "../register-app.js";
import { MarketCheckClient } from "@mcp-apps/shared";

export function registerInsurancePremiumBenchmarker(server: McpServer) {
  const client = new MarketCheckClient();

  registerApp({
    server,
    toolName: "benchmark-insurance-premiums",
    title: "Insurance Premium Benchmarker",
    description: "Segment-level replacement cost distributions and risk analysis for underwriting decisions. Analyzes body type, fuel type, and state-level pricing data.",
    htmlFileName: "insurance-premium-benchmarker",
    inputSchema: {
      type: "object",
      properties: {
        body_type: { type: "string", description: "Filter by body type (e.g., SUV, Sedan, Truck)" },
        fuel_type: { type: "string", description: "Filter by fuel type (e.g., Gasoline, Electric, Hybrid)" },
        state: { type: "string", description: "State abbreviation for regional analysis" },
        year_from: { type: "string", description: "Start year for analysis range" },
        year_to: { type: "string", description: "End year for analysis range" },
      },
      required: [],
    },
    handler: async (args: { body_type?: string; fuel_type?: string; state?: string; year_from?: string; year_to?: string }) => {
      try {
        // Fetch segment data by body_type and fuel_type
        const [bodyTypeSummary, fuelTypeSummary, stateSummary, activePricing] = await Promise.all([
          client.getSoldSummary({
            body_type: args.body_type,
            ranking_dimensions: "body_type",
            ranking_measure: "sold_count,average_sale_price",
            ranking_order: "desc",
            top_n: 10,
          }),
          client.getSoldSummary({
            fuel_type_category: args.fuel_type,
            ranking_dimensions: "fuel_type_category",
            ranking_measure: "sold_count,average_sale_price",
          }),
          client.getSoldSummary({
            state: args.state,
            ranking_dimensions: "state",
            ranking_measure: "sold_count,average_sale_price",
            ranking_order: "desc",
            top_n: 15,
          }),
          client.searchActiveCars({
            body_type: args.body_type,
            fuel_type: args.fuel_type,
            state: args.state,
            year: args.year_from && args.year_to ? `${args.year_from}-${args.year_to}` : undefined,
            rows: 0,
            stats: "price,miles",
            facets: "body_type,fuel_type",
          }),
        ]);

        // Fetch EV vs ICE comparison
        const [evSummary, iceSummary] = await Promise.all([
          client.getSoldSummary({
            fuel_type_category: "EV",
            ranking_dimensions: "make,model",
            ranking_measure: "sold_count,average_sale_price",
            ranking_order: "desc",
            top_n: 15,
          }),
          client.getSoldSummary({
            fuel_type_category: "Gasoline",
            ranking_dimensions: "make,model",
            ranking_measure: "sold_count,average_sale_price",
            ranking_order: "desc",
            top_n: 15,
          }),
        ]);

        const result = {
          bodyTypeSummary,
          fuelTypeSummary,
          stateSummary,
          activePricing,
          evSummary,
          iceSummary,
        };

        return { content: [{ type: "text", text: JSON.stringify(result) }] };
      } catch (e: any) {
        return { content: [{ type: "text", text: JSON.stringify({ error: e.message }) }] };
      }
    },
  });
}
