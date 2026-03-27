# Stocking Intelligence ![Dealer](https://img.shields.io/badge/Dealer-f59e0b?style=flat-square)

![Screenshot](../../../static/screenshots/stocking-intelligence.png)

## Overview

Demand heatmap showing what's selling in your market by make/model and body type. Includes buy/avoid recommendations, demand-to-supply ratios, average days on market, and average sale prices. Filter by state for regional stocking guidance.

## Who Is This For

Used car dealers, inventory managers, and pricing analysts

## MarketCheck API Endpoints Used

| Endpoint | Name | Docs |
|----------|------|------|
| `GET /api/v1/sold-vehicles/summary` | Sold Vehicle Summary | [View docs](https://apidocs.marketcheck.com/#sold-summary) |

## Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `state` | string | Yes | US state abbreviation |

## Derivative API Endpoint

**`POST https://apps.marketcheck.com/api/proxy/stocking-intelligence`**

> This is a composite endpoint that orchestrates multiple MarketCheck API calls into a single response. It is provided for reference and experimentation purposes only and is not under LTS (Long-Term Support).

## How to Run

### Browser (standalone)

Open the app directly in a browser with your MarketCheck API key:

```
https://apps.marketcheck.com/app/stocking-intelligence/?api_key=YOUR_API_KEY
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
<iframe src="https://apps.marketcheck.com/app/stocking-intelligence/?api_key=YOUR_API_KEY" width="100%" height="800" frameborder="0"></iframe>
```

## Limitations

- Demo mode shows mock data
- Requires MarketCheck API key for live data
- Browser-based — no server required for standalone use
- Data covers US market (95%+ of dealer inventory)

## Links

- [MarketCheck Developer Portal](https://developers.marketcheck.com)
- [API Documentation](https://apidocs.marketcheck.com)
- [Stocking Intelligence App](https://apps.marketcheck.com/app/stocking-intelligence/)
- [GitHub Repository](https://github.com/anthropics/marketcheck-mcp-apps)
