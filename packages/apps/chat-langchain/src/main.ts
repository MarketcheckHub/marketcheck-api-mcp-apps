/**
 * AI Agent Explorer — LangChain Demo
 * Browser-based chat calling Claude + MarketCheck APIs directly.
 */
import { createAppShell } from "@mcp-apps/shared/app-template";
import { sendMessage, createChatSettingsBar, getLlmKey, getMcApiKey } from "@mcp-apps/shared/chat-engine";
import type { ChatMessage, ChatCallbacks } from "@mcp-apps/shared/chat-engine";

const ACCENT = "#f59e0b";
const SDK_NAME = "LangChain";
const SUGGESTIONS = [
  "Research the EV market: search for Teslas, decode a popular VIN, and compare prices",
  "What are the top 10 selling brands? Then search for the #1 brand near 90210",
  "Decode VIN 1HGCV1F34LA000001, predict its price, and find similar cars nearby",
  "Analyze Toyota incentives near 60601 and compare to Honda",
  "Get the listing history for VIN 5YJSA1DG9DFP14705 and predict current value",
];

const messages: ChatMessage[] = [];
let chatArea: HTMLElement;
let inputEl: HTMLTextAreaElement;
let sendBtn: HTMLButtonElement;
let isLoading = false;

function init() {
  const { header, content } = createAppShell("AI Agent Explorer");
  header.appendChild(createChatSettingsBar());

  // SDK badge
  const badge = document.createElement("span");
  badge.style.cssText = `padding:3px 10px;border-radius:10px;font-size:10px;font-weight:700;background:${ACCENT}22;color:${ACCENT};border:1px solid ${ACCENT}33;margin-left:8px;`;
  badge.textContent = SDK_NAME;
  header.querySelector("h1")?.after(badge);

  content.style.cssText = "display:flex;flex-direction:column;height:calc(100vh - 52px);padding:0;";

  // Chat messages area
  chatArea = document.createElement("div");
  chatArea.style.cssText = "flex:1;overflow-y:auto;padding:16px 20px;";
  content.appendChild(chatArea);

  // Show welcome / suggestions if no keys
  renderWelcome();

  // Input bar
  const inputBar = document.createElement("div");
  inputBar.style.cssText = "padding:12px 20px;border-top:1px solid #334155;display:flex;gap:8px;background:#1e293b;";

  inputEl = document.createElement("textarea");
  inputEl.placeholder = "Ask about cars, prices, deals, market trends...";
  inputEl.rows = 1;
  inputEl.style.cssText = "flex:1;resize:none;padding:10px 14px;border-radius:10px;border:1px solid #334155;background:#0f172a;color:#e2e8f0;font-size:14px;font-family:inherit;outline:none;";
  inputEl.addEventListener("focus", () => { inputEl.style.borderColor = ACCENT; });
  inputEl.addEventListener("blur", () => { inputEl.style.borderColor = "#334155"; });
  inputEl.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  });

  sendBtn = document.createElement("button");
  sendBtn.textContent = "Send";
  sendBtn.style.cssText = `padding:10px 20px;border-radius:10px;border:none;background:${ACCENT};color:#fff;font-size:14px;font-weight:600;cursor:pointer;font-family:inherit;`;

  sendBtn.addEventListener("click", handleSend);

  inputBar.appendChild(inputEl);
  inputBar.appendChild(sendBtn);
  content.appendChild(inputBar);
}

function renderWelcome() {
  const isReady = !!(getLlmKey() && getMcApiKey());
  chatArea.innerHTML = "";

  const welcome = document.createElement("div");
  welcome.style.cssText = "text-align:center;padding:40px 20px;";
  welcome.innerHTML = `
    <div style="font-size:40px;margin-bottom:12px;">&#128663;</div>
    <h2 style="font-size:18px;font-weight:700;color:#f8fafc;margin-bottom:8px;">MarketCheck AI</h2>
    <p style="font-size:13px;color:#94a3b8;margin-bottom:24px;">
      ${isReady ? "Ask me anything about the US used car market." : "Set your API keys using the ⚙ button above to get started."}
    </p>
  `;

  if (isReady) {
    const grid = document.createElement("div");
    grid.style.cssText = "display:flex;flex-wrap:wrap;justify-content:center;gap:8px;max-width:600px;margin:0 auto;";
    for (const s of SUGGESTIONS) {
      const btn = document.createElement("button");
      btn.textContent = s;
      btn.style.cssText = `padding:8px 14px;border-radius:8px;border:1px solid #334155;background:#1e293b;color:#94a3b8;font-size:12px;cursor:pointer;text-align:left;font-family:inherit;transition:border-color 0.2s;`;
      btn.addEventListener("mouseenter", () => { btn.style.borderColor = ACCENT; btn.style.color = "#e2e8f0"; });
      btn.addEventListener("mouseleave", () => { btn.style.borderColor = "#334155"; btn.style.color = "#94a3b8"; });
      btn.addEventListener("click", () => { inputEl.value = s; handleSend(); });
      grid.appendChild(btn);
    }
    welcome.appendChild(grid);
  }

  chatArea.appendChild(welcome);
}

