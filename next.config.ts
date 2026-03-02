import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  basePath: "/g/tanki",
  output: "standalone",
  serverExternalPackages: ["ws"],
};

export default nextConfig;
