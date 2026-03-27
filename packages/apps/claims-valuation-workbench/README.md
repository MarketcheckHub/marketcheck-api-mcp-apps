# Claims Valuation Workbench ![Insurer](https://img.shields.io/badge/Insurer-ec4899?style=flat-square)

![Screenshot](../../../static/screenshots/claims-valuation-workbench.png)

## Overview

Insurance claims valuation tool for total-loss determination. Provides fair market value using ML prediction, recent sold comparables within the claim area, regional pricing summary by state, and replacement vehicle options. All evidence needed for a defensible settlement.

## Who Is This For

Insurance adjusters, underwriters, and claims managers

## MarketCheck API Endpoints Used

| Endpoint | Name | Docs |
|----------|------|------|
| `GET /v2/decode/car/neovin/{vin}/specs` | VIN Decode | [View docs](https://apidocs.marketcheck.com/#decode-vin) |
| `GET /v2/predict/car/us/marketcheck_price/comparables` | Price Prediction | [View docs](https://apidocs.marketcheck.com/#price-prediction) |
| `GET /v2/search/car/recents` | Search Recent/Sold | [View docs](https://apidocs.marketcheck.com/#search-recent) |
| `GET /api/v1/sold-vehicles/summary` | Sold Vehicle Summary | [View docs](https://apidocs.marketcheck.com/#sold-summary) |
| `GET /v2/search/car/active` | Search Active Listings | [View docs](https://apidocs.marketcheck.com/#search-active) |

## Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `vin` | string | Yes | Claimed vehicle VIN |
| `miles` | number | No | Mileage at time of loss |
| `zip` | string | Yes | Claim location ZIP |

## Derivative API Endpoint

**`POST https://apps.marketcheck.com/api/proxy/claims-valuation`**

> This is a composite endpoint that orchestrates multiple MarketCheck API calls into a single response. It is provided for reference and experimentation purposes only and is not under LTS (Long-Term Support).

## How to Run

### Browser (standalone)

Open the app directly in a browser with your MarketCheck API key:

```
https://apps.marketcheck.com/app/claims-valuation-workbench/?api_key=YOUR_API_KEY
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
<iframe src="https://apps.marketcheck.com/app/claims-valuation-workbench/?api_key=YOUR_API_KEY" width="100%" height="800" frameborder="0"></iframe>
```

## Limitations

- Demo mode shows mock data
- Requires MarketCheck API key for live data
- Browser-based — no server required for standalone use
- Data covers US market (95%+ of dealer inventory)

## Links

- [MarketCheck Developer Portal](https://developers.marketcheck.com)
- [API Documentation](https://apidocs.marketcheck.com)
- [Claims Valuation Workbench App](https://apps.marketcheck.com/app/claims-valuation-workbench/)
- [GitHub Repository](https://github.com/anthropics/marketcheck-mcp-apps)
