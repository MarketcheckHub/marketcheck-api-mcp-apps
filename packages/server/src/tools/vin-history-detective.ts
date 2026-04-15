/**
 * VIN History Detective — Server tool
 * Registers the "trace-vin-history" MCP tool.
 */
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerApp } from "../register-app.js";
import { MarketCheckClient } from "@mcp-apps/shared";

export function registerVinHistoryDetective(server: McpServer) {
  const client = new MarketCheckClient();

  registerApp({
    server,
    toolName: "trace-vin-history",
    title: "VIN History Detective",
    description:
      "Trace the complete listing history of any VIN across dealers. Shows listing timeline, dealer hop chain, price trajectory analysis, red flag alerts, and current FMV comparison.",
    htmlFileName: "vin-history-detective",
    inputSchema: {
      type: "object",
      properties: {
        vin: { type: "string", description: "17-character Vehicle Identification Number to trace" },
      },
      required: ["vin"],
    },
    handler: async (args: { vin: string }) => {
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
          msrp: vinData.msrp ?? 0,
        };

        // Step 2: Get full listing history (ascending order)
        const historyResult = await client.getCarHistory({ vin: args.vin, sort_order: "asc" });
        const historyListings = historyResult.listings ?? [];

        // Step 3: Predict current FMV
        let currentFmv = 0;
        try {
          const priceResult = await client.predictPrice({ vin: args.vin, dealer_type: "franchise" });
          currentFmv = priceResult.predicted_price ?? priceResult.price ?? 0;
        } catch {
          // FMV prediction may fail
        }

        // Build structured listing entries
        const listings = historyListings
          .filter((l: any) => l.price)
          .map((l: any, i: number) => {
            const firstSeen = l.first_seen ?? "";
            const lastSeen = l.last_seen ?? firstSeen;
            const dom = l.days_on_market ?? 0;
            return {
              date: firstSeen,
              endDate: lastSeen,
              price: l.price ?? 0,
              dealerName: l.dealer?.name ?? "Unknown Dealer",
              city: l.dealer?.city ?? "",
              state: l.dealer?.state ?? "",
              miles: l.miles ?? 0,
              dom,
              source: l.source ?? "Dealer Website",
            };
          });

        // Build dealer hop chain (unique dealers in order)
        const dealers: Array<{
          dealerName: string;
          city: string;
          state: string;
          entryDate: string;
          exitDate: string;
          entryPrice: number;
          exitPrice: number;
          daysHeld: number;
        }> = [];

        let prevDealerName = "";
        for (const l of listings) {
          if (l.dealerName !== prevDealerName) {
            dealers.push({
              dealerName: l.dealerName,
              city: l.city,
              state: l.state,
              entryDate: l.date,
              exitDate: l.endDate,
              entryPrice: l.price,
              exitPrice: l.price,
              daysHeld: l.dom || 0,
            });
            prevDealerName = l.dealerName;
          } else if (dealers.length > 0) {
            // Update the exit info for same dealer
            const last = dealers[dealers.length - 1];
            last.exitDate = l.endDate;
            last.exitPrice = l.price;
            last.daysHeld += l.dom || 0;
          }
        }

        // Calculate summary stats
        const totalListings = listings.length;
        const totalDealers = dealers.length;
        const totalDaysOnMarket = listings.reduce((sum: number, l: { dom: number }) => sum + l.dom, 0);
        const firstPrice = listings.length > 0 ? listings[0].price : 0;
        const lastPrice = listings.length > 0 ? listings[listings.length - 1].price : 0;
        const totalPriceChange = lastPrice - firstPrice;

        // Generate red flags
        const redFlags: Array<{ severity: "high" | "medium" | "low"; title: string; detail: string }> = [];

        if (totalDealers >= 4) {
          redFlags.push({
            severity: "high",
            title: "Excessive Dealer Transfers",
            detail: `This vehicle has been through ${totalDealers} different dealers. Typical vehicles change hands 1-2 times. This pattern may indicate undisclosed issues.`,
          });
        } else if (totalDealers === 3) {
          redFlags.push({
            severity: "medium",
            title: "Multiple Dealer Transfers",
            detail: `This vehicle has been through ${totalDealers} dealers. While not unusual, it warrants attention.`,
          });
        }

        if (totalDaysOnMarket > 180) {
          redFlags.push({
            severity: "high",
            title: "Prolonged Total Market Time",
            detail: `${totalDaysOnMarket} total days on market across all listings. The average vehicle sells within 45 days. Extended market time suggests pricing or condition issues.`,
          });
        } else if (totalDaysOnMarket > 90) {
          redFlags.push({
            severity: "medium",
            title: "Extended Market Time",
            detail: `${totalDaysOnMarket} total days on market. This is above average and may indicate the vehicle is difficult to sell.`,
          });
        }

        if (firstPrice > 0 && Math.abs(totalPriceChange) / firstPrice > 0.15) {
          redFlags.push({
            severity: "medium",
            title: "Significant Price Erosion",
            detail: `Price has ${totalPriceChange < 0 ? 'dropped' : 'increased'} ${Math.abs(((totalPriceChange / firstPrice) * 100)).toFixed(1)}% from the original listing of $${firstPrice.toLocaleString()} to $${lastPrice.toLocaleString()}.`,
          });
        }

        // Check for cross-state transfers
        const states = new Set(dealers.map(d => d.state).filter(Boolean));
        if (states.size > 1) {
          redFlags.push({
            severity: "medium",
            title: "Cross-State Transfer",
            detail: `Vehicle has been listed in ${states.size} different states (${Array.from(states).join(", ")}). Interstate transfers sometimes indicate attempts to distance the vehicle from its history.`,
          });
        }

        // Check rapid dealer changes (less than 14 days between listings)
        for (let i = 1; i < listings.length; i++) {
          const gapDays = Math.round(
            (new Date(listings[i].date).getTime() - new Date(listings[i - 1].endDate).getTime()) / (1000 * 60 * 60 * 24)
          );
          if (gapDays >= 0 && gapDays <= 3 && listings[i].dealerName !== listings[i - 1].dealerName) {
            redFlags.push({
              severity: "low",
              title: "Rapid Dealer Turnover",
              detail: `Listing ${i} to ${i + 1} changed dealers within ${gapDays} days. Quick flips between dealers can indicate wholesale trading.`,
            });
            break; // Only flag once
          }
        }

        // FMV comparison flag
        if (currentFmv > 0 && lastPrice > 0) {
          const fmvDiff = lastPrice - currentFmv;
          if (fmvDiff < 0) {
            redFlags.push({
              severity: "low",
              title: "Current Price Below FMV",
              detail: `Currently listed at $${lastPrice.toLocaleString()}, which is $${Math.abs(fmvDiff).toLocaleString()} below the predicted fair market value of $${currentFmv.toLocaleString()}.`,
            });
          }
        }

        const result = {
          vehicle,
          listings,
          dealers,
          totalListings,
          totalDealers,
          totalDaysOnMarket,
          totalPriceChange,
          firstPrice,
          lastPrice,
          currentFmv,
          redFlags,
        };

        return {
          content: [{ type: "text", text: JSON.stringify(result) }],
        };
      } catch (err: any) {
        return {
          content: [{ type: "text", text: JSON.stringify({ error: true, message: `Failed to trace VIN history: ${err.message}` }) }],
        };
      }
    },
  });
}
