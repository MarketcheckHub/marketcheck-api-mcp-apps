"""
MarketCheck AI Chat — Chainlit + Claude

A conversational automotive market intelligence app using Chainlit for the UI,
Anthropic Claude for reasoning, and MarketCheck API for real-time market data.

Run: chainlit run app.py -w
"""

import os
import json
import httpx
import chainlit as cl
from anthropic import Anthropic

MC_API_KEY = os.environ.get("MARKETCHECK_API_KEY", "")
MC_API_BASE = "https://api.marketcheck.com"
anthropic_client = Anthropic()

SYSTEM_PROMPT = """You are MarketCheck AI, an expert automotive market assistant powered by real-time data from the MarketCheck API — the largest automotive data platform covering 95%+ of US dealer inventory.

You have tools to search car listings, decode VINs, predict prices, analyze sold vehicles, check incentives, evaluate deals, and estimate trade-in values. Always use tools to back up claims with real data. Format prices as $XX,XXX and mileage with commas. Be concise but thorough."""

TOOLS = [
    {
        "name": "search_cars",
        "description": "Search active used car listings with filters for make, model, body type, price range, year, mileage, fuel type, and location.",
        "input_schema": {
            "type": "object",
            "properties": {
                "makes": {"type": "string", "description": "Comma-separated makes, e.g. 'Toyota,Honda'"},
                "body_types": {"type": "string", "description": "Body types, e.g. 'SUV,Sedan'"},
                "year_range": {"type": "string", "description": "Year range, e.g. '2020-2024'"},
                "price_range": {"type": "string", "description": "Price range, e.g. '15000-45000'"},
                "zip": {"type": "string", "description": "ZIP code for location"},
                "radius": {"type": "number", "description": "Search radius in miles"},
                "rows": {"type": "number", "description": "Number of results (default 12)"},
            },
        },
    },
    {
        "name": "decode_vin",
        "description": "Decode a VIN to get full vehicle specs: year, make, model, trim, engine, transmission, drivetrain, fuel type, MPG, MSRP.",
        "input_schema": {
            "type": "object",
            "properties": {"vin": {"type": "string", "description": "17-character VIN"}},
            "required": ["vin"],
        },
    },
    {
        "name": "predict_price",
        "description": "Predict fair market price for a vehicle using comparable sales data.",
        "input_schema": {
            "type": "object",
            "properties": {
                "vin": {"type": "string", "description": "17-character VIN"},
                "miles": {"type": "number", "description": "Current mileage"},
                "zip": {"type": "string", "description": "ZIP for regional pricing"},
                "dealer_type": {"type": "string", "description": "'franchise' for retail, 'independent' for wholesale"},
            },
            "required": ["vin"],
        },
    },
    {
        "name": "get_car_history",
        "description": "Get listing history for a vehicle by VIN — price changes and dealer transfers over time.",
        "input_schema": {
            "type": "object",
            "properties": {"vin": {"type": "string", "description": "17-character VIN"}},
            "required": ["vin"],
        },
    },
    {
        "name": "search_incentives",
        "description": "Search current OEM incentives/rebates by ZIP — cash back, APR deals, lease specials.",
        "input_schema": {
            "type": "object",
            "properties": {
                "oem": {"type": "string", "description": "Manufacturer, e.g. 'Toyota'"},
                "zip": {"type": "string", "description": "ZIP code"},
                "model": {"type": "string", "description": "Specific model"},
            },
            "required": ["oem", "zip"],
        },
    },
    {
        "name": "get_sold_summary",
        "description": "Aggregated sold vehicle market data — rankings by make, body_type, state. For market share and demand analysis.",
        "input_schema": {
            "type": "object",
            "properties": {
                "ranking_dimensions": {"type": "string", "description": "Grouping: make, model, body_type, state"},
                "ranking_measure": {"type": "string", "description": "Measures: sold_count, average_sale_price"},
                "ranking_order": {"type": "string", "description": "asc or desc"},
                "top_n": {"type": "number", "description": "Number of top results"},
                "state": {"type": "string", "description": "State abbreviation"},
                "inventory_type": {"type": "string", "description": "'Used' or 'New'"},
            },
        },
    },
]


