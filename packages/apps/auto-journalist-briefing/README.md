# Auto Journalist Briefing ![Auto Media](https://img.shields.io/badge/Auto%20Media-d946ef?style=flat-square)

![Screenshot](../../../static/screenshots/auto-journalist-briefing.png)

## Overview

Executive market summary with quotable data points for automotive journalists. Rankings by make (volume & price), body type analysis, and regional price leaders. Pre-formatted for easy citation in articles and reports.

## Who Is This For

Automotive journalists and market reporters

## MarketCheck API Endpoints Used

| Endpoint | Name | Docs |
|----------|------|------|
| `GET /api/v1/sold-vehicles/summary` | Sold Vehicle Summary | [View docs](https://apidocs.marketcheck.com/#sold-summary) |

## Derivative API Endpoint

**`POST https://apps.marketcheck.com/api/proxy/generate-market-briefing`**

> This is a composite endpoint that orchestrates multiple MarketCheck API calls into a single response. It is provided for reference and experimentation purposes only and is not under LTS (Long-Term Support).

## How to Run

### Browser (standalone)

Open the app directly in a browser with your MarketCheck API key:

```
https://apps.marketcheck.com/app/auto-journalist-briefing/?api_key=YOUR_API_KEY
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
<iframe src="https://apps.marketcheck.com/app/auto-journalist-briefing/?api_key=YOUR_API_KEY" width="100%" height="800" frameborder="0"></iframe>
```

## Limitations

- Demo mode shows mock data
- Requires MarketCheck API key for live data
- Browser-based — no server required for standalone use
- Data covers US market (95%+ of dealer inventory)

## Links

- [MarketCheck Developer Portal](https://developers.marketcheck.com)
- [API Documentation](https://apidocs.marketcheck.com)
- [Auto Journalist Briefing App](https://apps.marketcheck.com/app/auto-journalist-briefing/)
- [GitHub Repository](https://github.com/anthropics/marketcheck-mcp-apps)
