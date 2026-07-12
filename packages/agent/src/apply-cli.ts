// Apply user-approved proposals to the provider.
//   pnpm --filter @walletup/agent apply              (dry-run: plan only)
//   pnpm --filter @walletup/agent apply -- --execute (actually write)
import { config } from "dotenv";
import { join } from "node:path";
import { prisma } from "@walletup/db";
import { WalletWriter } from "@walletup/provider-wallet";
import { executeApply, planApply } from "./apply.ts";

config({ path: join(import.meta.dirname, "..", "..", "..", ".env") });

const execute = process.argv.includes("--execute");
const writer = new WalletWriter();

try {
  const { planned, unsupported, missingScopes } = await planApply(writer);

  console.log(`approved proposals ready to apply: ${planned.length}`);
  for (const i of planned) console.log(`- [${i.requiredScope}] ${i.action}`);
  for (const p of unsupported)
    console.log(`- SKIP (${p.kind}, no executable action): ${p.title}`);

  if (planned.length === 0) {
    console.log("nothing to apply");
  } else if (missingScopes.length > 0) {
    console.log(
      `\nBLOCKED — missing provider scopes: ${missingScopes.join(", ")}.\n` +
        "Enable them at web.budgetbakers.com/settings/mcp-server, then re-run.",
    );
    process.exitCode = 2;
  } else if (!execute) {
    console.log("\n(dry run — pass --execute to write to the provider)");
  } else {
    const { applied, failed } = await executeApply(writer, planned);
    console.log(`\napplied: ${applied}, failed: ${failed.length}`);
    for (const f of failed) console.log(`  FAILED ${f.id}: ${f.error}`);
    if (failed.length > 0) process.exitCode = 1;
  }
} finally {
  await writer.close();
  await prisma.$disconnect();
}
