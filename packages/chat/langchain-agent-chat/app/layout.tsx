import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MarketCheck Agent — LangChain",
  description: "AI agent with visible reasoning chains for automotive market intelligence",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body className="antialiased">{children}</body>
    </html>
  );
}
