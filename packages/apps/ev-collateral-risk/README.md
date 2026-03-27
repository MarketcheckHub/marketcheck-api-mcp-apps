# EV Collateral Risk Monitor ![Lender](https://img.shields.io/badge/Lender-06b6d4?style=flat-square)

![Screenshot](../../../static/screenshots/ev-collateral-risk.png)

## Overview

Tracks depreciation divergence between EV and ICE vehicles in your portfolio. Monitors EV-specific risks: battery degradation proxy (age + mileage), rapid model year devaluation, and regional EV demand variations.

## Who Is This For

Auto lenders, underwriters, and portfolio risk managers

## MarketCheck API Endpoints Used

| Endpoint | Name | Docs |
|----------|------|------|
| `GET /v2/decode/car/neovin/{vin}/specs` | VIN Decode | [View docs](https://apidocs.marketcheck.com/#decode-vin) |
| `GET /v2/predict/car/us/marketcheck_price/comparables` | Price Prediction | [View docs](https://apidocs.marketcheck.com/#price-prediction) |
| `GET /api/v1/sold-vehicles/summary` | Sold Vehicle Summary | [View docs](https://apidocs.marketcheck.com/#sold-summary) |

## Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `vins` | string | Yes | Portfolio VINs |
| `zip` | string | Yes | Market ZIP |

## Derivative API Endpoint

**`POST https://apps.marketcheck.com/api/proxy/ev-collateral-risk`**

> This endpoint is provided for reference and experimentation purposes only and is not under LTS (Long-Term Support).

## How to Run

### Browser (standalone)

Open the app directly in a browser with your MarketCheck API key:

```
https://apps.marketcheck.com/app/ev-collateral-risk/?api_key=YOUR_API_KEY
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
<iframe src="https://apps.marketcheck.com/app/ev-collateral-risk/?api_key=YOUR_API_KEY" width="100%" height="800" frameborder="0"></iframe>
```

## Limitations

- Demo mode shows mock data
- Requires MarketCheck API key for live data
- Browser-based — no server required for standalone use
- Data covers US market (95%+ of dealer inventory)

## Links

- [MarketCheck Developer Portal](https://developers.marketcheck.com)
- [API Documentation](https://apidocs.marketcheck.com)
- [EV Collateral Risk Monitor App](https://apps.marketcheck.com/app/ev-collateral-risk/)
- [GitHub Repository](https://github.com/anthropics/marketcheck-mcp-apps)
