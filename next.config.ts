import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  htmlLimitedBots: /.*/,
  redirects() {
    return [
      { source: "/newpage", destination: "/", permanent: true },
      { source: "/newpage/blog/:path*", destination: "/blog/:path*", permanent: true },
      { source: "/newpage/projects/:path*", destination: "/projects/:path*", permanent: true },
      { source: "/newpage/people/:path*", destination: "/people/:path*", permanent: true },
      { source: "/newpage/publications", destination: "/publications", permanent: true },
    ];
  },
  headers() {
    return ["/admin/:path*", "/api/admin/:path*"].map((source) => ({
      source,
      headers: [
        { key: "X-Frame-Options", value: "DENY" },
        { key: "Content-Security-Policy", value: "frame-ancestors 'none'; base-uri 'self'; form-action 'self'" },
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "Referrer-Policy", value: "same-origin" },
      ],
    }));
  },
};

export default nextConfig;
