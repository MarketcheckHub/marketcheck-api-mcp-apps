"use client";

import { useChat } from "ai/react";
import { useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";

const SUGGESTIONS = [
  "Search for used Honda Civic under $20K near Chicago (60601)",
  "Decode VIN 1HGCV1F34LA000001 and predict its market value",
  "What are the top 10 selling used car brands in California?",
  "Find current Hyundai incentives near ZIP 90210",
];

export default function AgentChatPage() {
  const { messages, input, handleInputChange, handleSubmit, isLoading, setInput } = useChat();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  return (
    <div className="flex flex-col h-screen" style={{ background: "var(--bg-primary)" }}>
      {/* Header */}
      <header className="flex items-center gap-3 px-6 py-3 border-b" style={{ borderColor: "var(--border)", background: "var(--bg-secondary)" }}>
        <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold" style={{ background: "var(--accent)", color: "#000" }}>
          AI
        </div>
        <div>
          <h1 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>MarketCheck Agent</h1>
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>LangGraph ReAct Agent + Claude</p>
        </div>
        <span className="ml-auto px-2 py-0.5 rounded text-xs font-medium" style={{ background: "#f59e0b22", color: "var(--accent)", border: "1px solid #f59e0b33" }}>
          LangChain
        </span>
      </header>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-4 py-6 space-y-4">
          {messages.length === 0 && (
            <div className="text-center py-16">
              <div className="text-4xl mb-4">{"\uD83E\uDD16"}</div>
              <h2 className="text-xl font-semibold mb-2" style={{ color: "var(--text-primary)" }}>MarketCheck Agent</h2>
              <p className="text-sm mb-2" style={{ color: "var(--text-secondary)" }}>
                An autonomous AI agent that reasons step-by-step using MarketCheck tools.
              </p>
              <p className="text-xs mb-8" style={{ color: "var(--text-muted)" }}>
                Watch the agent think, decide which tools to use, and synthesize results.
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => { setInput(s); setTimeout(() => document.querySelector("form")?.requestSubmit(), 50); }}
                    className="px-3 py-2 rounded-lg text-xs cursor-pointer transition-colors"
                    style={{ background: "var(--bg-tertiary)", color: "var(--text-secondary)", border: "1px solid var(--border)" }}
                    onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--accent)")}
                    onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--border)")}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg) => (
            <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              <div
                className="max-w-[85%] rounded-xl px-4 py-3 text-sm"
                style={{
                  background: msg.role === "user" ? "var(--accent)" : "var(--bg-secondary)",
                  color: msg.role === "user" ? "#000" : "var(--text-primary)",
                  border: msg.role === "user" ? "none" : "1px solid var(--border)",
                }}
              >
                <ReactMarkdown
                  components={{
                    strong: ({ children }) => <strong style={{ color: msg.role === "user" ? "#000" : "var(--accent)" }}>{children}</strong>,
                    code: ({ children, className }) => {
                      if (className) {
                        return <pre style={{ background: "var(--bg-tertiary)", padding: "0.75em", borderRadius: "8px", overflowX: "auto", fontSize: "0.85em" }}><code>{children}</code></pre>;
                      }
                      return <code style={{ background: "var(--bg-tertiary)", padding: "0.1em 0.3em", borderRadius: "4px", fontSize: "0.85em" }}>{children}</code>;
                    },
                  }}
                >
                  {msg.content}
                </ReactMarkdown>
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex justify-start">
              <div className="rounded-xl px-4 py-3" style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)" }}>
                <div className="flex items-center gap-2 text-xs" style={{ color: "var(--accent)" }}>
                  <span className="animate-spin">{"\u2699\uFE0F"}</span>
                  Agent reasoning...
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Input */}
      <div className="px-4 py-4 border-t" style={{ borderColor: "var(--border)", background: "var(--bg-secondary)" }}>
        <form onSubmit={handleSubmit} className="max-w-3xl mx-auto flex gap-2">
          <textarea
            value={input}
            onChange={handleInputChange}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSubmit(e as any); } }}
            placeholder="Ask the agent to research automotive market data..."
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
            style={{ background: "var(--accent)", color: "#000" }}
          >
            {isLoading ? "..." : "Send"}
          </button>
        </form>
      </div>
    </div>
  );
}
