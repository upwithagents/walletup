/**
 * Automated finance health checks (plan 03) — programmatic versions of the
 * sheet's Checks tab. Read-only detections; remedies are described, never
 * executed.
 */

import { prisma } from "@walletup/db";
import { WalletProvider } from "@walletup/provider-wallet";

export interface CheckOutcome {
  checkId: string;
  name: string;
  status: "pass" | "warn" | "fail";
  evidence: string;
  remedy?: string;
}

interface Account {
  id: string;
  name: string;
  accountType: string;
  archived: boolean;
  isBankSync: boolean;
  balance: { currencyCode: string; currentBalance: number };
  recordStats?: { recordCount: number; lastUpdatedAt?: string };
}

const DAY_MS = 86_400_000;

async function allAccounts(wallet: WalletProvider): Promise<Account[]> {
  const out: Account[] = [];
  let offset = 0;
  for (;;) {
    const page = await wallet.getAccounts({ limit: 20, offset });
    out.push(...(page.accounts as unknown as Account[]));
    if (page.nextOffset == null) break;
    offset = page.nextOffset;
  }
  return out;
}

function fmt(v: number, c: string) {
  return `${v.toLocaleString("en-US", { maximumFractionDigits: 2 })} ${c}`;
}

/** Check 1 (sheet #1): uncategorized backlog size and age. */
async function uncategorizedBacklog(wallet: WalletProvider): Promise<CheckOutcome> {
  const { records, total } = await wallet.uncategorized("2000-01-01");
  const base = {
    checkId: "uncategorized-backlog",
    name: "Uncategorized records backlog",
  };
  if (total === 0) {
    return { ...base, status: "pass", evidence: "No uncategorized records." };
  }
  const oldest = (records as Array<{ recordDate: string }>)
    .map((r) => r.recordDate)
    .sort()[0];
  const ageDays = Math.floor((Date.now() - new Date(oldest).getTime()) / DAY_MS);
  return {
    ...base,
    status: ageDays > 14 ? "fail" : "warn",
    evidence: `${total} uncategorized record(s); oldest from ${oldest.slice(0, 10)} (${ageDays}d ago).`,
    remedy:
      "Run the categorization sweep (pnpm --filter @walletup/agent categorize) and review the proposals.",
  };
}

/** Check 2 (sheet #3): the manual CC mirror account must balance to 0. */
function ccManualZero(accounts: Account[]): CheckOutcome {
  const base = { checkId: "cc-manual-zero", name: "CC mirror account balances to 0" };
  const acc = accounts.find((a) => a.name === "Raiffeisen CC Manual");
  if (!acc) return { ...base, status: "warn", evidence: "Account 'Raiffeisen CC Manual' not found." };
  const v = acc.balance.currentBalance;
  return v === 0
    ? { ...base, status: "pass", evidence: "Raiffeisen CC Manual is at 0." }
    : {
        ...base,
        status: "fail",
        evidence: `Raiffeisen CC Manual is at ${fmt(v, acc.balance.currencyCode)}, expected 0.`,
        remedy:
          "Monthly reconciliation: BLUE transfer (repayment), GREY excluded mirror, RED balancing correction — see the Checks tab, item 3.",
      };
}

/** Check 3 (sheet #4a): Manual Edits bookkeeping account must net to 0. */
function manualEditsZero(accounts: Account[]): CheckOutcome {
  const base = { checkId: "manual-edits-zero", name: "Manual Edits nets to 0" };
  const acc = accounts.find((a) => a.name === "Manual Edits");
  if (!acc) return { ...base, status: "warn", evidence: "Account 'Manual Edits' not found." };
  const v = acc.balance.currentBalance;
  return v === 0
    ? { ...base, status: "pass", evidence: "Manual Edits is at 0." }
    : {
        ...base,
        status: "fail",
        evidence: `Manual Edits is at ${fmt(v, acc.balance.currencyCode)}, expected 0.`,
        remedy:
          "Filter records with the Manual Edit ↔️ label and find the unpaired side (Checks tab, item 4).",
      };
}

