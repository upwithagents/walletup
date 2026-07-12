// The daily chore run: categorization sweep + health checks + current-month
// evaluation, in one command. Schedule it (cron/launchd) or run by hand:
//   pnpm --filter @walletup/agent daily
import { config } from "dotenv";
import { join } from "node:path";
import { prisma } from "@walletup/db";
import { WalletProvider } from "@walletup/provider-wallet";
import { buildProposals, persistRun } from "./categorize.ts";
import { persistCheckRun, runChecks } from "./checks.ts";
import { evaluateMonth, persistEvaluation } from "./evaluate.ts";

config({ path: join(import.meta.dirname, "..", "..", "..", ".env") });

const wallet = new WalletProvider();
try {
  console.log("=== categorization sweep ===");
  const { drafts, backlogTotal, skippedExisting } = await buildProposals(wallet);
  console.log(
    `backlog ${backlogTotal}, covered ${skippedExisting}, new drafts ${drafts.length}`,
  );
  if (drafts.length > 0) {
    const run = await persistRun(
      drafts,
      `Daily sweep: ${drafts.length} proposal(s) from ${backlogTotal}-record backlog.`,
    );
    console.log(`created run ${run.id}`);
  }

  console.log("\n=== health checks ===");
  const outcomes = await runChecks(wallet);
  for (const o of outcomes) console.log(`${o.status.toUpperCase().padEnd(4)} ${o.name}`);
  await persistCheckRun(outcomes);

  console.log("\n=== month evaluation (current month) ===");
  const month = new Date().toISOString().slice(0, 7);
  const draft = await evaluateMonth(wallet, month);
  await persistEvaluation(draft);
  console.log(
    `${month}: income ${draft.incomeTotal.toFixed(0)}, expenses ${draft.expenseTotal.toFixed(0)}, ` +
      `balance ${draft.balance.toFixed(0)} CZK, points ${draft.budgetPoints}`,
  );

  console.log("\ndaily run complete");
} finally {
  await wallet.close();
  await prisma.$disconnect();
}
