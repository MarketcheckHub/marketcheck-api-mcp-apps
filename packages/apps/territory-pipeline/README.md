# Territory Pipeline ![Lender Sales](https://img.shields.io/badge/Lender%20Sales-14b8a6?style=flat-square)

![Screenshot](../../../static/screenshots/territory-pipeline.png)

## Overview

Sales prospecting tool for floor plan lenders. Analyzes dealer inventory in a territory to identify dealers with high inventory turnover, growing inventory, or signs of needing additional floor plan financing.

## Who Is This For

Floor plan lender sales representatives

## MarketCheck API Endpoints Used

| Endpoint | Name | Docs |
|----------|------|------|
| `GET /v2/search/car/active` | Search Active Listings | [View docs](https://apidocs.marketcheck.com/#search-active) |
| `GET /api/v1/sold-vehicles/summary` | Sold Vehicle Summary | [View docs](https://apidocs.marketcheck.com/#sold-summary) |

## Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `state` | string | Yes | Territory state |
| `zip` | string | No | Territory center ZIP |

## Derivative API Endpoint

**`POST https://apps.marketcheck.com/api/proxy/territory-pipeline`**

> This endpoint is provided for reference and experimentation purposes only and is not under LTS (Long-Term Support).

## How to Run

### Browser (standalone)

Open the app directly in a browser with your MarketCheck API key:

```
https://apps.marketcheck.com/app/territory-pipeline/?api_key=YOUR_API_KEY
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
<iframe src="https://apps.marketcheck.com/app/territory-pipeline/?api_key=YOUR_API_KEY" width="100%" height="800" frameborder="0"></iframe>
```

## Limitations

- Demo mode shows mock data
- Requires MarketCheck API key for live data
- Browser-based — no server required for standalone use
- Data covers US market (95%+ of dealer inventory)

## Links

- [MarketCheck Developer Portal](https://developers.marketcheck.com)
- [API Documentation](https://apidocs.marketcheck.com)
- [Territory Pipeline App](https://apps.marketcheck.com/app/territory-pipeline/)
- [GitHub Repository](https://github.com/anthropics/marketcheck-mcp-apps)
