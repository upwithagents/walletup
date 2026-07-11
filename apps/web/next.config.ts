import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@walletup/db", "@walletup/memory"],
};

export default nextConfig;
