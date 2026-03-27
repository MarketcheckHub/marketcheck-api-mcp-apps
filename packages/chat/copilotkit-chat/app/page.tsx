"use client";

import { CopilotKit } from "@copilotkit/react-core";
import { CopilotSidebar } from "@copilotkit/react-ui";
import "@copilotkit/react-ui/styles.css";

function Dashboard() {
  return (
    <div className="h-full p-6 overflow-y-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center text-lg font-bold"
          style={{ background: "var(--accent)", color: "#fff" }}
        >
          MC
        </div>
        <div>
          <h1 className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>
            MarketCheck Dashboard
          </h1>
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            AI Copilot powered by CopilotKit + Claude
          </p>
        </div>
        <div className="ml-auto">
          <span
            className="px-2 py-0.5 rounded text-xs font-medium"
            style={{ background: "#8b5cf622", color: "var(--accent)", border: "1px solid #8b5cf633" }}
          >
            CopilotKit
          </span>
        </div>
      </div>

      {/* Dashboard Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        <DashboardCard
          title="Active Listings"
          value="4.2M+"
          subtitle="US dealer inventory"
          icon="&#128202;"
        />
        <DashboardCard
          title="Recent Sales"
          value="890K+"
          subtitle="Past 90 days"
          icon="&#128200;"
        />
        <DashboardCard
          title="Dealers Tracked"
          value="47K+"
          subtitle="Across all 50 states"
          icon="&#127970;"
        />
      </div>

      {/* Info panel */}
      <div
        className="rounded-xl p-6 mb-6"
        style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)" }}
      >
        <h2 className="text-sm font-semibold mb-3" style={{ color: "var(--text-primary)" }}>
          Ask the Copilot
        </h2>
        <p className="text-sm mb-4" style={{ color: "var(--text-secondary)" }}>
          The AI copilot on the right can help you with automotive market intelligence. Try asking:
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {[
            "Search for Toyota RAV4 under $30K near 90210",
            "Decode VIN 1HGCV1F34LA000001",
            "What are the top selling brands in California?",
            "Find Toyota incentives near ZIP 60601",
            "Predict the price for this VIN: WBA7E2C51JG123456",
            "Show me the listing history for VIN 5YJSA1DG9DFP14705",
          ].map((suggestion) => (
            <div
              key={suggestion}
              className="rounded-lg px-3 py-2 text-xs"
              style={{
                background: "var(--bg-tertiary)",
                color: "var(--text-secondary)",
                border: "1px solid var(--border)",
              }}
            >
              &ldquo;{suggestion}&rdquo;
            </div>
          ))}
        </div>
      </div>

      {/* Available Tools */}
      <div
        className="rounded-xl p-6"
        style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)" }}
      >
        <h2 className="text-sm font-semibold mb-3" style={{ color: "var(--text-primary)" }}>
          Available Tools
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {[
            { name: "Search Cars", desc: "Search 4M+ active listings", icon: "&#128269;" },
            { name: "Decode VIN", desc: "Full vehicle specifications", icon: "&#128196;" },
            { name: "Predict Price", desc: "Fair market value estimate", icon: "&#128176;" },
            { name: "Car History", desc: "Price & dealer history", icon: "&#128337;" },
            { name: "OEM Incentives", desc: "Current rebates & deals", icon: "&#127873;" },
            { name: "Market Summary", desc: "Sales rankings & trends", icon: "&#128202;" },
          ].map((tool) => (
            <div
              key={tool.name}
              className="rounded-lg px-3 py-2"
              style={{ background: "var(--bg-tertiary)", border: "1px solid var(--border)" }}
            >
              <div className="flex items-center gap-2 mb-1">
                <span>{tool.icon}</span>
                <span className="text-xs font-medium" style={{ color: "var(--text-primary)" }}>
                  {tool.name}
                </span>
              </div>
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                {tool.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function DashboardCard({
  title,
  value,
  subtitle,
  icon,
}: {
  title: string;
  value: string;
  subtitle: string;
  icon: string;
}) {
  return (
    <div
      className="rounded-xl p-4"
      style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)" }}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>
          {title}
        </span>
        <span className="text-lg">{icon}</span>
      </div>
      <div className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>
        {value}
      </div>
      <div className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
        {subtitle}
      </div>
    </div>
  );
}

export default function Page() {
  return (
    <CopilotKit runtimeUrl="/api/copilotkit">
      <CopilotSidebar
        defaultOpen={true}
        instructions="You are MarketCheck AI, an expert automotive market assistant. You have tools to search car listings, decode VINs, predict prices, check incentives, and analyze market data. Always use tools to back claims with real data. Format prices as $XX,XXX."
        labels={{
          title: "MarketCheck Copilot",
          initial: "Hi! I'm your MarketCheck AI copilot. Ask me about cars, prices, deals, or market trends.",
          placeholder: "Ask about cars, prices, deals...",
        }}
        className="copilotKitChat"
      >
        <div className="h-screen" style={{ background: "var(--bg-primary)" }}>
          <Dashboard />
        </div>
      </CopilotSidebar>
    </CopilotKit>
  );
}
