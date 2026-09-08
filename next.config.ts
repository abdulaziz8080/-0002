import type { NextConfig } from "next";

const API_PROXY = process.env.API_PROXY_TARGET ?? "http://localhost:4000";

const nextConfig: NextConfig = {
  async rewrites() {
    return [{ source: "/api/:path*", destination: `${API_PROXY}/api/:path*` }];
  },
};

export default nextConfig;
