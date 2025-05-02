import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  output: 'standalone', // Enables standalone build for Docker
  env: {
    PORT: process.env.PORT || '8086',
  },
  // Configure server to listen on the specified port
  server: {
    port: parseInt(process.env.PORT || '8086', 10),
  },
};

export default nextConfig;
