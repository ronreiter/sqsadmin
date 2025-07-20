import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  output: 'standalone', // Enables standalone build for Docker
  env: {
    PORT: process.env.PORT || '8086',
  },
};

export default nextConfig;
