import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  basePath: "/g/tanki2",
  output: "standalone",
  serverExternalPackages: ["ws"],
};

export default nextConfig;
