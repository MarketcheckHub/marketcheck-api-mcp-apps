import {
  CopilotRuntime,
  AnthropicAdapter,
  copilotRuntimeNextJSAppRouterEndpoint,
} from "@copilotkit/runtime";

const anthropicAdapter = new AnthropicAdapter({
  model: "claude-sonnet-4-20250514",
});

const runtime = new CopilotRuntime({
  actions: [
    {
      name: "search_cars",
      description:
        "Search active used car listings with filters for make, model, body type, price range, year, mileage, fuel type, and location.",
      parameters: [
        { name: "makes", type: "string", description: "Comma-separated makes, e.g. 'Toyota,Honda'", required: false },
        { name: "bodyTypes", type: "string", description: "Body types, e.g. 'SUV,Sedan'", required: false },
        { name: "yearRange", type: "string", description: "Year range, e.g. '2020-2024'", required: false },
        { name: "priceRange", type: "string", description: "Price range, e.g. '15000-45000'", required: false },
        { name: "zip", type: "string", description: "ZIP code for location", required: false },
        { name: "radius", type: "number", description: "Search radius in miles", required: false },
        { name: "rows", type: "number", description: "Number of results (default 12)", required: false },
      ],
      handler: async (args: any) => {
        const apiKey = process.env.MARKETCHECK_API_KEY ?? "";
        const url = new URL("https://api.marketcheck.com/v2/search/car/active");
        url.searchParams.set("api_key", apiKey);
        if (args.makes) url.searchParams.set("make", args.makes);
        if (args.bodyTypes) url.searchParams.set("body_type", args.bodyTypes);
        if (args.yearRange) url.searchParams.set("year", args.yearRange);
        if (args.priceRange) url.searchParams.set("price_range", args.priceRange);
        if (args.zip) url.searchParams.set("zip", args.zip);
        if (args.radius) url.searchParams.set("radius", String(args.radius));
        url.searchParams.set("rows", String(args.rows ?? 12));
        url.searchParams.set("car_type", "used");
        url.searchParams.set("stats", "price,miles");
        url.searchParams.set("facets", "make,model,body_type");
        url.searchParams.set("include_dealer_object", "true");
        const res = await fetch(url.toString());
        return res.json();
      },
    },
    {
      name: "decode_vin",
      description: "Decode a VIN to get full vehicle specs: year, make, model, trim, engine, transmission, drivetrain, fuel type, MPG, MSRP.",
      parameters: [
        { name: "vin", type: "string", description: "17-character VIN", required: true },
      ],
      handler: async (args: any) => {
        const apiKey = process.env.MARKETCHECK_API_KEY ?? "";
        const res = await fetch(`https://api.marketcheck.com/v2/decode/car/neovin/${args.vin}/specs?api_key=${apiKey}`);
        return res.json();
      },
    },
    {
      name: "predict_price",
      description: "Predict fair market price for a vehicle using comparable sales data.",
      parameters: [
        { name: "vin", type: "string", description: "17-character VIN", required: true },
        { name: "miles", type: "number", description: "Current mileage", required: false },
        { name: "zip", type: "string", description: "ZIP for regional pricing", required: false },
        { name: "dealer_type", type: "string", description: "'franchise' for retail, 'independent' for wholesale", required: false },
      ],
      handler: async (args: any) => {
        const apiKey = process.env.MARKETCHECK_API_KEY ?? "";
        const url = new URL("https://api.marketcheck.com/v2/predict/car/us/marketcheck_price/comparables");
        url.searchParams.set("api_key", apiKey);
        url.searchParams.set("vin", args.vin);
        if (args.miles) url.searchParams.set("miles", String(args.miles));
        if (args.zip) url.searchParams.set("zip", args.zip);
        url.searchParams.set("dealer_type", args.dealer_type ?? "franchise");
        const res = await fetch(url.toString());
        return res.json();
      },
    },
    {
      name: "get_car_history",
      description: "Get listing history for a vehicle by VIN — price changes and dealer transfers over time.",
      parameters: [
        { name: "vin", type: "string", description: "17-character VIN", required: true },
      ],
      handler: async (args: any) => {
        const apiKey = process.env.MARKETCHECK_API_KEY ?? "";
        const res = await fetch(`https://api.marketcheck.com/v2/history/car/${args.vin}?api_key=${apiKey}&sort_order=desc`);
        return res.json();
      },
    },
    {
      name: "search_incentives",
      description: "Search current OEM incentives/rebates by ZIP — cash back, APR deals, lease specials.",
      parameters: [
        { name: "oem", type: "string", description: "Manufacturer, e.g. 'Toyota'", required: true },
        { name: "zip", type: "string", description: "ZIP code", required: true },
        { name: "model", type: "string", description: "Specific model", required: false },
      ],
      handler: async (args: any) => {
        const apiKey = process.env.MARKETCHECK_API_KEY ?? "";
        const url = new URL("https://api.marketcheck.com/v2/incentives/by-zip");
        url.searchParams.set("api_key", apiKey);
        url.searchParams.set("oem", args.oem);
        url.searchParams.set("zip", args.zip);
        if (args.model) url.searchParams.set("model", args.model);
        const res = await fetch(url.toString());
        return res.json();
      },
    },
    {
      name: "get_sold_summary",
      description: "Aggregated sold vehicle market data — rankings by make, body_type, state. For market share and demand analysis.",
      parameters: [
        { name: "ranking_dimensions", type: "string", description: "Grouping: make, model, body_type, state", required: false },
        { name: "ranking_measure", type: "string", description: "Measures: sold_count, average_sale_price", required: false },
        { name: "ranking_order", type: "string", description: "asc or desc", required: false },
        { name: "top_n", type: "number", description: "Number of top results", required: false },
        { name: "state", type: "string", description: "State abbreviation", required: false },
        { name: "inventory_type", type: "string", description: "'Used' or 'New'", required: false },
      ],
      handler: async (args: any) => {
        const apiKey = process.env.MARKETCHECK_API_KEY ?? "";
        const url = new URL("https://api.marketcheck.com/api/v1/sold-vehicles/summary");
        url.searchParams.set("api_key", apiKey);
        for (const [k, v] of Object.entries(args)) {
          if (v !== undefined && v !== null && v !== "") url.searchParams.set(k, String(v));
        }
        const res = await fetch(url.toString());
        return res.json();
      },
    },
  ],
});

export const POST = async (req: Request) => {
  const { handleRequest } = copilotRuntimeNextJSAppRouterEndpoint({
    runtime,
    serviceAdapter: anthropicAdapter,
    endpoint: "/api/copilotkit",
  });

  return handleRequest(req);
};
