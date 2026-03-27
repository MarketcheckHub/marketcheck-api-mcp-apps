/**
 * Curated MarketCheck tool definitions in Anthropic Claude API format.
 * These are the most useful tools for conversational chat demos.
 * Each tool maps to a composite handler in packages/server/src/proxy.ts.
 */

export interface ToolDefinition {
  name: string;
  description: string;
  input_schema: {
    type: "object";
    properties: Record<string, any>;
    required?: string[];
  };
}

export const TOOLS: ToolDefinition[] = [
  {
    name: "search-cars",
    description:
      "Search active used car listings with filters for make, model, body type, price range, year, mileage, fuel type, and location. Returns listings with dealer info, stats, and facets. Use this when the user wants to find cars matching specific criteria.",
    input_schema: {
      type: "object",
      properties: {
        makes: {
          type: "string",
          description: "Comma-separated makes, e.g. 'Toyota,Honda,Ford'",
        },
        bodyTypes: {
          type: "string",
          description: "Comma-separated body types, e.g. 'SUV,Sedan,Truck'",
        },
        fuelTypes: {
          type: "string",
          description: "Comma-separated fuel types, e.g. 'Gas,Electric,Hybrid'",
        },
        yearRange: {
          type: "string",
          description: "Year range, e.g. '2020-2024'",
        },
        priceRange: {
          type: "string",
          description: "Price range, e.g. '15000-45000'",
        },
        milesMax: {
          type: "number",
          description: "Maximum mileage filter",
        },
        zip: {
          type: "string",
          description: "ZIP code for location-based search",
        },
        radius: {
          type: "number",
          description: "Search radius in miles from ZIP (default 50)",
        },
        sort_by: {
          type: "string",
          description: "Sort field: price, miles, year, dom",
        },
        sort_order: {
          type: "string",
          description: "Sort order: asc or desc",
        },
        rows: {
          type: "number",
          description: "Number of results (default 12, max 50)",
        },
      },
    },
  },
  {
    name: "decode-vin",
    description:
      "Decode a Vehicle Identification Number (VIN) to get full vehicle specs: year, make, model, trim, engine, transmission, drivetrain, fuel type, MPG, MSRP, body type, and more. Use this when the user provides a VIN and wants to know what vehicle it is.",
    input_schema: {
      type: "object",
      properties: {
        vin: {
          type: "string",
          description: "17-character Vehicle Identification Number",
        },
      },
      required: ["vin"],
    },
  },
  {
    name: "predict-price",
    description:
      "Predict the fair market price for a specific vehicle using comparable sales data. Returns predicted price, price range, confidence score, and comparable vehicles used. Use this for trade-in estimates, appraisals, or price checks.",
    input_schema: {
      type: "object",
      properties: {
        vin: {
          type: "string",
          description: "17-character VIN of the vehicle to price",
        },
        miles: {
          type: "number",
          description: "Current mileage of the vehicle",
        },
        zip: {
          type: "string",
          description: "ZIP code for regional pricing",
        },
        dealer_type: {
          type: "string",
          description: "'franchise' for retail value, 'independent' for wholesale value",
          enum: ["franchise", "independent"],
        },
      },
      required: ["vin"],
    },
  },
  {
    name: "get-car-history",
    description:
      "Get the listing history of a specific vehicle by VIN. Shows how its price and listing status have changed over time across dealers. Useful for understanding a vehicle's market journey.",
    input_schema: {
      type: "object",
      properties: {
        vin: {
          type: "string",
          description: "17-character VIN",
        },
        sort_order: {
          type: "string",
          description: "Sort order: 'asc' for oldest first, 'desc' for newest first",
          enum: ["asc", "desc"],
        },
      },
      required: ["vin"],
    },
  },
  {
    name: "search-sold",
    description:
      "Search recently sold vehicles (past 90 days) with filters. Returns sold listings with transaction prices and stats. Use this for market analysis, pricing benchmarks, and understanding what vehicles have actually sold for.",
    input_schema: {
      type: "object",
      properties: {
        make: { type: "string", description: "Vehicle make, e.g. 'Toyota'" },
        model: { type: "string", description: "Vehicle model, e.g. 'Camry'" },
        year: { type: "string", description: "Year or year range, e.g. '2022' or '2020-2024'" },
        zip: { type: "string", description: "ZIP code for location" },
        radius: { type: "number", description: "Search radius in miles" },
        rows: { type: "number", description: "Number of results (default 10)" },
        stats: { type: "string", description: "Stat fields, e.g. 'price'" },
      },
    },
  },
  {
    name: "get-sold-summary",
    description:
      "Get aggregated sold vehicle market summary data. Returns rankings, averages, and counts grouped by dimensions like make, model, body_type, state, or fuel_type. Use this for market share analysis, demand intelligence, and trend reporting.",
    input_schema: {
      type: "object",
      properties: {
        ranking_dimensions: {
          type: "string",
          description: "Comma-separated grouping dimensions: make, model, body_type, state, fuel_type, fuel_type_category",
        },
        ranking_measure: {
          type: "string",
          description: "Comma-separated measures: sold_count, average_sale_price, average_days_on_market",
        },
        ranking_order: {
          type: "string",
          description: "Sort order: 'asc' or 'desc'",
          enum: ["asc", "desc"],
        },
        top_n: {
          type: "number",
          description: "Number of top results to return",
        },
        make: { type: "string", description: "Filter by make" },
        model: { type: "string", description: "Filter by model" },
        state: { type: "string", description: "Filter by state abbreviation, e.g. 'CA'" },
        inventory_type: {
          type: "string",
          description: "Inventory type: 'Used' or 'New'",
          enum: ["Used", "New"],
        },
      },
    },
  },
  {
    name: "rank-dealers",
    description:
      "Rank dealers near a location for a specific vehicle type. Shows which dealers have the best prices, most inventory, and fastest turns for a given make/model. Useful for finding the best dealer to buy from.",
    input_schema: {
      type: "object",
      properties: {
        make: { type: "string", description: "Vehicle make" },
        model: { type: "string", description: "Vehicle model" },
        zip: { type: "string", description: "ZIP code to search around" },
        radius: { type: "number", description: "Search radius in miles (default 50)" },
        rows: { type: "number", description: "Number of dealers to return" },
      },
      required: ["make", "zip"],
    },
  },
  {
    name: "search-incentives",
    description:
      "Search current OEM incentives and rebates available in a ZIP code area. Returns cash back offers, APR deals, lease specials, and loyalty bonuses by manufacturer. Use this when the user asks about deals, rebates, or incentives.",
    input_schema: {
      type: "object",
      properties: {
        oem: { type: "string", description: "Manufacturer name, e.g. 'Toyota', 'Ford'" },
        zip: { type: "string", description: "ZIP code to check incentives for" },
        model: { type: "string", description: "Specific model to filter incentives" },
      },
      required: ["oem", "zip"],
    },
  },
  {
    name: "evaluate-deal",
    description:
      "Comprehensive deal evaluation for a specific vehicle. Decodes the VIN, predicts fair market price, pulls listing history, and finds comparable active listings. Use this when a user wants to know if a specific car is a good deal.",
    input_schema: {
      type: "object",
      properties: {
        vin: { type: "string", description: "17-character VIN of the vehicle" },
        zip: { type: "string", description: "Buyer's ZIP code for regional pricing" },
        miles: { type: "number", description: "Current mileage" },
      },
      required: ["vin"],
    },
  },
  {
    name: "estimate-trade-in",
    description:
      "Estimate the trade-in value of a vehicle. Decodes the VIN, predicts both retail and wholesale values, and finds recent comparable sales. Use this when a user wants to know what their car is worth for a trade-in.",
    input_schema: {
      type: "object",
      properties: {
        vin: { type: "string", description: "17-character VIN of the trade-in vehicle" },
        zip: { type: "string", description: "ZIP code for regional pricing" },
        miles: { type: "number", description: "Current mileage" },
      },
      required: ["vin"],
    },
  },
];

/** Tool name to proxy endpoint mapping (some tools use different proxy names) */
export const TOOL_PROXY_MAP: Record<string, string> = {
  "decode-vin": "decode-vin",
  "predict-price": "predict-price",
  "search-cars": "search-cars",
  "search-sold": "search-sold",
  "get-car-history": "get-car-history",
  "get-sold-summary": "get-sold-summary",
  "rank-dealers": "rank-dealers",
  "search-incentives": "search-incentives",
  "evaluate-deal": "evaluate-deal",
  "estimate-trade-in": "estimate-trade-in",
};
