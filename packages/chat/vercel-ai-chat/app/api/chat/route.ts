import { anthropic } from "@ai-sdk/anthropic";
import { streamText, tool } from "ai";
import { z } from "zod";

const MC_API_HOST = "https://api.marketcheck.com";
const apiKey = process.env.MARKETCHECK_API_KEY ?? "";

async function mcFetch(
  path: string,
  params: Record<string, any> = {},
  opts?: { noV2Prefix?: boolean },
): Promise<any> {
  const basePath = opts?.noV2Prefix ? "" : "/v2";
  const url = new URL(`${MC_API_HOST}${basePath}${path}`);
  url.searchParams.set("api_key", apiKey);
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== "") url.searchParams.set(k, String(v));
  }
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`MarketCheck API ${res.status}: ${await res.text()}`);
  return res.json();
}

export const maxDuration = 60;

export async function POST(req: Request) {
  const { messages } = await req.json();

  const result = streamText({
    model: anthropic("claude-sonnet-4-20250514"),
    system: `You are MarketCheck AI, an expert automotive market assistant powered by real-time market data from the MarketCheck API — the largest automotive data platform covering 95%+ of US dealer inventory.

You have tools to search car listings, decode VINs, predict prices, analyze sold vehicles, check incentives, evaluate deals, and estimate trade-in values. Always use tools to back up claims with real data. Format prices as currency ($XX,XXX) and mileage with commas. Be concise but thorough — lead with key findings, then supporting data. Proactively suggest follow-up analyses.`,
    messages,
    tools: {
      "search-cars": tool({
        description:
          "Search active used car listings with filters for make, model, body type, price range, year, mileage, fuel type, and location. Returns listings with dealer info, stats, and facets.",
        parameters: z.object({
          makes: z.string().optional().describe("Comma-separated makes, e.g. 'Toyota,Honda'"),
          bodyTypes: z.string().optional().describe("Comma-separated body types, e.g. 'SUV,Sedan'"),
          fuelTypes: z.string().optional().describe("Comma-separated fuel types, e.g. 'Gas,Electric'"),
          yearRange: z.string().optional().describe("Year range, e.g. '2020-2024'"),
          priceRange: z.string().optional().describe("Price range, e.g. '15000-45000'"),
          milesMax: z.number().optional().describe("Maximum mileage"),
          zip: z.string().optional().describe("ZIP code for location"),
          radius: z.number().optional().describe("Search radius in miles"),
          sort_by: z.string().optional().describe("Sort: price, miles, year, dom"),
          sort_order: z.string().optional().describe("Sort order: asc or desc"),
          rows: z.number().optional().describe("Number of results (default 12)"),
        }),
        execute: async (args) => {
          return mcFetch("/search/car/active", {
            make: args.makes,
            body_type: args.bodyTypes,
            fuel_type: args.fuelTypes,
            year: args.yearRange,
            price_range: args.priceRange,
            miles_range: args.milesMax ? `0-${args.milesMax}` : undefined,
            zip: args.zip,
            radius: args.radius,
            sort_by: args.sort_by,
            sort_order: args.sort_order,
            rows: args.rows ?? 12,
            car_type: "used",
            stats: "price,miles",
            facets: "make,model,body_type",
            include_dealer_object: true,
          });
        },
      }),

      "decode-vin": tool({
        description: "Decode a VIN to get full vehicle specs: year, make, model, trim, engine, transmission, drivetrain, fuel type, MPG, MSRP, and more.",
        parameters: z.object({
          vin: z.string().describe("17-character VIN"),
        }),
        execute: async ({ vin }) => mcFetch(`/decode/car/neovin/${vin}/specs`),
      }),

      "predict-price": tool({
        description: "Predict fair market price for a vehicle using comparable sales. Returns predicted price, range, confidence, and comparables.",
        parameters: z.object({
          vin: z.string().describe("17-character VIN"),
          miles: z.number().optional().describe("Current mileage"),
          zip: z.string().optional().describe("ZIP for regional pricing"),
          dealer_type: z.enum(["franchise", "independent"]).optional().describe("'franchise' for retail, 'independent' for wholesale"),
        }),
        execute: async (args) =>
          mcFetch("/predict/car/us/marketcheck_price/comparables", {
            vin: args.vin,
            miles: args.miles,
            dealer_type: args.dealer_type ?? "franchise",
            zip: args.zip,
          }),
      }),

      "get-car-history": tool({
        description: "Get listing history for a vehicle by VIN — price changes, dealer transfers, days on market over time.",
        parameters: z.object({
          vin: z.string().describe("17-character VIN"),
          sort_order: z.enum(["asc", "desc"]).optional().describe("Sort: 'asc' oldest first, 'desc' newest first"),
        }),
        execute: async ({ vin, sort_order }) =>
          mcFetch(`/history/car/${vin}`, { sort_order: sort_order ?? "desc" }),
      }),

      "search-sold": tool({
        description: "Search recently sold vehicles (past 90 days). Returns transaction prices and stats for market analysis.",
        parameters: z.object({
          make: z.string().optional().describe("Vehicle make"),
          model: z.string().optional().describe("Vehicle model"),
          year: z.string().optional().describe("Year or range, e.g. '2022' or '2020-2024'"),
          zip: z.string().optional().describe("ZIP code"),
          radius: z.number().optional().describe("Radius in miles"),
          rows: z.number().optional().describe("Number of results (default 10)"),
        }),
        execute: async (args) =>
          mcFetch("/search/car/recents", {
            make: args.make,
            model: args.model,
            year: args.year,
            zip: args.zip,
            radius: args.radius,
            rows: args.rows ?? 10,
            stats: "price",
          }),
      }),

      "get-sold-summary": tool({
        description: "Aggregated sold vehicle market data — rankings by make, body_type, state, fuel_type. For market share, demand analysis, trends.",
        parameters: z.object({
          ranking_dimensions: z.string().optional().describe("Grouping: make, model, body_type, state, fuel_type"),
          ranking_measure: z.string().optional().describe("Measures: sold_count, average_sale_price, average_days_on_market"),
          ranking_order: z.enum(["asc", "desc"]).optional(),
          top_n: z.number().optional().describe("Number of top results"),
          make: z.string().optional(),
          model: z.string().optional(),
          state: z.string().optional().describe("State abbreviation, e.g. 'CA'"),
          inventory_type: z.enum(["Used", "New"]).optional(),
        }),
        execute: async (args) =>
          mcFetch("/api/v1/sold-vehicles/summary", args, { noV2Prefix: true }),
      }),

      "search-incentives": tool({
        description: "Search current OEM incentives/rebates by ZIP — cash back, APR deals, lease specials, loyalty bonuses.",
        parameters: z.object({
          oem: z.string().describe("Manufacturer, e.g. 'Toyota'"),
          zip: z.string().describe("ZIP code"),
          model: z.string().optional().describe("Specific model to filter"),
        }),
        execute: async (args) =>
          mcFetch("/incentives/by-zip", { oem: args.oem, zip: args.zip, model: args.model }),
      }),

      "evaluate-deal": tool({
        description: "Full deal evaluation: decode VIN, predict price, pull history, find comparables. Use when user asks 'is this a good deal?'",
        parameters: z.object({
          vin: z.string().describe("17-character VIN"),
          zip: z.string().optional().describe("Buyer's ZIP"),
          miles: z.number().optional().describe("Current mileage"),
        }),
        execute: async (args) => {
          const decode = await mcFetch(`/decode/car/neovin/${args.vin}/specs`);
          const [prediction, history] = await Promise.all([
            mcFetch("/predict/car/us/marketcheck_price/comparables", {
              vin: args.vin,
              miles: args.miles,
              dealer_type: "franchise",
              zip: args.zip,
            }),
            mcFetch(`/history/car/${args.vin}`, { sort_order: "desc" }),
          ]);
          const activeComps = await mcFetch("/search/car/active", {
            make: decode?.make,
            model: decode?.model,
            year: decode?.year ? `${decode.year - 1}-${decode.year + 1}` : undefined,
            zip: args.zip,
            radius: 75,
            stats: "price,miles,dom",
            rows: 10,
            sort_by: "price",
            sort_order: "asc",
          });
          return { decode, prediction, activeComps, history };
        },
      }),

      "estimate-trade-in": tool({
        description: "Estimate trade-in value: decode VIN, predict retail + wholesale values, find comparable sold vehicles.",
        parameters: z.object({
          vin: z.string().describe("17-character VIN"),
          zip: z.string().optional().describe("ZIP for regional pricing"),
          miles: z.number().optional().describe("Current mileage"),
        }),
        execute: async (args) => {
          const decode = await mcFetch(`/decode/car/neovin/${args.vin}/specs`);
          const [retail, wholesale] = await Promise.all([
            mcFetch("/predict/car/us/marketcheck_price/comparables", {
              vin: args.vin, miles: args.miles, dealer_type: "franchise", zip: args.zip,
            }),
            mcFetch("/predict/car/us/marketcheck_price/comparables", {
              vin: args.vin, miles: args.miles, dealer_type: "independent", zip: args.zip,
            }),
          ]);
          const soldComps = await mcFetch("/search/car/recents", {
            make: decode?.make, model: decode?.model,
            year: decode?.year ? `${decode.year - 1}-${decode.year + 1}` : undefined,
            zip: args.zip, radius: 100, rows: 10, stats: "price",
          });
          return { decode, retail, wholesale, soldComps };
        },
      }),
    },
    maxSteps: 5,
  });

  return result.toDataStreamResponse();
}
