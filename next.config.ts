import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      // route renamed 2026-07-17 — keep shared links alive
      { source: "/lottery", destination: "/jackpot", permanent: false },
      // /new-dashboard was the v4 staging route; it is now /dashboard itself.
      // Query strings pass through, so ?address=0x… review links still work.
      { source: "/new-dashboard", destination: "/dashboard", permanent: false },
    ];
  },
};

export default nextConfig;
