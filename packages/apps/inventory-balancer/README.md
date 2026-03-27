# Inventory Balancer ![Dealership Group](https://img.shields.io/badge/Dealership%20Group-f97316?style=flat-square)

![Screenshot](../../../static/screenshots/inventory-balancer.png)

## Overview

Identifies transfer opportunities across locations. Finds vehicles that are slow movers at one store but in high demand at another, recommending inter-location transfers for faster turns and better margins.

## Who Is This For

Multi-location dealer group operators and managers

## MarketCheck API Endpoints Used

| Endpoint | Name | Docs |
|----------|------|------|
| `GET /v2/search/car/active` | Search Active Listings | [View docs](https://apidocs.marketcheck.com/#search-active) |
| `GET /api/v1/sold-vehicles/summary` | Sold Vehicle Summary | [View docs](https://apidocs.marketcheck.com/#sold-summary) |

## Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `dealerIds` | string | Yes | Comma-separated dealer IDs |
| `state` | string | Yes | State for demand data |

## Derivative API Endpoint

**`POST https://apps.marketcheck.com/api/proxy/inventory-balancer`**

> This endpoint is provided for reference and experimentation purposes only and is not under LTS (Long-Term Support).

## How to Run

### Browser (standalone)

Open the app directly in a browser with your MarketCheck API key:

```
https://apps.marketcheck.com/app/inventory-balancer/?api_key=YOUR_API_KEY
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
<iframe src="https://apps.marketcheck.com/app/inventory-balancer/?api_key=YOUR_API_KEY" width="100%" height="800" frameborder="0"></iframe>
```

## Limitations

- Demo mode shows mock data
- Requires MarketCheck API key for live data
- Browser-based — no server required for standalone use
- Data covers US market (95%+ of dealer inventory)

## Links

- [MarketCheck Developer Portal](https://developers.marketcheck.com)
- [API Documentation](https://apidocs.marketcheck.com)
- [Inventory Balancer App](https://apps.marketcheck.com/app/inventory-balancer/)
- [GitHub Repository](https://github.com/anthropics/marketcheck-mcp-apps)
