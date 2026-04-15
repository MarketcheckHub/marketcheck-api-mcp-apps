/**
 * Pricing Transparency Report — Server tool
 * Registers the "generate-pricing-report" MCP tool.
 */
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerApp } from "../register-app.js";
import { MarketCheckClient } from "@mcp-apps/shared";

export function registerPricingTransparencyReport(server: McpServer) {
  const client = new MarketCheckClient();

  registerApp({
    server,
    toolName: "generate-pricing-report",
    title: "Pricing Transparency Report",
    description:
      "Generate a shareable market pricing report for a vehicle. Shows fair price badge, price position bar, active comparables, recent transactions, and market summary. Designed for dealers to share with buyers.",
    htmlFileName: "pricing-transparency-report",
    inputSchema: {
      type: "object",
      properties: {
        vin: { type: "string", description: "17-character Vehicle Identification Number" },
        askingPrice: { type: "number", description: "The dealer's asking price in dollars" },
        miles: { type: "number", description: "Current mileage of the vehicle" },
        zip: { type: "string", description: "ZIP code for local market comparison" },
      },
      required: ["vin"],
    },
    handler: async (args: { vin: string; askingPrice?: number; miles?: number; zip?: string }) => {
      try {
        // Step 1: Decode VIN
        const vinData = await client.decodeVin(args.vin);

        const vehicle = {
          vin: args.vin,
          year: vinData.year ?? 0,
          make: vinData.make ?? "Unknown",
          model: vinData.model ?? "Unknown",
          trim: vinData.trim ?? "",
          bodyType: vinData.body_type ?? "",
          engine: vinData.engine ?? "",
          transmission: vinData.transmission ?? "",
          drivetrain: vinData.drivetrain ?? "",
          fuelType: vinData.fuel_type ?? "",
          exteriorColor: vinData.exterior_color ?? "",
          miles: args.miles ?? 0,
        };

        // Step 2: Predict price (franchise dealer)
        const priceResult = await client.predictPrice({
          vin: args.vin,
          dealer_type: "franchise",
          ...(args.miles ? { miles: args.miles } : {}),
          ...(args.zip ? { zip: args.zip } : {}),
        });

        const predictedFmv = priceResult.predicted_price ?? priceResult.price ?? 0;
        const confidenceLow = priceResult.price_range?.low ?? predictedFmv * 0.9;
        const confidenceHigh = priceResult.price_range?.high ?? predictedFmv * 1.1;

        // Step 3: Search active comparables
        const searchParams: Record<string, any> = {
          year: String(vehicle.year),
          make: vehicle.make,
          model: vehicle.model,
          rows: 12,
          stats: "price,miles,dom",
          sort_by: "price",
          sort_order: "asc",
        };
        if (vehicle.trim) searchParams.trim = vehicle.trim;
        if (args.zip) {
          searchParams.zip = args.zip;
          searchParams.radius = 100;
        }

        const [activeResult, soldResult] = await Promise.all([
          client.searchActiveCars(searchParams),
          client.searchPast90Days({
            year: String(vehicle.year),
            make: vehicle.make,
            model: vehicle.model,
            ...(args.zip ? { zip: args.zip, radius: 100 } : {}),
            rows: 10,
            stats: "price,miles",
            sort_by: "last_seen",
            sort_order: "desc",
          }).catch(() => ({ listings: [], num_found: 0, stats: {} })),
        ]);

        const stats = activeResult.stats ?? {};
        const priceStats = stats.price ?? {};
        const milesStats = stats.miles ?? {};
        const domStats = stats.dom ?? {};

        const effectiveAskingPrice = args.askingPrice ?? predictedFmv;
        const minPrice = priceStats.min ?? confidenceLow;
        const maxPrice = priceStats.max ?? confidenceHigh;
        const range = maxPrice - minPrice || 1;
        const percentile = Math.max(0, Math.min(100, ((effectiveAskingPrice - minPrice) / range) * 100));

        // Determine deal badge
        let dealBadge: "GREAT DEAL" | "GOOD VALUE" | "FAIR PRICE" | "ABOVE MARKET" | "OVERPRICED" = "FAIR PRICE";
        if (percentile <= 20) dealBadge = "GREAT DEAL";
        else if (percentile <= 40) dealBadge = "GOOD VALUE";
        else if (percentile <= 60) dealBadge = "FAIR PRICE";
        else if (percentile <= 80) dealBadge = "ABOVE MARKET";
        else dealBadge = "OVERPRICED";

        // Build active comparables
        const activeListings = activeResult.listings ?? [];
        const activeComps = activeListings
          .filter((l: any) => l.vin !== args.vin)
          .slice(0, 10)
          .map((l: any) => ({
            year: l.year ?? vehicle.year,
            make: l.make ?? vehicle.make,
            model: l.model ?? vehicle.model,
            trim: l.trim ?? "",
            price: l.price ?? 0,
            miles: l.miles ?? 0,
            dealerName: l.dealer?.name ?? "Unknown",
            city: l.dealer?.city ?? "",
            state: l.dealer?.state ?? "",
            distance: l.dist ?? 0,
            dom: l.days_on_market ?? 0,
            vdpUrl: l.vdp_url ?? "",
          }));

        // Build sold comparables
        const soldListings = soldResult.listings ?? [];
        const soldComps = soldListings.slice(0, 8).map((l: any) => ({
          year: l.year ?? vehicle.year,
          make: l.make ?? vehicle.make,
          model: l.model ?? vehicle.model,
          trim: l.trim ?? "",
          soldPrice: l.price ?? 0,
          miles: l.miles ?? 0,
          soldDate: l.last_seen ?? l.first_seen ?? "",
          dealerName: l.dealer?.name ?? "Unknown",
          city: l.dealer?.city ?? "",
          state: l.dealer?.state ?? "",
        }));

        // Find the subject listing's dealer name
        const subjectListing = activeListings.find((l: any) => l.vin === args.vin);
        const dealerName = subjectListing?.dealer?.name ?? "";

        const result = {
          vehicle,
          askingPrice: effectiveAskingPrice,
          predictedFmv,
          confidenceLow,
          confidenceHigh,
          percentile,
          dealBadge,
          activeComps,
          soldComps,
          marketSummary: {
            totalSimilar: activeResult.num_found ?? 0,
            medianPrice: priceStats.median ?? priceStats.avg ?? predictedFmv,
            avgPrice: priceStats.avg ?? predictedFmv,
            minPrice,
            maxPrice,
            avgMiles: Math.round(milesStats.avg ?? 0),
            avgDom: Math.round(domStats.avg ?? 0),
          },
          reportDate: new Date().toISOString().split("T")[0],
          dealerName,
        };

        return {
          content: [{ type: "text", text: JSON.stringify(result) }],
        };
      } catch (err: any) {
        return {
          content: [{ type: "text", text: JSON.stringify({ error: true, message: `Failed to generate pricing report: ${err.message}` }) }],
        };
      }
    },
  });
}
