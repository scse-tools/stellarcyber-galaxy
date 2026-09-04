import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Emit a self-contained server bundle (.next/standalone) for a small Docker image.
  output: "standalone",
  // Force-include runtime files the tracer misses in Next 15 standalone builds.
  outputFileTracingIncludes: {
    "*": ["./node_modules/next/dist/lib/metadata/**/*"],
  },
  // Never trace the runtime SQLite database into the build output — it is mounted at runtime.
  outputFileTracingExcludes: {
    "*": ["./data/**", "./.npm-cache/**"],
  },
  // `node:sqlite` and the MCP SDK are Node-only; keep them out of the client bundle.
  serverExternalPackages: ["@modelcontextprotocol/sdk"],
};

export default nextConfig;
