import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow importing from chat-shared workspace package
  transpilePackages: ["@mcp-apps/chat-shared"],
};

export default nextConfig;
