# Insurance Premium Benchmarker ![Insurer](https://img.shields.io/badge/Insurer-ec4899?style=flat-square)

![Screenshot](../../../static/screenshots/insurance-premium-benchmarker.png)

## Overview

Market-level analysis of replacement costs and risk factors by body type, fuel type, and state. Helps underwriters set premiums based on actual market data: average replacement costs, volume patterns, and regional price variations.

## Who Is This For

Insurance adjusters, underwriters, and claims managers

## MarketCheck API Endpoints Used

| Endpoint | Name | Docs |
|----------|------|------|
| `GET /api/v1/sold-vehicles/summary` | Sold Vehicle Summary | [View docs](https://apidocs.marketcheck.com/#sold-summary) |

## Derivative API Endpoint

**`POST https://apps.marketcheck.com/api/proxy/benchmark-insurance-premiums`**

> This is a composite endpoint that orchestrates multiple MarketCheck API calls into a single response. It is provided for reference and experimentation purposes only and is not under LTS (Long-Term Support).

## How to Run

### Browser (standalone)

Open the app directly in a browser with your MarketCheck API key:

```
https://apps.marketcheck.com/app/insurance-premium-benchmarker/?api_key=YOUR_API_KEY
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
<iframe src="https://apps.marketcheck.com/app/insurance-premium-benchmarker/?api_key=YOUR_API_KEY" width="100%" height="800" frameborder="0"></iframe>
```

## Limitations

- Demo mode shows mock data
- Requires MarketCheck API key for live data
- Browser-based — no server required for standalone use
- Data covers US market (95%+ of dealer inventory)

## Links

- [MarketCheck Developer Portal](https://developers.marketcheck.com)
- [API Documentation](https://apidocs.marketcheck.com)
- [Insurance Premium Benchmarker App](https://apps.marketcheck.com/app/insurance-premium-benchmarker/)
- [GitHub Repository](https://github.com/anthropics/marketcheck-mcp-apps)
