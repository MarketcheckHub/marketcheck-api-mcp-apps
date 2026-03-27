# Market Anomaly Detector ![Cross-Segment](https://img.shields.io/badge/Cross--Segment-a78bfa?style=flat-square)

![Screenshot](../../../static/screenshots/market-anomaly-detector.png)

## Overview

Statistical outlier detection for car pricing. Searches active inventory for a make/model and flags vehicles priced significantly below or above market (configurable sensitivity in standard deviations). Verifies outliers against ML price predictions to confirm genuine deals vs data errors.

## Who Is This For

Anyone in the automotive industry

## MarketCheck API Endpoints Used

| Endpoint | Name | Docs |
|----------|------|------|
| `GET /v2/search/car/active` | Search Active Listings | [View docs](https://apidocs.marketcheck.com/#search-active) |
| `GET /v2/predict/car/us/marketcheck_price/comparables` | Price Prediction | [View docs](https://apidocs.marketcheck.com/#price-prediction) |

## Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `make` | string | Yes | Vehicle make |
| `model` | string | Yes | Vehicle model |
| `year` | string | No | Year or range |
| `state` | string | No | State filter |
| `sensitivity` | number | No | Std dev threshold (1-3, default 2) |

## Derivative API Endpoint

**`POST https://apps.marketcheck.com/api/proxy/detect-market-anomalies`**

> This is a composite endpoint that orchestrates multiple MarketCheck API calls into a single response. It is provided for reference and experimentation purposes only and is not under LTS (Long-Term Support).

## How to Run

### Browser (standalone)

Open the app directly in a browser with your MarketCheck API key:

```
https://apps.marketcheck.com/app/market-anomaly-detector/?api_key=YOUR_API_KEY
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
<iframe src="https://apps.marketcheck.com/app/market-anomaly-detector/?api_key=YOUR_API_KEY" width="100%" height="800" frameborder="0"></iframe>
```

## Limitations

- Demo mode shows mock data
- Requires MarketCheck API key for live data
- Browser-based — no server required for standalone use
- Data covers US market (95%+ of dealer inventory)

## Links

- [MarketCheck Developer Portal](https://developers.marketcheck.com)
- [API Documentation](https://apidocs.marketcheck.com)
- [Market Anomaly Detector App](https://apps.marketcheck.com/app/market-anomaly-detector/)
- [GitHub Repository](https://github.com/anthropics/marketcheck-mcp-apps)
