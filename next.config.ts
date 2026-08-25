import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return {
      /* /journey is the scroll-is-time experiment — a static page under
         public/nl, ported from the Claude Design build. It sits on its own path
         deliberately: / is the official landing and /new-landing is the v5
         scrollworld, and neither is being replaced by this.

         Served as a rewrite rather than a page so the markup runs exactly as it
         was designed and verified, with no JSX translation layer in between. */
      beforeFiles: [{ source: "/journey", destination: "/nl/index.html" }],
      afterFiles: [],
      fallback: [],
    };
  },

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
