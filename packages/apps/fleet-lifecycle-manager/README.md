# Fleet Lifecycle Manager ![Fleet Manager](https://img.shields.io/badge/Fleet%20Manager-059669?style=flat-square)

![Screenshot](../../../static/screenshots/fleet-lifecycle-manager.png)

## Overview

Fleet management tool for tracking vehicle values, depreciation trajectories, and optimal replacement timing. Batch-processes fleet VINs for current market values and suggests replacement vehicles from active inventory.

## Who Is This For

Fleet operators and procurement managers

## MarketCheck API Endpoints Used

| Endpoint | Name | Docs |
|----------|------|------|
| `GET /v2/decode/car/neovin/{vin}/specs` | VIN Decode | [View docs](https://apidocs.marketcheck.com/#decode-vin) |
| `GET /v2/predict/car/us/marketcheck_price/comparables` | Price Prediction | [View docs](https://apidocs.marketcheck.com/#price-prediction) |
| `GET /v2/search/car/active` | Search Active Listings | [View docs](https://apidocs.marketcheck.com/#search-active) |

## Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `vins` | string | Yes | Comma-separated fleet VINs |
| `zip` | string | Yes | Primary fleet location ZIP |

## Derivative API Endpoint

**`POST https://apps.marketcheck.com/api/proxy/manage-fleet-lifecycle`**

> This is a composite endpoint that orchestrates multiple MarketCheck API calls into a single response. It is provided for reference and experimentation purposes only and is not under LTS (Long-Term Support).

## How to Run

### Browser (standalone)

Open the app directly in a browser with your MarketCheck API key:

```
https://apps.marketcheck.com/app/fleet-lifecycle-manager/?api_key=YOUR_API_KEY
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
<iframe src="https://apps.marketcheck.com/app/fleet-lifecycle-manager/?api_key=YOUR_API_KEY" width="100%" height="800" frameborder="0"></iframe>
```

## Limitations

- Demo mode shows mock data
- Requires MarketCheck API key for live data
- Browser-based — no server required for standalone use
- Data covers US market (95%+ of dealer inventory)

## Links

- [MarketCheck Developer Portal](https://developers.marketcheck.com)
- [API Documentation](https://apidocs.marketcheck.com)
- [Fleet Lifecycle Manager App](https://apps.marketcheck.com/app/fleet-lifecycle-manager/)
- [GitHub Repository](https://github.com/anthropics/marketcheck-mcp-apps)
