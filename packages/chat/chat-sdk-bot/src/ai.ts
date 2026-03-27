/**
 * Claude AI integration for the Chat SDK bot.
 * Handles tool-calling loop and returns final text response.
 */

import Anthropic from "@anthropic-ai/sdk";
import { executeTool } from "./tools.js";

const anthropic = new Anthropic();

const SYSTEM_PROMPT = `You are MarketCheck AI, an automotive market assistant for messaging platforms (Slack, Discord, Telegram).

You have tools to search car listings, decode VINs, predict prices, check incentives, and analyze market data. Always use tools for real data. Keep responses concise for chat — use bullet points and short paragraphs. Format prices as $XX,XXX.

When presenting car listings, show max 5 results with: Year Make Model | $Price | Miles mi | City, ST`;

const TOOLS: Anthropic.Tool[] = [
  {
    name: "search_cars",
    description: "Search active used car listings.",
    input_schema: {
      type: "object" as const,
      properties: {
        makes: { type: "string", description: "Comma-separated makes" },
        body_types: { type: "string", description: "Body types" },
        year_range: { type: "string", description: "e.g. '2020-2024'" },
        price_range: { type: "string", description: "e.g. '15000-45000'" },
        zip: { type: "string", description: "ZIP code" },
        radius: { type: "number", description: "Radius in miles" },
        rows: { type: "number", description: "Results count" },
      },
    },
  },
  {
    name: "decode_vin",
    description: "Decode a VIN to get vehicle specs.",
    input_schema: {
      type: "object" as const,
      properties: { vin: { type: "string", description: "17-char VIN" } },
      required: ["vin"],
    },
  },
  {
    name: "predict_price",
    description: "Predict fair market price for a vehicle.",
    input_schema: {
      type: "object" as const,
      properties: {
        vin: { type: "string" }, miles: { type: "number" },
        zip: { type: "string" }, dealer_type: { type: "string" },
      },
      required: ["vin"],
    },
  },
  {
    name: "get_car_history",
    description: "Get listing history for a vehicle by VIN.",
    input_schema: {
      type: "object" as const,
      properties: { vin: { type: "string" } },
      required: ["vin"],
    },
  },
  {
    name: "search_incentives",
    description: "Search OEM incentives by ZIP.",
    input_schema: {
      type: "object" as const,
      properties: {
        oem: { type: "string" }, zip: { type: "string" },
      },
      required: ["oem", "zip"],
    },
  },
  {
    name: "get_sold_summary",
    description: "Aggregated sold vehicle market data.",
    input_schema: {
      type: "object" as const,
      properties: {
        ranking_dimensions: { type: "string" },
        ranking_measure: { type: "string" },
        ranking_order: { type: "string" },
        top_n: { type: "number" },
        state: { type: "string" },
        inventory_type: { type: "string" },
      },
    },
  },
];

export async function generateResponse(userMessage: string): Promise<string> {
  const messages: Anthropic.MessageParam[] = [
    { role: "user", content: userMessage },
  ];

  for (let i = 0; i < 5; i++) {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2048,
      system: SYSTEM_PROMPT,
      tools: TOOLS,
      messages,
    });

    const toolUses = response.content.filter(
      (b): b is Anthropic.ToolUseBlock => b.type === "tool_use",
    );

    if (toolUses.length === 0) {
      return response.content
        .filter((b): b is Anthropic.TextBlock => b.type === "text")
        .map((b) => b.text)
        .join("\n");
    }

    messages.push({ role: "assistant", content: response.content });

    const toolResults: Anthropic.ToolResultBlockParam[] = await Promise.all(
      toolUses.map(async (tu) => {
        try {
          const result = await executeTool(tu.name, tu.input as Record<string, any>);
          return {
            type: "tool_result" as const,
            tool_use_id: tu.id,
            content: JSON.stringify(result),
          };
        } catch (e: any) {
          return {
            type: "tool_result" as const,
            tool_use_id: tu.id,
            content: JSON.stringify({ error: e.message }),
            is_error: true,
          };
        }
      }),
    );

    messages.push({ role: "user", content: toolResults });
  }

  return "I've reached my tool call limit for this query. Please try a simpler question.";
}
