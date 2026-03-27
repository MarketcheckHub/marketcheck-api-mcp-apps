import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MarketCheck Chat — assistant-ui",
  description: "Custom-branded automotive AI chat with rich tool results",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased">{children}</body>
    </html>
  );
}
