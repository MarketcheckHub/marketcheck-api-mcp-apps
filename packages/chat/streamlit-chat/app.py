"""
MarketCheck AI Chat — Streamlit + Claude

Lightweight conversational automotive market intelligence.
Run: streamlit run app.py
"""

import os
import json
import streamlit as st
import httpx
from anthropic import Anthropic

MC_API_KEY = os.environ.get("MARKETCHECK_API_KEY", "")
MC_API_BASE = "https://api.marketcheck.com"

st.set_page_config(
    page_title="MarketCheck AI Chat — Streamlit",
    page_icon="\U0001F697",
    layout="wide",
)

# ── Styling ──────────────────────────────────────────────────────────────

st.markdown("""
<style>
[data-testid="stAppViewContainer"] { background: #060a10; }
[data-testid="stHeader"] { background: #060a10; }
[data-testid="stSidebar"] { background: #0f172a; }
.stChatMessage { background: #0f172a !important; border: 1px solid #334155; border-radius: 12px; }
.stMarkdown { color: #f8fafc; }
h1, h2, h3 { color: #f8fafc !important; }
p, li { color: #94a3b8 !important; }
</style>
""", unsafe_allow_html=True)

# ── Tool Definitions ─────────────────────────────────────────────────────

TOOLS = [
    {
        "name": "search_cars",
        "description": "Search active used car listings with filters.",
        "input_schema": {
            "type": "object",
            "properties": {
                "makes": {"type": "string", "description": "Comma-separated makes"},
                "body_types": {"type": "string", "description": "Body types"},
                "year_range": {"type": "string", "description": "Year range, e.g. '2020-2024'"},
                "price_range": {"type": "string", "description": "Price range, e.g. '15000-45000'"},
                "zip": {"type": "string", "description": "ZIP code"},
                "radius": {"type": "number", "description": "Radius in miles"},
                "rows": {"type": "number", "description": "Number of results"},
            },
        },
    },
    {
        "name": "decode_vin",
        "description": "Decode a VIN to get full vehicle specs.",
        "input_schema": {
            "type": "object",
            "properties": {"vin": {"type": "string", "description": "17-character VIN"}},
            "required": ["vin"],
        },
    },
    {
        "name": "predict_price",
        "description": "Predict fair market price for a vehicle.",
        "input_schema": {
            "type": "object",
            "properties": {
                "vin": {"type": "string", "description": "VIN"},
                "miles": {"type": "number", "description": "Mileage"},
                "zip": {"type": "string", "description": "ZIP"},
                "dealer_type": {"type": "string", "description": "'franchise' or 'independent'"},
            },
            "required": ["vin"],
        },
    },
    {
        "name": "get_car_history",
        "description": "Get listing history for a vehicle by VIN.",
        "input_schema": {
            "type": "object",
            "properties": {"vin": {"type": "string", "description": "VIN"}},
            "required": ["vin"],
        },
    },
    {
        "name": "search_incentives",
        "description": "Search current OEM incentives/rebates by ZIP.",
        "input_schema": {
            "type": "object",
            "properties": {
                "oem": {"type": "string", "description": "Manufacturer"},
                "zip": {"type": "string", "description": "ZIP code"},
            },
            "required": ["oem", "zip"],
        },
    },
    {
        "name": "get_sold_summary",
        "description": "Aggregated sold vehicle market data — rankings by make, body_type, state.",
        "input_schema": {
            "type": "object",
            "properties": {
                "ranking_dimensions": {"type": "string"},
                "ranking_measure": {"type": "string"},
                "ranking_order": {"type": "string"},
                "top_n": {"type": "number"},
                "state": {"type": "string"},
                "inventory_type": {"type": "string"},
            },
        },
    },
]

SYSTEM_PROMPT = """You are MarketCheck AI, an expert automotive market assistant powered by real-time data from the MarketCheck API covering 95%+ of US dealer inventory. Always use tools to back up claims with real data. Format prices as $XX,XXX. Be concise but thorough."""


# ── API Helpers ──────────────────────────────────────────────────────────

def mc_fetch(path: str, params: dict | None = None, no_v2_prefix: bool = False) -> dict:
    base = "" if no_v2_prefix else "/v2"
    url = f"{MC_API_BASE}{base}{path}"
    query = {"api_key": MC_API_KEY}
    if params:
        query.update({k: str(v) for k, v in params.items() if v is not None and v != ""})
    resp = httpx.get(url, params=query, timeout=30)
    resp.raise_for_status()
    return resp.json()


