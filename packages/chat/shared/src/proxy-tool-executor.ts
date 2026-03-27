/**
 * Server-side tool executor that calls the MarketCheck proxy API.
 * Used by chat app API routes to execute tool calls requested by Claude.
 *
 * This connects to the same /api/proxy/:toolName endpoints used by the
 * existing single-page apps, reusing all composite handler logic.
 */

const MC_API_HOST = "https://api.marketcheck.com";

interface ExecutorConfig {
  /** MarketCheck API key (server-side only — never expose to browser) */
  apiKey: string;
  /** Base URL of the proxy (e.g., "https://marketcheck-mcp-apps.vercel.app" or "" for same-origin) */
  proxyBaseUrl?: string;
}

/**
 * Direct MarketCheck API fetch (server-side).
 * Maps tool names to MarketCheck API endpoints and calls them directly.
 * This avoids the proxy hop when running from a server-side API route.
 */
async function mcFetch(
  path: string,
  apiKey: string,
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
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`MarketCheck API ${res.status}: ${text}`);
  }
  return res.json();
}

/** Execute a tool call by name with given arguments. Returns the JSON result. */
export async function executeTool(
  toolName: string,
  args: Record<string, any>,
  config: ExecutorConfig,
): Promise<any> {
  const { apiKey } = config;

  switch (toolName) {
    case "decode-vin":
      return mcFetch(`/decode/car/neovin/${args.vin}/specs`, apiKey);

    case "predict-price":
      return mcFetch("/predict/car/us/marketcheck_price/comparables", apiKey, {
        vin: args.vin,
        miles: args.miles,
        dealer_type: args.dealer_type ?? "franchise",
        zip: args.zip,
      });

    case "search-cars":
      return mcFetch("/search/car/active", apiKey, {
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

    case "search-sold":
      return mcFetch("/search/car/recents", apiKey, {
        make: args.make,
        model: args.model,
        year: args.year,
        zip: args.zip,
        radius: args.radius,
        rows: args.rows ?? 10,
        stats: args.stats ?? "price",
      });

    case "get-car-history":
      return mcFetch(`/history/car/${args.vin}`, apiKey, {
        sort_order: args.sort_order ?? "desc",
      });

    case "get-sold-summary":
      return mcFetch("/api/v1/sold-vehicles/summary", apiKey, args, { noV2Prefix: true });

    case "rank-dealers": {
      // Search active cars grouped by dealer to find top dealers
      const results = await mcFetch("/search/car/active", apiKey, {
        make: args.make,
        model: args.model,
        zip: args.zip,
        radius: args.radius ?? 50,
        rows: 0,
        facets: "dealer_id",
        stats: "price,miles,dom",
      });
      return results;
    }

    case "search-incentives":
      return mcFetch("/incentives/by-zip", apiKey, {
        oem: args.oem,
        zip: args.zip,
        model: args.model,
      });

    case "evaluate-deal": {
      const decode = await mcFetch(`/decode/car/neovin/${args.vin}/specs`, apiKey);
      const [prediction, history] = await Promise.all([
        mcFetch("/predict/car/us/marketcheck_price/comparables", apiKey, {
          vin: args.vin,
          miles: args.miles,
          dealer_type: "franchise",
          zip: args.zip,
        }),
        mcFetch(`/history/car/${args.vin}`, apiKey, { sort_order: "desc" }),
      ]);
      const activeComps = await mcFetch("/search/car/active", apiKey, {
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
    }

    case "estimate-trade-in": {
      const decode = await mcFetch(`/decode/car/neovin/${args.vin}/specs`, apiKey);
      const [retail, wholesale] = await Promise.all([
        mcFetch("/predict/car/us/marketcheck_price/comparables", apiKey, {
          vin: args.vin,
          miles: args.miles,
          dealer_type: "franchise",
          zip: args.zip,
        }),
        mcFetch("/predict/car/us/marketcheck_price/comparables", apiKey, {
          vin: args.vin,
          miles: args.miles,
          dealer_type: "independent",
          zip: args.zip,
        }),
      ]);
      const soldComps = await mcFetch("/search/car/recents", apiKey, {
        make: decode?.make,
        model: decode?.model,
        year: decode?.year ? `${decode.year - 1}-${decode.year + 1}` : undefined,
        zip: args.zip,
        radius: 100,
        rows: 10,
        stats: "price",
      });
      return { decode, retail, wholesale, soldComps };
    }

    default:
      throw new Error(`Unknown tool: ${toolName}`);
  }
}