function appendMessage(role: "user" | "assistant", html: string) {
  const row = document.createElement("div");
  row.style.cssText = `display:flex;${role === "user" ? "justify-content:flex-end" : "justify-content:flex-start"};margin-bottom:12px;`;

  const bubble = document.createElement("div");
  bubble.style.cssText = `max-width:85%;border-radius:12px;padding:10px 14px;font-size:14px;line-height:1.6;word-break:break-word;${
    role === "user"
      ? `background:${ACCENT};color:#fff;`
      : "background:#1e293b;color:#e2e8f0;border:1px solid #334155;"
  }`;
  bubble.innerHTML = html;
  row.appendChild(bubble);
  chatArea.appendChild(row);
  chatArea.scrollTop = chatArea.scrollHeight;
  return bubble;
}

function appendToolChip(name: string, status: "running" | "done", detailHtml?: string) {
  const chip = document.createElement("div");
  chip.style.cssText = "margin:8px 0;padding:6px 12px;border-radius:8px;background:#0f172a;border:1px solid #334155;font-size:12px;";
  chip.innerHTML = `
    <span style="color:${status === "done" ? "#34d399" : "#fbbf24"};">${status === "done" ? "✓" : "⏳"}</span>
    <span style="color:#e2e8f0;font-weight:500;margin-left:4px;">${name}</span>
    ${detailHtml ? `<div style="margin-top:4px;color:#64748b;font-size:11px;max-height:120px;overflow:auto;">${detailHtml}</div>` : ""}
  `;
  return chip;
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function simpleMarkdown(text: string): string {
  return escapeHtml(text)
    .replace(/\*\*(.+?)\*\*/g, "<strong style='color:#f8fafc;'>$1</strong>")
    .replace(/`(.+?)`/g, "<code style='background:#334155;padding:1px 4px;border-radius:3px;font-size:12px;'>$1</code>")
    .replace(/\n/g, "<br>");
}

async function handleSend() {
  const text = inputEl.value.trim();
  if (!text || isLoading) return;

  // Clear welcome on first message
  if (messages.length === 0) chatArea.innerHTML = "";

  inputEl.value = "";
  isLoading = true;
  sendBtn.textContent = "...";
  sendBtn.style.opacity = "0.5";

  messages.push({ role: "user", content: text });
  appendMessage("user", escapeHtml(text));

  // Create assistant bubble
  const assistantBubble = appendMessage("assistant", "");
  let toolContainer = document.createElement("div");
  assistantBubble.insertBefore(toolContainer, assistantBubble.firstChild);
  let textContainer = document.createElement("div");
  assistantBubble.appendChild(textContainer);

  const callbacks: ChatCallbacks = {
    onToken: (token) => {
      textContainer.innerHTML = simpleMarkdown(textContainer.dataset.raw ? textContainer.dataset.raw + token : token);
      textContainer.dataset.raw = (textContainer.dataset.raw ?? "") + token;
      chatArea.scrollTop = chatArea.scrollHeight;
    },
    onToolStart: (name) => {
      const chip = appendToolChip(name, "running");
      chip.dataset.toolName = name;
      toolContainer.appendChild(chip);
      chatArea.scrollTop = chatArea.scrollHeight;
    },
    onToolEnd: (name, result) => {
      const chips = toolContainer.querySelectorAll("[data-tool-name]");
      for (const chip of chips) {
        if ((chip as HTMLElement).dataset.toolName === name) {
          const statusSpan = chip.querySelector("span");
          if (statusSpan) { statusSpan.textContent = "✓"; statusSpan.style.color = "#34d399"; }
          // Add brief result summary
          let summary = "";
          if (name === "search_cars" && result?.num_found != null) summary = `${result.num_found.toLocaleString()} vehicles found`;
          else if (name === "decode_vin" && result?.make) summary = `${result.year} ${result.make} ${result.model}`;
          else if (name === "predict_price" && result?.predicted_price) summary = `Predicted: $${Number(result.predicted_price).toLocaleString()}`;
          if (summary) {
            const s = document.createElement("div");
            s.style.cssText = "margin-top:2px;color:#34d399;font-size:11px;";
            s.textContent = summary;
            chip.appendChild(s);
          }
        }
      }
    },
    onDone: (fullText, toolCalls) => {
      messages.push({ role: "assistant", content: fullText, toolCalls: toolCalls ?? undefined });
      isLoading = false;
      sendBtn.textContent = "Send";
      sendBtn.style.opacity = "1";
    },
    onError: (error) => {
      textContainer.innerHTML = `<span style="color:#ef4444;">${escapeHtml(error)}</span>`;
      isLoading = false;
      sendBtn.textContent = "Send";
      sendBtn.style.opacity = "1";
    },
  };

  await sendMessage(messages.slice(0, -1).concat([{ role: "user", content: text }]), callbacks);
}

init();
