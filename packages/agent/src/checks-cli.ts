// Run the finance health checks and persist a CheckRun.
//   pnpm --filter @walletup/agent checks -- --dry-run   (print only)
import { config } from "dotenv";
import { join } from "node:path";
import { prisma } from "@walletup/db";
import { WalletProvider } from "@walletup/provider-wallet";
import { persistCheckRun, runChecks } from "./checks.ts";

config({ path: join(import.meta.dirname, "..", "..", "..", ".env") });

const dryRun = process.argv.includes("--dry-run");
const wallet = new WalletProvider();

try {
  const outcomes = await runChecks(wallet);
  for (const o of outcomes) {
    console.log(`${o.status.toUpperCase().padEnd(4)} ${o.name} — ${o.evidence}`);
    if (o.remedy && o.status !== "pass") console.log(`     remedy: ${o.remedy}`);
  }
  const failed = outcomes.filter((o) => o.status === "fail").length;
  const warned = outcomes.filter((o) => o.status === "warn").length;
  console.log(`\n${outcomes.length} checks: ${failed} fail, ${warned} warn`);
  if (!dryRun) {
    const run = await persistCheckRun(outcomes);
    console.log(`persisted check run ${run.id}`);
  }
} finally {
  await wallet.close();
  await prisma.$disconnect();
}
