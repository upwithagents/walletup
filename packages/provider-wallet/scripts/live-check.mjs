// Live connectivity check for the Wallet provider. Prints counts and sync
// state only — safe to run anywhere. Usage: pnpm --filter @walletup/provider-wallet check
import { config } from "dotenv";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(fileURLToPath(import.meta.url), "..", "..", "..", "..");
config({ path: join(root, ".env") });

setTimeout(() => {
  console.error("HARD TIMEOUT after 45s");
  process.exit(2);
}, 45_000);

const { WalletProvider } = await import("../src/index.ts");
const w = new WalletProvider();
try {
  const profile = await w.getClientProfile();
  console.log(
    `profile ok: base=${profile.baseCurrency} sync=${profile.syncState} scopes=${profile.grantedScopes.length}`,
  );
  const accounts = await w.getAccounts({ limit: 5 });
  console.log(`accounts ok: total=${accounts.total}`);
  const budgets = await w.getBudgets({ limit: 5 });
  console.log(`budgets ok: total=${budgets.total}`);
  console.log("provider live check PASSED");
  process.exit(0);
} catch (e) {
  console.error("FAILED:", e?.message ?? e);
  process.exit(1);
}