async def mc_fetch(path: str, params: dict | None = None, no_v2_prefix: bool = False) -> dict:
    """Fetch from MarketCheck API."""
    base = "" if no_v2_prefix else "/v2"
    url = f"{MC_API_BASE}{base}{path}"
    query = {"api_key": MC_API_KEY}
    if params:
        query.update({k: str(v) for k, v in params.items() if v is not None and v != ""})
    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.get(url, params=query)
        resp.raise_for_status()
        return resp.json()


async def execute_tool(name: str, args: dict) -> dict:
    """Execute a MarketCheck tool and return the result."""
    if name == "search_cars":
        return await mc_fetch("/search/car/active", {
            "make": args.get("makes"),
            "body_type": args.get("body_types"),
            "year": args.get("year_range"),
            "price_range": args.get("price_range"),
            "zip": args.get("zip"),
            "radius": args.get("radius"),
            "rows": args.get("rows", 12),
            "car_type": "used",
            "stats": "price,miles",
            "facets": "make,model,body_type",
            "include_dealer_object": "true",
        })
    elif name == "decode_vin":
        return await mc_fetch(f"/decode/car/neovin/{args['vin']}/specs")
    elif name == "predict_price":
        return await mc_fetch("/predict/car/us/marketcheck_price/comparables", {
            "vin": args["vin"],
            "miles": args.get("miles"),
            "zip": args.get("zip"),
            "dealer_type": args.get("dealer_type", "franchise"),
        })
    elif name == "get_car_history":
        return await mc_fetch(f"/history/car/{args['vin']}", {"sort_order": "desc"})
    elif name == "search_incentives":
        return await mc_fetch("/incentives/by-zip", {
            "oem": args["oem"],
            "zip": args["zip"],
            "model": args.get("model"),
        })
    elif name == "get_sold_summary":
        return await mc_fetch("/api/v1/sold-vehicles/summary", args, no_v2_prefix=True)
    else:
        return {"error": f"Unknown tool: {name}"}


@cl.on_chat_start
async def start():
    cl.user_session.set("messages", [])


@cl.on_message
async def on_message(message: cl.Message):
    messages = cl.user_session.get("messages", [])
    messages.append({"role": "user", "content": message.content})

    # Run Claude with tool loop
    max_iterations = 5
    for _ in range(max_iterations):
        response = anthropic_client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=4096,
            system=SYSTEM_PROMPT,
            tools=TOOLS,
            messages=messages,
        )

        # Check if Claude wants to use tools
        tool_uses = [b for b in response.content if b.type == "tool_use"]

        if not tool_uses:
            # No tool calls — extract text and send
            text_parts = [b.text for b in response.content if b.type == "text"]
            reply = "\n".join(text_parts)
            messages.append({"role": "assistant", "content": response.content})
            cl.user_session.set("messages", messages)
            await cl.Message(content=reply).send()
            return

        # Execute tool calls
        messages.append({"role": "assistant", "content": response.content})
        tool_results = []

        for tool_use in tool_uses:
            # Show tool execution step in UI
            async with cl.Step(name=tool_use.name, type="tool") as step:
                step.input = json.dumps(tool_use.input, indent=2)
                try:
                    result = await execute_tool(tool_use.name, tool_use.input)
                    # Truncate large results for display
                    display_result = json.dumps(result, indent=2)
                    if len(display_result) > 3000:
                        display_result = display_result[:3000] + "\n..."
                    step.output = display_result
                    tool_results.append({
                        "type": "tool_result",
                        "tool_use_id": tool_use.id,
                        "content": json.dumps(result),
                    })
                except Exception as e:
                    step.output = f"Error: {str(e)}"
                    tool_results.append({
                        "type": "tool_result",
                        "tool_use_id": tool_use.id,
                        "content": json.dumps({"error": str(e)}),
                        "is_error": True,
                    })

        messages.append({"role": "user", "content": tool_results})

    # Safety: if we hit max iterations
    await cl.Message(content="I've reached the maximum number of tool calls for this query. Here's what I found so far.").send()
