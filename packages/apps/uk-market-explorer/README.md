# UK Market Explorer ![Consumer (UK)](https://img.shields.io/badge/Consumer%20(UK)-10b981?style=flat-square)

![Screenshot](../../../static/screenshots/uk-market-explorer.png)

## Overview

Search the UK used car market with filters for make, model, year, price (GBP), mileage, and postal code. Shows active listings with dealer info and recent market comparisons.

## Who Is This For

UK car shoppers and buyers

## MarketCheck API Endpoints Used

| Endpoint | Name | Docs |
|----------|------|------|
| `GET /v2/search/car/uk/active` | UK Active Listings | [View docs](https://apidocs.marketcheck.com/#uk-search) |
| `GET /v2/search/car/uk/recents` | UK Recent Listings | [View docs](https://apidocs.marketcheck.com/#uk-recent) |

## Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `make` | string | No | Vehicle make |
| `model` | string | No | Vehicle model |
| `postal_code` | string | No | UK postal code |
| `radius` | number | No | Search radius |

## Derivative API Endpoint

**`POST https://apps.marketcheck.com/api/proxy/search-uk-cars`**

> This is a composite endpoint that orchestrates multiple MarketCheck API calls into a single response. It is provided for reference and experimentation purposes only and is not under LTS (Long-Term Support).

## How to Run

### Browser (standalone)

Open the app directly in a browser with your MarketCheck API key:

```
https://apps.marketcheck.com/app/uk-market-explorer/?api_key=YOUR_API_KEY
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
<iframe src="https://apps.marketcheck.com/app/uk-market-explorer/?api_key=YOUR_API_KEY" width="100%" height="800" frameborder="0"></iframe>
```

## Limitations

- Demo mode shows mock data
- Requires MarketCheck API key for live data
- Browser-based — no server required for standalone use
- Data covers UK market

## Links

- [MarketCheck Developer Portal](https://developers.marketcheck.com)
- [API Documentation](https://apidocs.marketcheck.com)
- [UK Market Explorer App](https://apps.marketcheck.com/app/uk-market-explorer/)
- [GitHub Repository](https://github.com/anthropics/marketcheck-mcp-apps)
