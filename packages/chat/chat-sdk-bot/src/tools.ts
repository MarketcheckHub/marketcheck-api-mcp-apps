/**
 * MarketCheck tool execution for the Chat SDK bot.
 * Calls MarketCheck API directly (server-side).
 */

const MC_API_HOST = "https://api.marketcheck.com";
const MC_API_KEY = process.env.MARKETCHECK_API_KEY ?? "";

async function mcFetch(
  path: string,
  params: Record<string, any> = {},
  opts?: { noV2Prefix?: boolean },
): Promise<any> {
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

export async function executeTool(name: string, args: Record<string, any>): Promise<any> {
  switch (name) {
    case "search_cars":
      return mcFetch("/search/car/active", {
        make: args.makes, body_type: args.body_types,
        year: args.year_range, price_range: args.price_range,
        zip: args.zip, radius: args.radius, rows: args.rows ?? 8,
        car_type: "used", stats: "price,miles",
        include_dealer_object: "true",
      });
    case "decode_vin":
      return mcFetch(`/decode/car/neovin/${args.vin}/specs`);
    case "predict_price":
      return mcFetch("/predict/car/us/marketcheck_price/comparables", {
        vin: args.vin, miles: args.miles, zip: args.zip,
        dealer_type: args.dealer_type ?? "franchise",
      });
    case "get_car_history":
      return mcFetch(`/history/car/${args.vin}`, { sort_order: "desc" });
    case "search_incentives":
      return mcFetch("/incentives/by-zip", { oem: args.oem, zip: args.zip });
    case "get_sold_summary":
      return mcFetch("/api/v1/sold-vehicles/summary", args, { noV2Prefix: true });
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}
