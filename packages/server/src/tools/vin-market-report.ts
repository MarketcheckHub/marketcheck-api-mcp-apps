/**
 * VIN Market Report — Vehicle Market Report — Server tool
 * Registers the "generate-vin-market-report" MCP tool.
 */
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerApp } from "../register-app.js";
import { MarketCheckClient } from "@mcp-apps/shared";

export function registerCarStory(server: McpServer) {
  const client = new MarketCheckClient();

  registerApp({
    server,
    toolName: "generate-vin-market-report",
    title: "VIN Market Report - Vehicle Market Report",
    description:
      "Generate a comprehensive CarStory-like market intelligence report for any VIN. Includes deal score, market position, ML price prediction, active comparables, recently sold vehicles, price history timeline, depreciation story, market trends, and OEM incentives.",
    htmlFileName: "vin-market-report",
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
        // Phase 1: Parallel - decode VIN, get history, predict price (franchise + independent)
        const [vinData, historyResult, franchisePrice, independentPrice] = await Promise.all([
          client.decodeVin(args.vin),
          client.getCarHistory({ vin: args.vin, sort_order: "asc" }).catch(() => ({ listings: [] })),
          client.predictPrice({
            vin: args.vin,
            dealer_type: "franchise",
            ...(args.miles ? { miles: args.miles } : {}),
            ...(args.zip ? { zip: args.zip } : {}),
          }).catch(() => ({})),
          client.predictPrice({
            vin: args.vin,
            dealer_type: "independent",
            ...(args.miles ? { miles: args.miles } : {}),
            ...(args.zip ? { zip: args.zip } : {}),
          }).catch(() => ({})),
        ]);

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
          msrp: vinData.msrp ?? 0,
          exteriorColor: vinData.exterior_color ?? "",
          interiorColor: vinData.interior_color ?? "",
        };

        const franchiseFmv = franchisePrice.predicted_price ?? franchisePrice.price ?? 0;
        const independentFmv = independentPrice.predicted_price ?? independentPrice.price ?? 0;
        const confLow = franchisePrice.price_range?.low ?? franchiseFmv * 0.9;
        const confHigh = franchisePrice.price_range?.high ?? franchiseFmv * 1.1;

        // Phase 2: Search active + sold (needs make/model from decode)
        const searchParams: Record<string, any> = {
          year: String(vehicle.year),
          make: vehicle.make,
          model: vehicle.model,
          rows: 10,
          stats: "price,miles,dom",
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
            rows: 8,
            stats: "price,miles",
          }).catch(() => ({ listings: [], num_found: 0 })),
        ]);

        const stats = activeResult.stats ?? {};
        const priceStats = stats.price ?? {};
        const milesStats = stats.miles ?? {};
        const domStats = stats.dom ?? {};

        const effectiveAskingPrice = args.askingPrice ?? franchiseFmv;
        const minPrice = priceStats.min ?? confLow;
        const maxPrice = priceStats.max ?? confHigh;
        const range = maxPrice - minPrice || 1;
        const percentile = Math.max(0, Math.min(100, ((effectiveAskingPrice - minPrice) / range) * 100));

        // Deal score: lower price relative to FMV = higher score
        let dealScore = 50;
        if (franchiseFmv > 0) {
          const ratio = effectiveAskingPrice / franchiseFmv;
          if (ratio <= 0.90) dealScore = 95;
          else if (ratio <= 0.95) dealScore = 80;
          else if (ratio <= 1.0) dealScore = 65;
          else if (ratio <= 1.05) dealScore = 45;
          else if (ratio <= 1.10) dealScore = 30;
          else dealScore = 15;
        }

        const dealLabel = dealScore >= 80 ? "GREAT DEAL" : dealScore >= 60 ? "GOOD DEAL" : dealScore >= 40 ? "FAIR PRICE" : dealScore >= 25 ? "ABOVE MARKET" : "OVERPRICED";

        // Build comparables
        const activeListings = activeResult.listings ?? [];
        const comparables = activeListings
          .filter((l: any) => l.vin !== args.vin)
          .slice(0, 8)
          .map((l: any) => ({
            year: l.year ?? vehicle.year,
            make: l.make ?? vehicle.make,
            model: l.model ?? vehicle.model,
            trim: l.trim ?? "",
            price: l.price ?? 0,
            miles: l.miles ?? 0,
            city: l.dealer?.city ?? "",
            state: l.dealer?.state ?? "",
            dom: l.days_on_market ?? 0,
            dealerName: l.dealer?.name ?? "Unknown",
            distance: l.dist ?? 0,
            vdpUrl: l.vdp_url ?? "",
          }));

        // Build sold comps
        const soldListings = soldResult.listings ?? [];
        const soldComps = soldListings.slice(0, 8).map((l: any) => ({
          year: l.year ?? vehicle.year,
          make: l.make ?? vehicle.make,
          model: l.model ?? vehicle.model,
          trim: l.trim ?? "",
          soldPrice: l.price ?? 0,
          miles: l.miles ?? 0,
          soldDate: l.last_seen_at_date ?? l.first_seen_at_date ?? l.scraped_at_date ?? "",
          dealerName: l.dealer?.name ?? l.seller_name ?? "Unknown",
          city: l.dealer?.city ?? l.city ?? "",
          state: l.dealer?.state ?? l.state ?? "",
        }));

        // Build price history
        const rawHistory = historyResult.listings ?? (Array.isArray(historyResult) ? historyResult : []);
        const priceHistory = rawHistory
          .filter((h: any) => h.price)
          .map((h: any) => ({
            date: h.first_seen_at_date ?? h.last_seen_at_date ?? h.first_seen ?? h.last_seen ?? "",
            price: h.price ?? 0,
            dealer: h.dealer?.name ?? h.seller_name ?? "Unknown",
            city: h.dealer?.city ?? h.city ?? "",
            state: h.dealer?.state ?? h.state ?? "",
          }));

        // Build depreciation curve anchored to real FMV
        const currentAge = (new Date().getFullYear() - vehicle.year);
        const msrp = vehicle.msrp || franchiseFmv * 1.3;
        const currentValue = franchiseFmv || effectiveAskingPrice;
        const depreciation: any[] = [];
        if (msrp > 0 && currentAge > 0 && currentValue > 0) {
          const annualRate = 1 - Math.pow(currentValue / msrp, 1 / currentAge);
          const decayFactor = 1 - Math.max(0.05, Math.min(0.25, annualRate));
          depreciation.push({ ageMonths: 0, value: msrp, label: "MSRP" });
          for (let yr = 1; yr <= Math.max(currentAge + 2, 5); yr++) {
            const isProjected = yr > currentAge;
            const val = yr === currentAge ? currentValue : Math.round(msrp * Math.pow(decayFactor, yr));
            depreciation.push({ ageMonths: yr * 12, value: val, label: yr === currentAge ? "Current" : isProjected ? "Projected" : `Year ${yr}` });
          }
        } else if (msrp > 0) {
          depreciation.push({ ageMonths: 0, value: msrp, label: "MSRP" });
          for (let yr = 1; yr <= Math.max(currentAge + 2, 5); yr++) {
            const isProjected = yr > currentAge;
            depreciation.push({ ageMonths: yr * 12, value: Math.round(msrp * Math.pow(0.85, yr)), label: yr === currentAge ? "Current" : isProjected ? "Projected" : `Year ${yr}` });
          }
        }

        // Market trends (computed from active vs sold stats)
        const soldStats = soldResult.stats?.price ?? {};
        const soldAvg = soldStats.mean ?? soldStats.avg ?? 0;
        const activeAvg = priceStats.mean ?? priceStats.avg ?? 0;
        let pctChange30d = 0;
        let trendDirection: "up" | "down" | "stable" = "stable";
        if (soldAvg > 0 && activeAvg > 0) {
          pctChange30d = ((activeAvg - soldAvg) / soldAvg) * 100;
          trendDirection = pctChange30d < -2 ? "down" : pctChange30d > 2 ? "up" : "stable";
        } else if (franchiseFmv > 0 && activeAvg > 0) {
          pctChange30d = ((activeAvg - franchiseFmv) / franchiseFmv) * 100;
          trendDirection = pctChange30d < -2 ? "down" : pctChange30d > 2 ? "up" : "stable";
        }
        const activeCount = activeResult.num_found ?? 0;
        const soldCount = soldResult.num_found ?? 0;
        const inventoryChange = soldCount > 0 ? ((activeCount - soldCount) / soldCount) * 100 : 0;
        const marketTrend = {
          direction: trendDirection,
          pctChange30d: Math.round(pctChange30d * 10) / 10,
          avgDom: Math.round(domStats.mean ?? domStats.avg ?? 30),
          inventoryChange: Math.round(inventoryChange * 10) / 10,
        };

        // Phase 3: OEM incentives (for new/near-new vehicles)
        let incentives: any[] = [];
        if (vehicle.year >= new Date().getFullYear() - 1 && args.zip) {
          try {
            const incResult = await client.searchOemIncentivesByZip({
              oem: vehicle.make,
              zip: args.zip,
              model: vehicle.model,
            });
            if (incResult.incentives) {
              incentives = incResult.incentives.slice(0, 5).map((inc: any) => ({
                title: inc.title ?? "Incentive",
                type: inc.offer_type ?? "Offer",
                amount: inc.cash_amount ?? inc.amount ?? 0,
                endDate: inc.end_date ?? "",
                description: inc.description ?? "",
              }));
            }
          } catch {
            // Incentives not available
          }
        }

        const result = {
          vehicle,
          askingPrice: effectiveAskingPrice,
          miles: args.miles ?? 0,
          marketPosition: {
            totalActive: activeResult.num_found ?? 0,
            medianPrice: priceStats.median ?? priceStats.avg ?? franchiseFmv,
            avgPrice: priceStats.avg ?? franchiseFmv,
            minPrice,
            maxPrice,
            avgMiles: milesStats.avg ?? 0,
            avgDom: Math.round(domStats.avg ?? 0),
            percentile,
          },
          pricePrediction: {
            franchisePrice: franchiseFmv,
            independentPrice: independentFmv,
            confidenceLow: confLow,
            confidenceHigh: confHigh,
          },
          dealScore,
          dealLabel,
          comparables,
          soldComps,
          priceHistory,
          depreciation,
          marketTrend,
          incentives,
          isNew: vehicle.year >= new Date().getFullYear(),
        };

        return {
          content: [{ type: "text", text: JSON.stringify(result) }],
        };
      } catch (err: any) {
        return {
          content: [{ type: "text", text: JSON.stringify({ error: true, message: `Failed to generate car story: ${err.message}` }) }],
        };
      }
    },
  });
}