/** Check 4 (sheet #4b): Distributed Edit must sum to ~0 over the year. */
async function distributedEditYearZero(
  wallet: WalletProvider,
  accounts: Account[],
): Promise<CheckOutcome> {
  const base = {
    checkId: "distributed-edit-year-zero",
    name: "Distributed Edit sums to 0 this year",
  };
  const acc = accounts.find((a) => a.name === "Distributed Edit");
  if (!acc) return { ...base, status: "warn", evidence: "Account 'Distributed Edit' not found." };
  const year = new Date().getFullYear();
  const { results } = await wallet.getRecordsAggregation({
    accountId: acc.id,
    recordDate: [`gte.${year}-01-01`],
    compute: ["baseAmount:sum"],
  });
  const net = (results as Array<{ "baseAmount:sum"?: number }>).reduce(
    (s, r) => s + (r["baseAmount:sum"] ?? 0),
    0,
  );
  return Math.abs(net) < 1
    ? { ...base, status: "pass", evidence: `Net ${net.toFixed(2)} CZK for ${year}.` }
    : {
        ...base,
        status: "fail",
        evidence: `Distributed Edit nets ${net.toFixed(2)} CZK for ${year}, expected ~0.`,
        remedy:
          "Year-filter the account and hunt inconsistencies by keyword (Set-Aside, Income Tax Downpayment, … — Checks tab, item 4).",
      };
}

/** Check 5 (sheet #2): manual (non-synced) money accounts going stale. */
function manualAccountStaleness(accounts: Account[]): CheckOutcome {
  const base = { checkId: "manual-account-staleness", name: "Manual accounts recently synced" };
  const manual = accounts.filter(
    (a) =>
      !a.isBankSync &&
      !a.archived &&
      ["SavingAccount", "CurrentAccount", "Cash"].includes(a.accountType),
  );
  if (manual.length === 0)
    return { ...base, status: "pass", evidence: "No manual money accounts." };
  const stale = manual.filter((a) => {
    const last = a.recordStats?.lastUpdatedAt;
    return !last || Date.now() - new Date(last).getTime() > 35 * DAY_MS;
  });
  return stale.length === 0
    ? {
        ...base,
        status: "pass",
        evidence: `${manual.length} manual account(s), all touched within 35 days.`,
      }
    : {
        ...base,
        status: "warn",
        evidence: `Stale manual account(s): ${stale.map((a) => a.name).join(", ")}.`,
        remedy: "Sync them from online banking using the existing templates (Checks tab, item 2).",
      };
}

/** Check 6: Review 🔍 labels should not linger. */
async function staleReviewLabels(wallet: WalletProvider): Promise<CheckOutcome> {
  const base = { checkId: "stale-review-labels", name: "Review 🔍 flags cleared" };
  const { records, total } = await wallet.getRecords({
    labelId: "3d216ece-213c-49a0-97df-5ef1656609ac",
    limit: 50,
    sortBy: ["+recordDate"],
  });
  if (total === 0) return { ...base, status: "pass", evidence: "No records carry Review 🔍." };
  const oldest = (records as Array<{ recordDate: string }>)[0]?.recordDate ?? "";
  const ageDays = Math.floor((Date.now() - new Date(oldest).getTime()) / DAY_MS);
  return {
    ...base,
    status: ageDays > 30 ? "warn" : "pass",
    evidence: `${total} record(s) flagged Review 🔍; oldest ${oldest.slice(0, 10)} (${ageDays}d).`,
    remedy: "Resolve or clear the flags — proposals for stale ones are in the review queue.",
  };
}

export async function runChecks(wallet: WalletProvider): Promise<CheckOutcome[]> {
  const accounts = await allAccounts(wallet);
  return [
    await uncategorizedBacklog(wallet),
    ccManualZero(accounts),
    manualEditsZero(accounts),
    await distributedEditYearZero(wallet, accounts),
    manualAccountStaleness(accounts),
    await staleReviewLabels(wallet),
  ];
}

export async function persistCheckRun(outcomes: CheckOutcome[]) {
  return prisma.checkRun.create({
    data: { results: { create: outcomes } },
  });
}
