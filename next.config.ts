import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Avoids dev-only "Could not find ... segment-explorer-node.js#SegmentViewNode in the
  // React Client Manifest" on navigation (e.g. header logo) — Next 15.5+ segment explorer.
  experimental: {
    devtoolSegmentExplorer: false,
  },
  images: {
    // Prefer modern formats; Vercel Image Optimization serves AVIF/WebP automatically.
    formats: ["image/avif", "image/webp"],
    // Cache optimized variants for 1 year — menu images rarely change.
    minimumCacheTTL: 31_536_000,
    // Trim device breakpoints to what the menu layout actually uses.
    deviceSizes: [384, 640, 828, 1080, 1200],
    imageSizes: [64, 96, 128, 256, 384],
  },
};

export default nextConfig;