def execute_tool(name: str, args: dict) -> dict:
    if name == "search_cars":
        return mc_fetch("/search/car/active", {
            "make": args.get("makes"), "body_type": args.get("body_types"),
            "year": args.get("year_range"), "price_range": args.get("price_range"),
            "zip": args.get("zip"), "radius": args.get("radius"),
            "rows": args.get("rows", 12), "car_type": "used",
            "stats": "price,miles", "facets": "make,model,body_type",
            "include_dealer_object": "true",
        })
    elif name == "decode_vin":
        return mc_fetch(f"/decode/car/neovin/{args['vin']}/specs")
    elif name == "predict_price":
        return mc_fetch("/predict/car/us/marketcheck_price/comparables", {
            "vin": args["vin"], "miles": args.get("miles"),
            "zip": args.get("zip"), "dealer_type": args.get("dealer_type", "franchise"),
        })
    elif name == "get_car_history":
        return mc_fetch(f"/history/car/{args['vin']}", {"sort_order": "desc"})
    elif name == "search_incentives":
        return mc_fetch("/incentives/by-zip", {"oem": args["oem"], "zip": args["zip"]})
    elif name == "get_sold_summary":
        return mc_fetch("/api/v1/sold-vehicles/summary", args, no_v2_prefix=True)
    return {"error": f"Unknown tool: {name}"}


# ── Sidebar ──────────────────────────────────────────────────────────────

with st.sidebar:
    st.title("\U0001F697 MarketCheck AI")
    st.caption("Powered by Streamlit + Claude")
    st.divider()
    st.markdown("**Available tools:**")
    st.markdown("- \U0001F50D Search car listings")
    st.markdown("- \U0001F4C4 Decode VINs")
    st.markdown("- \U0001F4B0 Predict prices")
    st.markdown("- \U0001F4C8 Market summaries")
    st.markdown("- \U0001F381 OEM incentives")
    st.markdown("- \U0001F4DC Listing history")
    st.divider()
    st.markdown("**Try asking:**")
    st.markdown("_Search for used Toyota RAV4 under $30K near 90210_")
    st.markdown("_Decode VIN 1HGCV1F34LA000001_")
    st.markdown("_What are the top selling brands in CA?_")
    st.divider()
    st.caption("Built with Streamlit + Anthropic Claude + MarketCheck API")

# ── Chat Interface ───────────────────────────────────────────────────────

st.title("MarketCheck AI Chat")
st.caption("Real-time automotive market intelligence \u2014 Streamlit SDK Demo")

# Initialize session state
if "messages" not in st.session_state:
    st.session_state.messages = []
if "api_messages" not in st.session_state:
    st.session_state.api_messages = []

# Display chat history
for msg in st.session_state.messages:
    with st.chat_message(msg["role"]):
        st.markdown(msg["content"])

# Handle user input
if prompt := st.chat_input("Ask about cars, prices, deals, market trends..."):
    # Display user message
    st.session_state.messages.append({"role": "user", "content": prompt})
    with st.chat_message("user"):
        st.markdown(prompt)

    # Add to API messages
    st.session_state.api_messages.append({"role": "user", "content": prompt})

    # Run Claude with tool loop
    client = Anthropic()
    with st.chat_message("assistant"):
        with st.spinner("Thinking..."):
            for _ in range(5):  # max iterations
                response = client.messages.create(
                    model="claude-sonnet-4-20250514",
                    max_tokens=4096,
                    system=SYSTEM_PROMPT,
                    tools=TOOLS,
                    messages=st.session_state.api_messages,
                )

                tool_uses = [b for b in response.content if b.type == "tool_use"]

                if not tool_uses:
                    # Final text response
                    text = "\n".join(b.text for b in response.content if b.type == "text")
                    st.markdown(text)
                    st.session_state.messages.append({"role": "assistant", "content": text})
                    st.session_state.api_messages.append({"role": "assistant", "content": response.content})
                    break

                # Execute tools
                st.session_state.api_messages.append({"role": "assistant", "content": response.content})
                tool_results = []

                for tool_use in tool_uses:
                    with st.expander(f"\U0001F527 {tool_use.name}", expanded=False):
                        st.json(tool_use.input)
                        try:
                            result = execute_tool(tool_use.name, tool_use.input)
                            # Show summary
                            if tool_use.name == "search_cars" and "num_found" in result:
                                st.success(f"Found {result['num_found']:,} vehicles")
                            elif tool_use.name == "decode_vin" and "make" in result:
                                st.success(f"{result.get('year')} {result.get('make')} {result.get('model')}")
                            elif tool_use.name == "predict_price" and "predicted_price" in result:
                                st.success(f"Predicted: ${result['predicted_price']:,.0f}")
                            tool_results.append({
                                "type": "tool_result",
                                "tool_use_id": tool_use.id,
                                "content": json.dumps(result),
                            })
                        except Exception as e:
                            st.error(f"Error: {e}")
                            tool_results.append({
                                "type": "tool_result",
                                "tool_use_id": tool_use.id,
                                "content": json.dumps({"error": str(e)}),
                                "is_error": True,
                            })

                st.session_state.api_messages.append({"role": "user", "content": tool_results})
