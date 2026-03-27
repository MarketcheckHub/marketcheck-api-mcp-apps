# EV Market Monitor ![Cross-Segment](https://img.shields.io/badge/Cross--Segment-a78bfa?style=flat-square)

![Screenshot](../../../static/screenshots/ev-market-monitor.png)

## Overview

Tracks the EV vs ICE transition with real-time market data. Shows EV inventory levels, pricing trends, depreciation rates, adoption curves, and demand signals. Compares EV and ICE metrics across segments and regions.

## Who Is This For

Anyone in the automotive industry

## MarketCheck API Endpoints Used

| Endpoint | Name | Docs |
|----------|------|------|
| `GET /v2/search/car/active` | Search Active Listings | [View docs](https://apidocs.marketcheck.com/#search-active) |
| `GET /api/v1/sold-vehicles/summary` | Sold Vehicle Summary | [View docs](https://apidocs.marketcheck.com/#sold-summary) |

## Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `state` | string | No | State filter |

## Derivative API Endpoint

**`POST https://apps.marketcheck.com/api/proxy/ev-market-monitor`**

> This endpoint is provided for reference and experimentation purposes only and is not under LTS (Long-Term Support).

## How to Run

### Browser (standalone)

Open the app directly in a browser with your MarketCheck API key:

```
https://apps.marketcheck.com/app/ev-market-monitor/?api_key=YOUR_API_KEY
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
<iframe src="https://apps.marketcheck.com/app/ev-market-monitor/?api_key=YOUR_API_KEY" width="100%" height="800" frameborder="0"></iframe>
```

## Limitations

- Demo mode shows mock data
- Requires MarketCheck API key for live data
- Browser-based — no server required for standalone use
- Data covers US market (95%+ of dealer inventory)

## Links

- [MarketCheck Developer Portal](https://developers.marketcheck.com)
- [API Documentation](https://apidocs.marketcheck.com)
- [EV Market Monitor App](https://apps.marketcheck.com/app/ev-market-monitor/)
- [GitHub Repository](https://github.com/anthropics/marketcheck-mcp-apps)
