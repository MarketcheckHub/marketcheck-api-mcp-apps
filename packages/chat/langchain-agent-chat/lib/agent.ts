/**
 * LangGraph ReAct agent with MarketCheck tools.
 * Uses Claude as the LLM and custom tool definitions that call MarketCheck API.
 */

import { ChatAnthropic } from "@langchain/anthropic";
import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { createReactAgent } from "@langchain/langgraph/prebuilt";

const MC_API_HOST = "https://api.marketcheck.com";
const MC_API_KEY = process.env.MARKETCHECK_API_KEY ?? "";

async function mcFetch(path: string, params: Record<string, any> = {}, opts?: { noV2Prefix?: boolean }) {
  const basePath = opts?.noV2Prefix ? "" : "/v2";
  const url = new URL(`${MC_API_HOST}${basePath}${path}`);
  url.searchParams.set("api_key", MC_API_KEY);
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== "") url.searchParams.set(k, String(v));
  }
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`MarketCheck API ${res.status}`);
  return res.json();
}

const searchCarsTool = tool(
  async (args) => {
    const result = await mcFetch("/search/car/active", {
      make: args.makes, body_type: args.bodyTypes, year: args.yearRange,
      price_range: args.priceRange, zip: args.zip, radius: args.radius,
      rows: args.rows ?? 10, car_type: "used", stats: "price,miles",
      facets: "make,model,body_type", include_dealer_object: "true",
    });
    return JSON.stringify(result);
  },
  {
    name: "search_cars",
    description: "Search active used car listings with filters for make, model, body type, price, year, location.",
    schema: z.object({
      makes: z.string().optional().describe("Comma-separated makes"),
      bodyTypes: z.string().optional().describe("Body types"),
      yearRange: z.string().optional().describe("Year range, e.g. '2020-2024'"),
      priceRange: z.string().optional().describe("Price range, e.g. '15000-45000'"),
      zip: z.string().optional().describe("ZIP code"),
      radius: z.number().optional().describe("Radius in miles"),
      rows: z.number().optional().describe("Number of results"),
    }),
  }
);

const decodeVinTool = tool(
  async ({ vin }) => JSON.stringify(await mcFetch(`/decode/car/neovin/${vin}/specs`)),
  {
    name: "decode_vin",
    description: "Decode a VIN to get full vehicle specs.",
    schema: z.object({ vin: z.string().describe("17-character VIN") }),
  }
);

const predictPriceTool = tool(
  async (args) => {
    const result = await mcFetch("/predict/car/us/marketcheck_price/comparables", {
      vin: args.vin, miles: args.miles, zip: args.zip,
      dealer_type: args.dealer_type ?? "franchise",
    });
    return JSON.stringify(result);
  },
  {
    name: "predict_price",
    description: "Predict fair market price for a vehicle using comparables.",
    schema: z.object({
      vin: z.string().describe("VIN"),
      miles: z.number().optional(),
      zip: z.string().optional(),
      dealer_type: z.string().optional(),
    }),
  }
);

const carHistoryTool = tool(
  async ({ vin }) => JSON.stringify(await mcFetch(`/history/car/${vin}`, { sort_order: "desc" })),
  {
    name: "get_car_history",
    description: "Get listing history for a vehicle by VIN.",
    schema: z.object({ vin: z.string() }),
  }
);

const incentivesTool = tool(
  async (args) => JSON.stringify(await mcFetch("/incentives/by-zip", { oem: args.oem, zip: args.zip })),
  {
    name: "search_incentives",
    description: "Search OEM incentives/rebates by ZIP.",
    schema: z.object({ oem: z.string(), zip: z.string() }),
  }
);

const soldSummaryTool = tool(
  async (args) => JSON.stringify(await mcFetch("/api/v1/sold-vehicles/summary", args, { noV2Prefix: true })),
  {
    name: "get_sold_summary",
    description: "Aggregated sold vehicle market summary data.",
    schema: z.object({
      ranking_dimensions: z.string().optional(),
      ranking_measure: z.string().optional(),
      ranking_order: z.string().optional(),
      top_n: z.number().optional(),
      state: z.string().optional(),
      inventory_type: z.string().optional(),
    }),
  }
);

const tools = [searchCarsTool, decodeVinTool, predictPriceTool, carHistoryTool, incentivesTool, soldSummaryTool];

export function createAgent() {
  const model = new ChatAnthropic({
    modelName: "claude-sonnet-4-20250514",
    temperature: 0,
  });

  return createReactAgent({
    llm: model,
    tools,
    messageModifier: `You are MarketCheck AI, an expert automotive market assistant powered by real-time data from the MarketCheck API covering 95%+ of US dealer inventory. Always use tools to back claims with real data. Format prices as $XX,XXX. Be concise but thorough. Show your reasoning process.`,
  });
}
