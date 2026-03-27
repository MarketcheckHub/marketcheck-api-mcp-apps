# Earnings Signal Dashboard ![Analyst](https://img.shields.io/badge/Analyst-8b5cf6?style=flat-square)

![Screenshot](../../../static/screenshots/earnings-signal-dashboard.png)

## Overview

Leading indicators for publicly traded automotive companies. Tracks inventory levels, pricing power, demand trends, and days-on-market as forward signals for OEM and dealer group earnings. Cross-references sold data for volume momentum.

## Who Is This For

Financial analysts covering automotive stocks

## MarketCheck API Endpoints Used

| Endpoint | Name | Docs |
|----------|------|------|
| `GET /v2/search/car/active` | Search Active Listings | [View docs](https://apidocs.marketcheck.com/#search-active) |
| `GET /api/v1/sold-vehicles/summary` | Sold Vehicle Summary | [View docs](https://apidocs.marketcheck.com/#sold-summary) |

## Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `tickers` | string | Yes | Auto industry ticker symbols |

## Derivative API Endpoint

**`POST https://apps.marketcheck.com/api/proxy/earnings-signal-dashboard`**

> This endpoint is provided for reference and experimentation purposes only and is not under LTS (Long-Term Support).

## How to Run

### Browser (standalone)

Open the app directly in a browser with your MarketCheck API key:

```
https://apps.marketcheck.com/app/earnings-signal-dashboard/?api_key=YOUR_API_KEY
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
<iframe src="https://apps.marketcheck.com/app/earnings-signal-dashboard/?api_key=YOUR_API_KEY" width="100%" height="800" frameborder="0"></iframe>
```

## Limitations

- Demo mode shows mock data
- Requires MarketCheck API key for live data
- Browser-based — no server required for standalone use
- Data covers US market (95%+ of dealer inventory)

## Links

- [MarketCheck Developer Portal](https://developers.marketcheck.com)
- [API Documentation](https://apidocs.marketcheck.com)
- [Earnings Signal Dashboard App](https://apps.marketcheck.com/app/earnings-signal-dashboard/)
- [GitHub Repository](https://github.com/anthropics/marketcheck-mcp-apps)
