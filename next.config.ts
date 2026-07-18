import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      // route renamed 2026-07-17 — keep shared links alive
      { source: "/lottery", destination: "/jackpot", permanent: false },
    ];
  },
};

export default nextConfig;
