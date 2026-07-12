// Run the categorization propose-pipeline.
//   pnpm --filter @walletup/agent categorize -- --dry-run   (print only)
//   pnpm --filter @walletup/agent categorize                (create the run)
import { config } from "dotenv";
import { join } from "node:path";
import { prisma } from "@walletup/db";
import { WalletProvider } from "@walletup/provider-wallet";
import { buildProposals, persistRun } from "./categorize.ts";

config({ path: join(import.meta.dirname, "..", "..", "..", ".env") });

const dryRun = process.argv.includes("--dry-run");
const wallet = new WalletProvider();

try {
  const { drafts, skippedExisting, backlogTotal } = await buildProposals(wallet);
  console.log(
    `backlog: ${backlogTotal} uncategorized | already in queue: ${skippedExisting} | new drafts: ${drafts.length}`,
  );
  for (const d of drafts) {
    console.log(`- [${d.confidence}] ${d.title} -> ${d.proposedAction}`);
    console.log(`    ${d.evidence}`);
  }
  if (drafts.length === 0) {
    console.log("nothing new to propose — queue already covers the backlog");
  } else if (dryRun) {
    console.log("(dry run — nothing persisted)");
  } else {
    const run = await persistRun(
      drafts,
      `Automated categorization sweep: ${drafts.length} proposal(s) drafted from ` +
        `${backlogTotal}-record backlog via merchant-history matching.`,
    );
    console.log(`created run ${run.id} with ${drafts.length} proposals`);
  }
} finally {
  await wallet.close();
  await prisma.$disconnect();
}
