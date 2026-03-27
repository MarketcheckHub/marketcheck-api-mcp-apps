# Auction Arbitrage Finder ![Auction House](https://img.shields.io/badge/Auction%20House-84cc16?style=flat-square)

![Screenshot](../../../static/screenshots/auction-arbitrage-finder.png)

## Overview

Identifies vehicles with the largest wholesale-to-retail spread. For each VIN, predicts both franchise (retail) and independent (wholesale) values to calculate potential arbitrage profit. Helps wholesalers and dealers find the most profitable auction purchases.

## Who Is This For

Auction operators, consignment managers

## MarketCheck API Endpoints Used

| Endpoint | Name | Docs |
|----------|------|------|
| `GET /v2/decode/car/neovin/{vin}/specs` | VIN Decode | [View docs](https://apidocs.marketcheck.com/#decode-vin) |
| `GET /v2/predict/car/us/marketcheck_price/comparables` | Price Prediction | [View docs](https://apidocs.marketcheck.com/#price-prediction) |

## Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `vins` | string | Yes | Comma-separated VINs |
| `zip` | string | Yes | Market ZIP |

## Derivative API Endpoint

**`POST https://apps.marketcheck.com/api/proxy/find-auction-arbitrage`**

> This is a composite endpoint that orchestrates multiple MarketCheck API calls into a single response. It is provided for reference and experimentation purposes only and is not under LTS (Long-Term Support).

## How to Run

### Browser (standalone)

Open the app directly in a browser with your MarketCheck API key:

```
https://apps.marketcheck.com/app/auction-arbitrage-finder/?api_key=YOUR_API_KEY
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
<iframe src="https://apps.marketcheck.com/app/auction-arbitrage-finder/?api_key=YOUR_API_KEY" width="100%" height="800" frameborder="0"></iframe>
```

## Limitations

- Demo mode shows mock data
- Requires MarketCheck API key for live data
- Browser-based — no server required for standalone use
- Data covers US market (95%+ of dealer inventory)

## Links

- [MarketCheck Developer Portal](https://developers.marketcheck.com)
- [API Documentation](https://apidocs.marketcheck.com)
- [Auction Arbitrage Finder App](https://apps.marketcheck.com/app/auction-arbitrage-finder/)
- [GitHub Repository](https://github.com/anthropics/marketcheck-mcp-apps)
