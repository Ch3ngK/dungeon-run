import type { NextConfig } from "next";
import withPWA from "next-pwa";

const nextConfig: NextConfig = withPWA({
  reactStrictMode: true,
  swcMinify: true, // optional but recommended
  pwa: {
    dest: "public",       // service worker and PWA assets will go here
    register: true,       // automatically register the service worker
    skipWaiting: true,    // activate new SW immediately
  },
});

export default nextConfig;
