import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Avoids dev-only "Could not find ... segment-explorer-node.js#SegmentViewNode in the
  // React Client Manifest" on navigation (e.g. header logo) — Next 15.5+ segment explorer.
  experimental: {
    devtoolSegmentExplorer: false,
  },
};

export default nextConfig;
