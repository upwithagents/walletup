// Compute (and persist) a month evaluation.
//   pnpm --filter @walletup/agent evaluate -- 2026-06 [--dry-run]
import { config } from "dotenv";
import { join } from "node:path";
import { prisma } from "@walletup/db";
import { WalletProvider } from "@walletup/provider-wallet";
import { evaluateMonth, persistEvaluation } from "./evaluate.ts";

config({ path: join(import.meta.dirname, "..", "..", "..", ".env") });

const args = process.argv.slice(2).filter((a) => a !== "--");
const month =
  args.find((a) => /^\d{4}-\d{2}$/.test(a)) ??
  new Date(Date.now() - 27 * 86_400_000).toISOString().slice(0, 7);
const dryRun = args.includes("--dry-run");

const wallet = new WalletProvider();
try {
  const draft = await evaluateMonth(wallet, month);
  console.log(`\n${month}: income ${draft.incomeTotal.toFixed(0)} | expenses ${draft.expenseTotal.toFixed(0)} | balance ${draft.balance.toFixed(0)} CZK`);
  console.log(`budget points (${draft.pointsMethod}): ${draft.budgetPoints}`);
  for (const r of draft.rows.filter((x) => x.kind === "budget").slice(0, 12)) {
    const pct = r.progress != null ? `${Math.round(r.progress * 100)}%` : "—";
    console.log(`  ${pct.padStart(5)}  ${r.name} — ${r.actual.toFixed(0)}/${r.aim?.toFixed(0)} ${r.currency}`);
  }
  if (!dryRun) {
    const saved = await persistEvaluation(draft);
    console.log(`persisted evaluation ${saved.id} (${draft.rows.length} rows)`);
  }
} finally {
  await wallet.close();
  await prisma.$disconnect();
}
