# Car Search & Compare ![Consumer](https://img.shields.io/badge/Consumer-10b981?style=flat-square)

![Screenshot](../../../static/screenshots/car-search-compare.png)

## Overview

Visual car shopping experience with powerful filters (make, model, body type, price, year, mileage, fuel type, location) and side-by-side comparison of 2-3 vehicles. Shows full specs, predicted prices, and key differences. Photo cards with dealer info and days-on-market indicators.

## Who Is This For

Car shoppers and buyers looking for market intelligence

## MarketCheck API Endpoints Used

| Endpoint | Name | Docs |
|----------|------|------|
| `GET /v2/search/car/active` | Search Active Listings | [View docs](https://apidocs.marketcheck.com/#search-active) |
| `GET /v2/decode/car/neovin/{vin}/specs` | VIN Decode | [View docs](https://apidocs.marketcheck.com/#decode-vin) |
| `GET /v2/predict/car/us/marketcheck_price/comparables` | Price Prediction | [View docs](https://apidocs.marketcheck.com/#price-prediction) |

## Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `makes` | string | No | Comma-separated makes |
| `bodyTypes` | string | No | Body types, e.g. 'SUV,Sedan' |
| `priceRange` | string | No | Price range, e.g. '15000-45000' |
| `zip` | string | No | ZIP code for location-based search |
| `vins` | string[] | No | Array of 2-3 VINs to compare |

## Derivative API Endpoint

**`POST https://apps.marketcheck.com/api/proxy/search-cars`**

> This is a composite endpoint that orchestrates multiple MarketCheck API calls into a single response. It is provided for reference and experimentation purposes only and is not under LTS (Long-Term Support).

**`POST https://apps.marketcheck.com/api/proxy/compare-cars`**

> This is a composite endpoint that orchestrates multiple MarketCheck API calls into a single response. It is provided for reference and experimentation purposes only and is not under LTS (Long-Term Support).

## How to Run

### Browser (standalone)

Open the app directly in a browser with your MarketCheck API key:

```
https://apps.marketcheck.com/app/car-search-compare/?api_key=YOUR_API_KEY
```

### MCP (Model Context Protocol)

Add to your MCP client configuration (e.g. Claude Desktop):

```json
{
  "mcpServers": {
    "marketcheck": {
      "command": "npx",
      "args": [
        "-y",
        "@anthropic/marketcheck-mcp"
      ],
      "env": {
        "MARKETCHECK_API_KEY": "YOUR_API_KEY"
      }
    }
  }
}
```

### Embed (iframe)

Embed in any webpage:

```html
<iframe src="https://apps.marketcheck.com/app/car-search-compare/?api_key=YOUR_API_KEY" width="100%" height="800" frameborder="0"></iframe>
```

## Limitations

- Demo mode shows mock data
- Requires MarketCheck API key for live data
- Browser-based — no server required for standalone use
- Data covers US market (95%+ of dealer inventory)

## Links

- [MarketCheck Developer Portal](https://developers.marketcheck.com)
- [API Documentation](https://apidocs.marketcheck.com)
- [Car Search & Compare App](https://apps.marketcheck.com/app/car-search-compare/)
- [GitHub Repository](https://github.com/anthropics/marketcheck-mcp-apps)
