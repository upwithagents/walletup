import type { NextConfig } from "next";
import { config } from "dotenv";
import { join } from "node:path";

// The monorepo keeps shared secrets (wallet provider URL/token) in the
// root .env; load them into the web server process.
config({ path: join(__dirname, "..", "..", ".env") });

const nextConfig: NextConfig = {
  transpilePackages: ["@walletup/db", "@walletup/memory", "@walletup/provider-wallet"],
  basePath: "/walletup",
};

export default nextConfig;
