"use client";

import { useChat } from "ai/react";
import { useRef, useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";

const SUGGESTIONS = [
  "Search for used Toyota RAV4 under $30,000 near 90210",
  "Decode VIN 1HGCV1F34LA000001 and tell me what it is",
  "What are the top selling used car brands in California?",
  "Find current Toyota incentives near ZIP 60601",
  "What's the market trend for electric vehicles?",
];

export default function ChatPage() {
  const { messages, input, handleInputChange, handleSubmit, isLoading, setInput } = useChat();
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [showToolDetails, setShowToolDetails] = useState<Record<string, boolean>>({});

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const toggleToolDetails = (id: string) => {
    setShowToolDetails((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleSuggestion = (text: string) => {
    setInput(text);
    setTimeout(() => {
      const form = document.querySelector("form");
      form?.requestSubmit();
    }, 50);
  };

  return (
    <div className="flex flex-col h-screen" style={{ background: "var(--bg-primary)" }}>
      {/* Header */}
      <header
        className="flex items-center gap-3 px-6 py-4 border-b"
        style={{ borderColor: "var(--border)", background: "var(--bg-secondary)" }}
      >
        <div className="flex items-center gap-2">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold"
            style={{ background: "var(--accent)", color: "#fff" }}
          >
            MC
          </div>
          <div>
            <h1 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
              MarketCheck AI Chat
            </h1>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>
              Powered by Vercel AI SDK + Claude
            </p>
          </div>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <span
            className="px-2 py-0.5 rounded text-xs font-medium"
            style={{ background: "#3b82f622", color: "var(--accent)", border: "1px solid #3b82f633" }}
          >
            Vercel AI SDK
          </span>
        </div>
      </header>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-6">
        <div className="max-w-3xl mx-auto space-y-4">
          {messages.length === 0 && (
            <div className="text-center py-16">
              <div className="text-4xl mb-4">&#128663;</div>
              <h2 className="text-xl font-semibold mb-2" style={{ color: "var(--text-primary)" }}>
                MarketCheck AI
              </h2>
              <p className="text-sm mb-8" style={{ color: "var(--text-secondary)" }}>
                Ask me anything about the US used car market. I have real-time access to 95%+ of
                dealer inventory.
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => handleSuggestion(s)}
                    className="px-3 py-2 rounded-lg text-xs transition-colors cursor-pointer"
                    style={{
                      background: "var(--bg-tertiary)",
                      color: "var(--text-secondary)",
                      border: "1px solid var(--border)",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = "var(--accent)";
                      e.currentTarget.style.color = "var(--text-primary)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = "var(--border)";
                      e.currentTarget.style.color = "var(--text-secondary)";
                    }}
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
                className="max-w-[85%] rounded-xl px-4 py-3"
                style={{
                  background: msg.role === "user" ? "var(--accent)" : "var(--bg-secondary)",
                  color: msg.role === "user" ? "#fff" : "var(--text-primary)",
                  border: msg.role === "user" ? "none" : "1px solid var(--border)",
                }}
              >
                {/* Tool invocations */}
                {msg.parts?.map((part, i) => {
                  if (part.type === "tool-invocation") {
                    const inv = part.toolInvocation;
                    const detailKey = `${msg.id}-${i}`;
                    const isOpen = showToolDetails[detailKey];
                    return (
                      <div
                        key={i}
                        className="my-2 rounded-lg text-xs"
                        style={{ background: "var(--bg-tertiary)", border: "1px solid var(--border)" }}
                      >
                        <button
                          onClick={() => toggleToolDetails(detailKey)}
                          className="w-full flex items-center gap-2 px-3 py-2 cursor-pointer"
                          style={{ color: "var(--text-secondary)" }}
                        >
                          <span style={{ color: inv.state === "result" ? "var(--success)" : "var(--warning)" }}>
                            {inv.state === "result" ? "\u2713" : "\u23F3"}
                          </span>
                          <span className="font-medium">{inv.toolName}</span>
                          <span className="ml-auto text-xs" style={{ color: "var(--text-muted)" }}>
                            {isOpen ? "\u25B2" : "\u25BC"}
                          </span>
                        </button>
                        {isOpen && (
                          <div className="px-3 pb-2 space-y-1">
                            <div>
                              <span style={{ color: "var(--text-muted)" }}>Args: </span>
                              <code className="text-xs break-all">{JSON.stringify(inv.args, null, 2)}</code>
                            </div>
                            {inv.state === "result" && (
                              <div>
                                <span style={{ color: "var(--text-muted)" }}>Result: </span>
                                <pre className="text-xs overflow-x-auto max-h-48 mt-1" style={{ color: "var(--text-secondary)" }}>
                                  {JSON.stringify(inv.result, null, 2).slice(0, 2000)}
                                  {JSON.stringify(inv.result).length > 2000 ? "\n..." : ""}
                                </pre>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  }
                  if (part.type === "text" && part.text) {
                    return (
                      <div key={i} className="chat-markdown">
                        <ReactMarkdown>{part.text}</ReactMarkdown>
                      </div>
                    );
                  }
                  return null;
                })}

                {/* Fallback for messages without parts */}
                {!msg.parts?.length && msg.content && (
                  <div className="chat-markdown">
                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                  </div>
                )}
              </div>
            </div>
          ))}

          {isLoading && messages[messages.length - 1]?.role === "user" && (
            <div className="flex justify-start">
              <div
                className="rounded-xl px-4 py-3"
                style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)" }}
              >
                <div className="flex gap-1">
                  <div className="w-2 h-2 rounded-full animate-bounce" style={{ background: "var(--accent)", animationDelay: "0ms" }} />
                  <div className="w-2 h-2 rounded-full animate-bounce" style={{ background: "var(--accent)", animationDelay: "150ms" }} />
                  <div className="w-2 h-2 rounded-full animate-bounce" style={{ background: "var(--accent)", animationDelay: "300ms" }} />
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
            ref={inputRef}
            value={input}
            onChange={handleInputChange}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e as any);
              }
            }}
            placeholder="Ask about cars, prices, deals, market trends..."
            rows={1}
            className="flex-1 resize-none rounded-xl px-4 py-3 text-sm outline-none transition-colors"
            style={{
              background: "var(--bg-tertiary)",
              color: "var(--text-primary)",
              border: "1px solid var(--border)",
            }}
            onFocus={(e) => (e.target.style.borderColor = "var(--accent)")}
            onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="rounded-xl px-6 py-3 text-sm font-medium transition-colors disabled:opacity-40"
            style={{ background: "var(--accent)", color: "#fff" }}
            onMouseEnter={(e) => !isLoading && (e.currentTarget.style.background = "var(--accent-hover)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "var(--accent)")}
          >
            {isLoading ? "..." : "Send"}
          </button>
        </form>
        <p className="text-center text-xs mt-2" style={{ color: "var(--text-muted)" }}>
          MarketCheck AI may produce inaccurate information. Verify important data independently.
        </p>
      </div>
    </div>
  );
}
