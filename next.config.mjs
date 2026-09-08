/** @type {import('next').NextConfig} */
const nextConfig = {
  // Node-only packages used server-side; keep them out of the client/edge bundles.
  serverExternalPackages: ["@modelcontextprotocol/sdk", "node-forge"],
};

export default nextConfig;
