# Brand Command Center ![Manufacturer](https://img.shields.io/badge/Manufacturer-ef4444?style=flat-square)

![Screenshot](../../../static/screenshots/brand-command-center.png)

## Overview

OEM competitive intelligence dashboard. Tracks your brand's market share, pricing power, inventory levels, and demand trends vs competitors. Segment-level analysis (SUV, sedan, truck, EV) with regional breakdowns.

## Who Is This For

OEM product planners, regional sales managers

## MarketCheck API Endpoints Used

| Endpoint | Name | Docs |
|----------|------|------|
| `GET /v2/search/car/active` | Search Active Listings | [View docs](https://apidocs.marketcheck.com/#search-active) |
| `GET /api/v1/sold-vehicles/summary` | Sold Vehicle Summary | [View docs](https://apidocs.marketcheck.com/#sold-summary) |

## Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `brand` | string | Yes | Your OEM brand |
| `competitors` | string | No | Competitor brands |

## Derivative API Endpoint

**`POST https://apps.marketcheck.com/api/proxy/brand-command-center`**

> This endpoint is provided for reference and experimentation purposes only and is not under LTS (Long-Term Support).

## How to Run

### Browser (standalone)

Open the app directly in a browser with your MarketCheck API key:

```
https://apps.marketcheck.com/app/brand-command-center/?api_key=YOUR_API_KEY
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
<iframe src="https://apps.marketcheck.com/app/brand-command-center/?api_key=YOUR_API_KEY" width="100%" height="800" frameborder="0"></iframe>
```

## Limitations

- Demo mode shows mock data
- Requires MarketCheck API key for live data
- Browser-based — no server required for standalone use
- Data covers US market (95%+ of dealer inventory)

## Links

- [MarketCheck Developer Portal](https://developers.marketcheck.com)
- [API Documentation](https://apidocs.marketcheck.com)
- [Brand Command Center App](https://apps.marketcheck.com/app/brand-command-center/)
- [GitHub Repository](https://github.com/anthropics/marketcheck-mcp-apps)
