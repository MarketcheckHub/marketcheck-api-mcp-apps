import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerApp } from "../register-app.js";
import { MarketCheckClient } from "@mcp-apps/shared";

export function registerUnderwritingDecisionSupport(server: McpServer) {
  const client = new MarketCheckClient();

  registerApp({
    server,
    toolName: "evaluate-loan-application",
    title: "Underwriting Decision Support",
    description: "Evaluate an auto loan application with real-time collateral valuation, LTV calculation, depreciation forecast, sold comps, and advance rate recommendation.",
    htmlFileName: "underwriting-decision-support",
    inputSchema: {
      type: "object",
      properties: {
        vin: { type: "string", description: "Vehicle VIN to evaluate" },
        miles: { type: "number", description: "Current vehicle mileage" },
        loan_amount: { type: "number", description: "Requested loan amount in USD" },
        loan_term: { type: "number", description: "Loan term in months (24, 36, 48, 60, 72)" },
        interest_rate: { type: "number", description: "Annual interest rate as percentage, e.g. 6.9" },
        zip: { type: "string", description: "Borrower ZIP code" },
      },
      required: ["vin", "miles", "loan_amount", "loan_term", "interest_rate"],
    },
    handler: async (args: {
      vin: string;
      miles: number;
      loan_amount: number;
      loan_term: number;
      interest_rate: number;
      zip?: string;
    }) => {
      try {
        // Step 1: Decode VIN
        const decoded = await client.decodeVin(args.vin);

        // Step 2: Predict price (franchise + independent) in parallel
        const [franchisePrice, independentPrice] = await Promise.all([
          client.predictPrice({
            vin: args.vin,
            miles: args.miles,
            dealer_type: "franchise",
            zip: args.zip,
          }).catch(() => null),
          client.predictPrice({
            vin: args.vin,
            miles: args.miles,
            dealer_type: "independent",
            zip: args.zip,
          }).catch(() => null),
        ]);

        const retailValue = franchisePrice?.predicted_price ?? independentPrice?.predicted_price ?? 0;
        const wholesaleValue = independentPrice?.predicted_price ?? Math.round(retailValue * 0.875);
        const valueLow = franchisePrice?.price_range?.low ?? Math.round(retailValue * 0.92);
        const valueHigh = franchisePrice?.price_range?.high ?? Math.round(retailValue * 1.08);
        const compCount = (franchisePrice?.comparables_count ?? 0) + (independentPrice?.comparables_count ?? 0);

        // Step 3: Search past 90 days for sold comps
        const soldResult = await client.searchPast90Days({
          make: decoded.make,
          model: decoded.model,
          year: String(decoded.year),
          zip: args.zip,
          radius: 200,
          rows: 10,
          sort_by: "last_seen_at",
          sort_order: "desc",
        }).catch(() => ({ listings: [] }));

        const soldComps = (soldResult.listings ?? []).slice(0, 8).map((l: any) => ({
          year: l.year,
          make: l.make,
          model: l.model,
          trim: l.trim ?? "",
          price: l.price ?? l.last_seen_at_price ?? 0,
          miles: l.miles ?? 0,
          sold_date: l.last_seen_at ?? "",
          city: l.dealer?.city ?? "",
          state: l.dealer?.state ?? "",
        }));

        // Step 4: Get car history for price trajectory
        const history = await client.getCarHistory({
          vin: args.vin,
          sort_order: "asc",
        }).catch(() => ({ listings: [] }));

        const priceHistory = (history.listings ?? []).map((l: any) => ({
          date: l.first_seen_at ?? l.last_seen_at ?? "",
          price: l.price ?? 0,
          dealer: l.dealer?.name ?? "",
          event: l.price_change ? "Price Drop" : "Listed",
        }));

        // Calculate LTV
        const ltv = retailValue > 0 ? (args.loan_amount / retailValue) * 100 : 999;

        // Calculate monthly payment
        const monthlyRate = args.interest_rate / 100 / 12;
        const payment = monthlyRate > 0
          ? (args.loan_amount * monthlyRate * Math.pow(1 + monthlyRate, args.loan_term)) /
            (Math.pow(1 + monthlyRate, args.loan_term) - 1)
          : args.loan_amount / args.loan_term;

        // Depreciation forecast
        const annualDepRate = 0.15;
        const monthlyDepRate = annualDepRate / 12;
        const forecast: any[] = [];

        for (const months of [12, 24, 36, 48, 60]) {
          if (months > args.loan_term) break;
          const projectedValue = retailValue * Math.pow(1 - monthlyDepRate, months);
          const powFactor = Math.pow(1 + monthlyRate, months);
          const totalPow = Math.pow(1 + monthlyRate, args.loan_term);
          let remainingBalance = args.loan_amount * (totalPow - powFactor) / (totalPow - 1);
          if (remainingBalance < 0) remainingBalance = 0;

          forecast.push({
            month: months,
            label: `${months} months`,
            projected_value: Math.round(projectedValue),
            remaining_balance: Math.round(remainingBalance),
            ltv: projectedValue > 0 ? Math.round((remainingBalance / projectedValue) * 100) : 0,
          });
        }

        // Risk rating
        let risk = "low";
        if (ltv > 120) risk = "very_high";
        else if (ltv > 100) risk = "high";
        else if (ltv > 80) risk = "moderate";

        const maxAdvanceRate = 0.85;
        const maxAdvanceAmount = Math.round(retailValue * maxAdvanceRate);

        const result = {
          vehicle: {
            vin: args.vin,
            year: decoded.year,
            make: decoded.make,
            model: decoded.model,
            trim: decoded.trim ?? "",
            body_type: decoded.body_type ?? "",
            engine: decoded.engine ?? "",
            transmission: decoded.transmission ?? "",
            drivetrain: decoded.drivetrain ?? "",
            fuel_type: decoded.fuel_type ?? "",
          },
          valuation: {
            retail_value: retailValue,
            wholesale_value: wholesaleValue,
            confidence_comps: compCount,
            value_low: valueLow,
            value_high: valueHigh,
          },
          ltv_current: Math.round(ltv * 10) / 10,
          monthly_payment: Math.round(payment * 100) / 100,
          depreciation_forecast: forecast,
          sold_comps: soldComps,
          price_history: priceHistory,
          max_advance: maxAdvanceRate * 100,
          max_advance_amount: maxAdvanceAmount,
          risk_rating: risk,
        };

        return { content: [{ type: "text", text: JSON.stringify(result) }] };
      } catch (e: any) {
        return { content: [{ type: "text", text: JSON.stringify({ error: e.message }) }] };
      }
    },
  });
}
