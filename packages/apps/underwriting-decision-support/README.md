# Underwriting Decision Support ![Lender](https://img.shields.io/badge/Lender-06b6d4?style=flat-square)

![Screenshot](../../../static/screenshots/underwriting-decision-support.png)

## Overview

Comprehensive collateral assessment for auto loan underwriting. Provides retail and wholesale valuations, listing history for depreciation trajectory, and recent sold comps. Calculates LTV at origination and forecasts collateral erosion over the loan term.

## Who Is This For

Auto lenders, underwriters, and portfolio risk managers

## MarketCheck API Endpoints Used

| Endpoint | Name | Docs |
|----------|------|------|
| `GET /v2/decode/car/neovin/{vin}/specs` | VIN Decode | [View docs](https://apidocs.marketcheck.com/#decode-vin) |
| `GET /v2/predict/car/us/marketcheck_price/comparables` | Price Prediction | [View docs](https://apidocs.marketcheck.com/#price-prediction) |
| `GET /v2/history/car/{vin}` | Car History | [View docs](https://apidocs.marketcheck.com/#car-history) |
| `GET /v2/search/car/recents` | Search Recent/Sold | [View docs](https://apidocs.marketcheck.com/#search-recent) |

## Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `vin` | string | Yes | 17-character VIN |
| `miles` | number | No | Current mileage |
| `zip` | string | No | Borrower ZIP |

## Derivative API Endpoint

**`POST https://apps.marketcheck.com/api/proxy/evaluate-loan-application`**

> This is a composite endpoint that orchestrates multiple MarketCheck API calls into a single response. It is provided for reference and experimentation purposes only and is not under LTS (Long-Term Support).

## How to Run

### Browser (standalone)

Open the app directly in a browser with your MarketCheck API key:

```
https://apps.marketcheck.com/app/underwriting-decision-support/?api_key=YOUR_API_KEY
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
<iframe src="https://apps.marketcheck.com/app/underwriting-decision-support/?api_key=YOUR_API_KEY" width="100%" height="800" frameborder="0"></iframe>
```

## Limitations

- Demo mode shows mock data
- Requires MarketCheck API key for live data
- Browser-based — no server required for standalone use
- Data covers US market (95%+ of dealer inventory)

## Links

- [MarketCheck Developer Portal](https://developers.marketcheck.com)
- [API Documentation](https://apidocs.marketcheck.com)
- [Underwriting Decision Support App](https://apps.marketcheck.com/app/underwriting-decision-support/)
- [GitHub Repository](https://github.com/anthropics/marketcheck-mcp-apps)
