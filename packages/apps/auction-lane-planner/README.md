# Auction Lane Planner ![Auction House](https://img.shields.io/badge/Auction%20House-84cc16?style=flat-square)

![Screenshot](../../../static/screenshots/auction-lane-planner.png)

## Overview

Auction planning tool for lane organization and consignment pricing. Groups vehicles by segment, estimates expected hammer prices using retail/wholesale predictions, and identifies likely buyer profiles based on local dealer demand patterns.

## Who Is This For

Auction operators, consignment managers

## MarketCheck API Endpoints Used

| Endpoint | Name | Docs |
|----------|------|------|
| `GET /v2/decode/car/neovin/{vin}/specs` | VIN Decode | [View docs](https://apidocs.marketcheck.com/#decode-vin) |
| `GET /v2/predict/car/us/marketcheck_price/comparables` | Price Prediction | [View docs](https://apidocs.marketcheck.com/#price-prediction) |
| `GET /api/v1/sold-vehicles/summary` | Sold Vehicle Summary | [View docs](https://apidocs.marketcheck.com/#sold-summary) |

## Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `vins` | string | Yes | Consignment VINs |
| `zip` | string | Yes | Auction location ZIP |

## Derivative API Endpoint

**`POST https://apps.marketcheck.com/api/proxy/auction-lane-planner`**

> This endpoint is provided for reference and experimentation purposes only and is not under LTS (Long-Term Support).

## How to Run

### Browser (standalone)

Open the app directly in a browser with your MarketCheck API key:

```
https://apps.marketcheck.com/app/auction-lane-planner/?api_key=YOUR_API_KEY
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
<iframe src="https://apps.marketcheck.com/app/auction-lane-planner/?api_key=YOUR_API_KEY" width="100%" height="800" frameborder="0"></iframe>
```

## Limitations

- Demo mode shows mock data
- Requires MarketCheck API key for live data
- Browser-based — no server required for standalone use
- Data covers US market (95%+ of dealer inventory)

## Links

- [MarketCheck Developer Portal](https://developers.marketcheck.com)
- [API Documentation](https://apidocs.marketcheck.com)
- [Auction Lane Planner App](https://apps.marketcheck.com/app/auction-lane-planner/)
- [GitHub Repository](https://github.com/anthropics/marketcheck-mcp-apps)
