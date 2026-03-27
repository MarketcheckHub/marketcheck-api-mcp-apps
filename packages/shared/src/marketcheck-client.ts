/**
 * Typed wrapper around MarketCheck MCP tool calls.
 * Used by the MCP App server to call MC API via the host's tool-call mechanism,
 * or directly via HTTP when running standalone.
 */

const MC_API_BASE = process.env.MC_API_BASE ?? "https://mc-api.marketcheck.com/v2";
const MC_API_KEY_DEFAULT = process.env.MARKETCHECK_API_KEY ?? "";

/**
 * Global override for the API key — set by the MCP endpoint when a client
 * connects with ?api_key=XXX on the MCP URL. Falls back to env var.
 */
let _mcApiKeyOverride: string | null = null;
export function setMcApiKeyOverride(key: string | null) { _mcApiKeyOverride = key; }
export function getMcApiKey(): string { return _mcApiKeyOverride || MC_API_KEY_DEFAULT; }

interface RequestParams {
  [key: string]: string | number | boolean | undefined;
}

async function mcGet<T>(endpoint: string, params: RequestParams): Promise<T> {
  const url = new URL(`${MC_API_BASE}${endpoint}`);
  url.searchParams.set("api_key", getMcApiKey());
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== "") url.searchParams.set(k, String(v));
  }
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`MC API ${res.status}: ${await res.text()}`);
  return res.json() as Promise<T>;
}

async function mcPost<T>(endpoint: string, body: Record<string, unknown>): Promise<T> {
  const url = new URL(`${MC_API_BASE}${endpoint}`);
  url.searchParams.set("api_key", getMcApiKey());
  const res = await fetch(url.toString(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`MC API ${res.status}: ${await res.text()}`);
  return res.json() as Promise<T>;
}

export class MarketCheckClient {
  async searchActiveCars(params: {
    make?: string; model?: string; year?: string; trim?: string;
    body_type?: string; fuel_type?: string; drivetrain?: string; transmission?: string;
    price_range?: string; miles_range?: string; dom_range?: string;
    zip?: string; radius?: number; state?: string; city?: string;
    dealer_id?: string; dealer_type?: string;
    car_type?: string; seller_type?: string;
    sort_by?: string; sort_order?: string;
    rows?: number; start?: number;
    stats?: string; facets?: string;
    include_dealer_object?: boolean;
  }) {
    return mcGet<any>("/search/car/active", params as RequestParams);
  }

  async searchPast90Days(params: {
    make?: string; model?: string; year?: string;
    body_type?: string; fuel_type?: string;
    price_range?: string; miles_range?: string;
    zip?: string; radius?: number; state?: string;
    dealer_type?: string; sold?: boolean;
    sort_by?: string; sort_order?: string;
    rows?: number; start?: number;
    stats?: string;
  }) {
    return mcGet<any>("/search/car/past90", params as RequestParams);
  }

  async predictPrice(params: {
    vin: string;
    miles?: number;
    dealer_type?: string;
    zip?: string;
    is_certified?: boolean;
  }) {
    return mcGet<any>("/pricing/predict", params as RequestParams);
  }

  async decodeVin(vin: string) {
    return mcPost<any>("/decode/neovin", { vin });
  }

  async getCarHistory(params: { vin: string; sort_order?: string }) {
    return mcGet<any>("/history/listings", params as RequestParams);
  }

  async getSoldSummary(params: {
    date_from?: string; date_to?: string;
    inventory_type?: string; dealer_type?: string;
    state?: string; make?: string; model?: string;
    body_type?: string; fuel_type_category?: string;
    ranking_dimensions?: string; ranking_measure?: string;
    ranking_order?: string; top_n?: number;
    summary_by?: string;
  }) {
    return mcGet<any>("/api/v1/sold-vehicles/summary", params as RequestParams);
  }

  async searchOemIncentivesByZip(params: {
    oem?: string; zip?: string; model?: string;
  }) {
    return mcGet<any>("/incentives/by-zip", params as RequestParams);
  }

  async searchUkActiveCars(params: {
    make?: string; model?: string; year?: string;
    postal_code?: string; radius?: number;
    price_range?: string; miles_range?: string;
    rows?: number; start?: number; stats?: string;
  }) {
    return mcGet<any>("/search/car/uk/active", params as RequestParams);
  }

  async searchUkRecentCars(params: {
    make?: string; model?: string; year?: string;
    postal_code?: string; radius?: number;
    rows?: number; start?: number; stats?: string;
  }) {
    return mcGet<any>("/search/car/uk/recents", params as RequestParams);
  }

  async rankDealersForVehicle(params: {
    vin: string;
    zip?: string;
    radius?: number;
    rows?: number;
  }) {
    return mcGet<any>("/rank/dealers", params as RequestParams);
  }

  async rankVehiclesForDealer(params: {
    dealer_id: string;
    make?: string;
    model?: string;
    year?: string;
    rows?: number;
  }) {
    return mcGet<any>("/rank/vehicles", params as RequestParams);
  }

  async searchOemIncentives(params: {
    oem?: string;
    model?: string;
    offer_type?: string;
    rows?: number;
    start?: number;
  }) {
    return mcGet<any>("/incentives/search", params as RequestParams);
  }
}
