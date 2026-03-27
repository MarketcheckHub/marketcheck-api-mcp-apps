# Depreciation Analyzer ![Appraiser](https://img.shields.io/badge/Appraiser-3b82f6?style=flat-square)

![Screenshot](../../../static/screenshots/depreciation-analyzer.png)

## Overview

Visualizes depreciation curves by tracking price trends for a make/model over multiple model years. Shows MSRP-to-market-price ratios, annual depreciation rates, and value retention rankings across body types and segments.

## Who Is This For

Professional vehicle appraisers, valuation specialists

## MarketCheck API Endpoints Used

| Endpoint | Name | Docs |
|----------|------|------|
| `GET /api/v1/sold-vehicles/summary` | Sold Vehicle Summary | [View docs](https://apidocs.marketcheck.com/#sold-summary) |
| `GET /v2/search/car/active` | Search Active Listings | [View docs](https://apidocs.marketcheck.com/#search-active) |

## Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `make` | string | Yes | Vehicle make |
| `model` | string | No | Vehicle model |

## Derivative API Endpoint

**`POST https://apps.marketcheck.com/api/proxy/depreciation-analyzer`**

> This endpoint is provided for reference and experimentation purposes only and is not under LTS (Long-Term Support).

## How to Run

### Browser (standalone)

Open the app directly in a browser with your MarketCheck API key:

```
https://apps.marketcheck.com/app/depreciation-analyzer/?api_key=YOUR_API_KEY
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
<iframe src="https://apps.marketcheck.com/app/depreciation-analyzer/?api_key=YOUR_API_KEY" width="100%" height="800" frameborder="0"></iframe>
```

## Limitations

- Demo mode shows mock data
- Requires MarketCheck API key for live data
- Browser-based — no server required for standalone use
- Data covers US market (95%+ of dealer inventory)

## Links

- [MarketCheck Developer Portal](https://developers.marketcheck.com)
- [API Documentation](https://apidocs.marketcheck.com)
- [Depreciation Analyzer App](https://apps.marketcheck.com/app/depreciation-analyzer/)
- [GitHub Repository](https://github.com/anthropics/marketcheck-mcp-apps)
