import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  experimental: {
    turbopack: {
      // Silence turbopack workspace root detection warning by setting project root
      // if needed, though this is the default.
    },
  },
};

export default nextConfig;
