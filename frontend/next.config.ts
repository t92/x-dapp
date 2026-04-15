import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enable browser source maps for production builds so DevTools can map
  // bundled code back to your original source files.
  productionBrowserSourceMaps: true,
};

export default nextConfig;
