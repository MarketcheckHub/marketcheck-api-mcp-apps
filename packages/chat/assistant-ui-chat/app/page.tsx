"use client";

import { useChat } from "ai/react";
import { useRef, useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";

const SUGGESTIONS = [
  { text: "Find me a used Tesla Model 3 under $35K near Los Angeles", icon: "\u26A1" },
  { text: "Decode VIN 5YJSA1DG9DFP14705 and predict its price", icon: "\uD83D\uDD0D" },
  { text: "What are the top selling SUVs in Texas?", icon: "\uD83D\uDCCA" },
  { text: "Check Ford incentives near ZIP 30301", icon: "\uD83C\uDF81" },
  { text: "Is this a good deal? VIN 1HGCV1F34LA000001 listed at $22,000", icon: "\u2705" },
  { text: "Estimate trade-in value: VIN WBA7E2C51JG123456 with 45K miles near 90210", icon: "\uD83D\uDCB0" },
];

export default function ChatPage() {
  const { messages, input, handleInputChange, handleSubmit, isLoading, setInput } = useChat();
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [expandedTools, setExpandedTools] = useState<Record<string, boolean>>({});

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const toggleTool = (key: string) =>
    setExpandedTools((prev) => ({ ...prev, [key]: !prev[key] }));

  const handleSuggestion = (text: string) => {
    setInput(text);
    setTimeout(() => document.querySelector("form")?.requestSubmit(), 50);
  };

  const formatToolResult = (toolName: string, result: any) => {
    if (!result) return null;

    // Car search results
    if (toolName === "search-cars" && result.listings) {
      return (
        <div className="space-y-2">
          <div className="text-xs font-medium" style={{ color: "var(--accent)" }}>
            {result.num_found?.toLocaleString() ?? 0} vehicles found
          </div>
          {result.stats?.price && (
            <div className="flex gap-4 text-xs" style={{ color: "var(--text-secondary)" }}>
              <span>Avg: ${Math.round(result.stats.price.mean).toLocaleString()}</span>
              <span>Min: ${Math.round(result.stats.price.min).toLocaleString()}</span>
              <span>Max: ${Math.round(result.stats.price.max).toLocaleString()}</span>
            </div>
          )}
          <div className="grid gap-2" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))" }}>
            {result.listings.slice(0, 6).map((car: any, i: number) => (
              <div
                key={i}
                className="rounded-lg p-3"
                style={{ background: "var(--bg-primary)", border: "1px solid var(--border)" }}
              >
                <div className="flex justify-between items-start mb-1">
                  <div className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                    {car.year} {car.make} {car.model}
                  </div>
                  <div className="text-sm font-bold" style={{ color: "var(--accent)" }}>
                    ${(car.price ?? 0).toLocaleString()}
                  </div>
                </div>
                <div className="text-xs" style={{ color: "var(--text-muted)" }}>
                  {car.trim} &middot; {(car.miles ?? 0).toLocaleString()} mi &middot; {car.exterior_color}
                </div>
                <div className="text-xs mt-1" style={{ color: "var(--text-secondary)" }}>
                  {car.dealer?.name ?? ""} &middot; {car.dealer?.city ?? ""}, {car.dealer?.state ?? ""}
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    }

    // VIN decode
    if (toolName === "decode-vin" && (result.make || result.year)) {
      return (
        <div className="rounded-lg p-3" style={{ background: "var(--bg-primary)", border: "1px solid var(--border)" }}>
          <div className="text-sm font-semibold mb-2" style={{ color: "var(--text-primary)" }}>
            {result.year} {result.make} {result.model} {result.trim ?? ""}
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
            {[
              ["Body", result.body_type],
              ["Engine", result.engine],
              ["Transmission", result.transmission],
              ["Drivetrain", result.drivetrain],
              ["Fuel", result.fuel_type],
              ["MPG", result.city_mpg && result.highway_mpg ? `${result.city_mpg}/${result.highway_mpg}` : null],
              ["MSRP", result.msrp ? `$${Number(result.msrp).toLocaleString()}` : null],
            ]
              .filter(([, v]) => v)
              .map(([label, value]) => (
                <div key={label as string}>
                  <span style={{ color: "var(--text-muted)" }}>{label}: </span>
                  <span style={{ color: "var(--text-secondary)" }}>{value}</span>
                </div>
              ))}
          </div>
        </div>
      );
    }

    // Price prediction
    if (toolName === "predict-price" && result.predicted_price) {
      return (
        <div className="rounded-lg p-3" style={{ background: "var(--bg-primary)", border: "1px solid var(--border)" }}>
          <div className="text-lg font-bold mb-1" style={{ color: "var(--accent)" }}>
            ${Number(result.predicted_price).toLocaleString()}
          </div>
          {result.price_range && (
            <div className="text-xs" style={{ color: "var(--text-secondary)" }}>
              Range: ${Number(result.price_range.low).toLocaleString()} &mdash; $
              {Number(result.price_range.high).toLocaleString()}
            </div>
          )}
          {result.confidence_score && (
            <div className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
              Confidence: {(result.confidence_score * 100).toFixed(0)}%
            </div>
          )}
        </div>
      );
    }

    return null;
  };

  return (
    <div className="flex flex-col h-screen" style={{ background: "var(--bg-primary)" }}>
      {/* Header */}
      <header
        className="flex items-center gap-3 px-6 py-3 border-b"
        style={{ borderColor: "var(--border)", background: "var(--bg-secondary)" }}
      >
        <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold" style={{ background: "var(--accent)", color: "#fff" }}>
          MC
        </div>
        <div>
          <h1 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>MarketCheck Chat</h1>
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>Powered by assistant-ui + Claude</p>
        </div>
        <span className="ml-auto px-2 py-0.5 rounded text-xs font-medium" style={{ background: "#10b98122", color: "var(--accent)", border: "1px solid #10b98133" }}>
          assistant-ui
        </span>
      </header>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
          {messages.length === 0 && (
            <div className="py-12">
              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold mb-2" style={{ color: "var(--text-primary)" }}>
                  MarketCheck AI
                </h2>
                <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                  Real-time automotive market intelligence at your fingertips
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-w-3xl mx-auto">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s.text}
                    onClick={() => handleSuggestion(s.text)}
                    className="text-left rounded-xl p-4 transition-all cursor-pointer"
                    style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)" }}
                    onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--accent)"; e.currentTarget.style.transform = "translateY(-1px)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.transform = "translateY(0)"; }}
                  >
                    <span className="text-lg">{s.icon}</span>
                    <p className="text-xs mt-2" style={{ color: "var(--text-secondary)" }}>{s.text}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg) => {
            const isUser = msg.role === "user";
            return (
              <div key={msg.id} className={`flex gap-3 ${isUser ? "flex-row-reverse" : ""}`}>
                {/* Avatar */}
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-1"
                  style={{
                    background: isUser ? "var(--bg-tertiary)" : "var(--accent)",
                    color: isUser ? "var(--text-secondary)" : "#fff",
                  }}
                >
                  {isUser ? "U" : "AI"}
                </div>

                {/* Content */}
                <div className={`flex-1 ${isUser ? "text-right" : ""}`} style={{ maxWidth: "85%" }}>
                  {msg.parts?.map((part, i) => {
                    if (part.type === "tool-invocation") {
                      const inv = part.toolInvocation;
                      const key = `${msg.id}-${i}`;
                      const isOpen = expandedTools[key];
                      const richResult = inv.state === "result" ? formatToolResult(inv.toolName, inv.result) : null;

                      return (
                        <div key={i} className="my-2 rounded-xl overflow-hidden" style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)" }}>
                          <button
                            onClick={() => toggleTool(key)}
                            className="w-full flex items-center gap-2 px-4 py-2 text-xs cursor-pointer"
                          >
                            <span style={{ color: inv.state === "result" ? "var(--success)" : "var(--warning)" }}>
                              {inv.state === "result" ? "\u2713" : "\u23F3"}
                            </span>
                            <span className="font-medium" style={{ color: "var(--text-primary)" }}>{inv.toolName}</span>
                            <span className="ml-auto" style={{ color: "var(--text-muted)" }}>{isOpen ? "\u25B2" : "\u25BC"}</span>
                          </button>
                          {/* Rich tool result card */}
                          {inv.state === "result" && richResult && (
                            <div className="px-4 pb-3">{richResult}</div>
                          )}
                          {/* Raw data (expandable) */}
                          {isOpen && (
                            <div className="px-4 pb-3 text-xs" style={{ color: "var(--text-muted)" }}>
                              <div className="mb-1">Args: <code>{JSON.stringify(inv.args)}</code></div>
                              {inv.state === "result" && (
                                <pre className="overflow-x-auto max-h-40 mt-1">
                                  {JSON.stringify(inv.result, null, 2).slice(0, 2000)}
                                </pre>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    }
                    if (part.type === "text" && part.text) {
                      return (
                        <div
                          key={i}
                          className={`inline-block rounded-xl px-4 py-3 text-sm ${isUser ? "text-left" : ""}`}
                          style={{
                            background: isUser ? "var(--accent)" : "transparent",
                            color: isUser ? "#fff" : "var(--text-primary)",
                          }}
                        >
                          <div className="chat-markdown">
                            <ReactMarkdown>{part.text}</ReactMarkdown>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  })}
                  {!msg.parts?.length && msg.content && (
                    <div
                      className={`inline-block rounded-xl px-4 py-3 text-sm ${isUser ? "text-left" : ""}`}
                      style={{
                        background: isUser ? "var(--accent)" : "transparent",
                        color: isUser ? "#fff" : "var(--text-primary)",
                      }}
                    >
                      <ReactMarkdown>{msg.content}</ReactMarkdown>
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {isLoading && messages[messages.length - 1]?.role === "user" && (
            <div className="flex gap-3">
              <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold" style={{ background: "var(--accent)", color: "#fff" }}>AI</div>
              <div className="flex gap-1 pt-3">
                <div className="w-2 h-2 rounded-full animate-bounce" style={{ background: "var(--accent)", animationDelay: "0ms" }} />
                <div className="w-2 h-2 rounded-full animate-bounce" style={{ background: "var(--accent)", animationDelay: "150ms" }} />
                <div className="w-2 h-2 rounded-full animate-bounce" style={{ background: "var(--accent)", animationDelay: "300ms" }} />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Input */}
      <div className="px-4 py-4 border-t" style={{ borderColor: "var(--border)", background: "var(--bg-secondary)" }}>
        <form onSubmit={handleSubmit} className="max-w-4xl mx-auto flex gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={handleInputChange}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSubmit(e as any); } }}
            placeholder="Ask about cars, prices, market trends..."
            rows={1}
            className="flex-1 resize-none rounded-xl px-4 py-3 text-sm outline-none"
            style={{ background: "var(--bg-tertiary)", color: "var(--text-primary)", border: "1px solid var(--border)" }}
            onFocus={(e) => (e.target.style.borderColor = "var(--accent)")}
            onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="rounded-xl px-6 py-3 text-sm font-medium disabled:opacity-40"
            style={{ background: "var(--accent)", color: "#fff" }}
          >
            {isLoading ? "..." : "Send"}
          </button>
        </form>
      </div>

      <style jsx global>{`
        .chat-markdown h1, .chat-markdown h2, .chat-markdown h3 { font-weight: 700; margin: 0.75em 0 0.25em; }
        .chat-markdown h1 { font-size: 1.125rem; }
        .chat-markdown h2 { font-size: 1rem; }
        .chat-markdown p { margin-bottom: 0.5em; line-height: 1.6; }
        .chat-markdown ul, .chat-markdown ol { margin-left: 1.5em; margin-bottom: 0.5em; }
        .chat-markdown li { margin-bottom: 0.25em; }
        .chat-markdown code { background: var(--bg-tertiary); padding: 0.1em 0.3em; border-radius: 4px; font-size: 0.85em; }
        .chat-markdown pre { background: var(--bg-tertiary); padding: 0.75em; border-radius: 8px; overflow-x: auto; }
        .chat-markdown pre code { background: none; padding: 0; }
        .chat-markdown table { width: 100%; border-collapse: collapse; font-size: 0.85rem; }
        .chat-markdown th, .chat-markdown td { padding: 0.4em 0.6em; border: 1px solid var(--border); text-align: left; }
        .chat-markdown th { background: var(--bg-tertiary); font-weight: 600; }
        .chat-markdown strong { color: var(--text-primary); }
      `}</style>
    </div>
  );
}
