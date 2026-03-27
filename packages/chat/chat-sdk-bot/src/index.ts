/**
 * MarketCheck AI Bot — Chat SDK
 *
 * A single codebase that deploys to Slack, Discord, Telegram, and more.
 * Uses the Chat SDK (chat-sdk.dev) for multi-platform messaging.
 *
 * Setup:
 *   1. Set environment variables for each platform (SLACK_BOT_TOKEN, etc.)
 *   2. Set ANTHROPIC_API_KEY and MARKETCHECK_API_KEY
 *   3. Run: npm run dev
 *
 * The bot responds to:
 *   - Direct mentions (@MarketCheck)
 *   - Direct messages
 *   - Slash commands (/marketcheck)
 */

import { Chat } from "chat";
import { SlackAdapter } from "@chat-adapter/slack";
import { DiscordAdapter } from "@chat-adapter/discord";
import { TelegramAdapter } from "@chat-adapter/telegram";
import { MemoryState } from "@chat-state/memory";
import { generateResponse } from "./ai.js";

const chat = new Chat({
  adapters: [
    new SlackAdapter(),
    new DiscordAdapter(),
    new TelegramAdapter(),
  ],
  state: new MemoryState(),
});

// Handle mentions (@MarketCheck in Slack/Discord)
chat.on("mention", async ({ thread, text }) => {
  await thread.post("Thinking...");
  try {
    const reply = await generateResponse(text);
    await thread.post(reply);
  } catch (e: any) {
    await thread.post(`Sorry, I encountered an error: ${e.message}`);
  }
});

// Handle direct messages
chat.on("message", async ({ thread, text }) => {
  try {
    const reply = await generateResponse(text);
    await thread.post(reply);
  } catch (e: any) {
    await thread.post(`Sorry, I encountered an error: ${e.message}`);
  }
});

// Handle slash commands (/marketcheck <query>)
chat.on("slash_command", async ({ thread, text, command }) => {
  if (command === "/marketcheck" || command === "/mc") {
    if (!text.trim()) {
      await thread.post(
        "Usage: `/marketcheck <your question>`\n\n" +
        "Examples:\n" +
        "- `/marketcheck search Toyota RAV4 under $30K near 90210`\n" +
        "- `/marketcheck decode VIN 1HGCV1F34LA000001`\n" +
        "- `/marketcheck what are the top selling SUVs in California?`"
      );
      return;
    }
    await thread.post("Looking that up...");
    try {
      const reply = await generateResponse(text);
      await thread.post(reply);
    } catch (e: any) {
      await thread.post(`Error: ${e.message}`);
    }
  }
});

// Start the bot
const port = parseInt(process.env.PORT ?? "3013", 10);
chat.start({ port }).then(() => {
  console.log(`MarketCheck AI Bot running on port ${port}`);
  console.log("Listening for messages on: Slack, Discord, Telegram");
});
