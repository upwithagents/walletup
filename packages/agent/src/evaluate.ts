/**
 * Monthly evaluation (plan 02) — aim vs actual per budget for a month,
 * plus month totals, computed entirely from provider data (Wallet budgets
 * are the aims). BUDGET POINTS uses a provisional formula until the
 * sheet's exact one is confirmed; the method is stored alongside so
 * provisional scores are never mistaken for canonical ones.
 */

import { prisma } from "@walletup/db";
import { WalletProvider } from "@walletup/provider-wallet";

export interface EvaluationRowDraft {
  name: string;
  kind: "budget" | "derived";
  aim: number | null;
  actual: number;
  currency: string;
  progress: number | null;
}

export interface MonthEvaluationDraft {
  month: string;
  incomeTotal: number;
  expenseTotal: number;
  balance: number;
  budgetPoints: number | null;
  pointsMethod: string | null;
  rows: EvaluationRowDraft[];
}

interface BudgetPeriod {
  period: string;
  limit: number;
  spent: number;
}

interface Budget {
  name: string;
  limit: number | null;
  closed: boolean;
  currencyCode: string;
  spending?: { current?: BudgetPeriod; past?: BudgetPeriod[] };
}

function monthDelta(month: string): number {
  const [y, m] = month.split("-").map(Number);
  const now = new Date();
  return (now.getUTCFullYear() - y) * 12 + (now.getUTCMonth() + 1 - m);
}

/**
 * Provisional BUDGET POINTS (v1): start at 100, subtract each budget's
 * overspend share weighted by its size relative to the overall limit.
 * Documented so it can be replaced by the sheet formula 1:1.
 */
export function provisionalPoints(
  rows: Array<{ aim: number | null; actual: number }>,
): number {
  const budgets = rows.filter((r) => r.aim && r.aim > 1);
  const totalAim = budgets.reduce((s, r) => s + (r.aim ?? 0), 0);
  if (totalAim === 0) return 100;
  let penalty = 0;
  for (const r of budgets) {
    const over = Math.max(0, r.actual - (r.aim ?? 0));
    penalty += (over / totalAim) * 100;
  }
  return Math.max(0, Math.round(100 - penalty));
}

export async function evaluateMonth(
  wallet: WalletProvider,
  month: string,
): Promise<MonthEvaluationDraft> {
  const delta = monthDelta(month);
  if (delta < 0) throw new Error(`month ${month} is in the future`);
  const depth = delta <= 2 ? "current+2" : delta <= 5 ? "current+5" : "current+10";

  // Budgets: pre-computed aim/spent per period straight from the provider.
  const budgets: Budget[] = [];
  let offset = 0;
  for (;;) {
    const page = await wallet.getBudgets({ limit: 20, offset, spending: depth });
    budgets.push(...(page.budgets as unknown as Budget[]));
    if (page.nextOffset == null) break;
    offset = page.nextOffset;
  }

  const rows: EvaluationRowDraft[] = [];
  for (const b of budgets) {
    if (b.closed) continue;
    const periods = [
      ...(b.spending?.current ? [b.spending.current] : []),
      ...(b.spending?.past ?? []),
    ];
    const p = periods.find((x) => x.period === month || x.period?.startsWith(month));
    if (!p) continue;
    rows.push({
      name: b.name,
      kind: "budget",
      aim: p.limit,
      actual: p.spent,
      currency: b.currencyCode,
      progress: p.limit > 0 ? p.spent / p.limit : null,
    });
  }
  rows.sort((a, b) => (b.progress ?? 0) - (a.progress ?? 0));

  // Month totals from aggregation (transfers excluded, converted to base).
  const [y, m] = month.split("-").map(Number);
  const next = m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, "0")}`;
  const { results } = await wallet.getRecordsAggregation({
    recordDate: [`gte.${month}-01`, `lt.${next}-01`],
    groupBy: ["recordType"],
    compute: ["baseAmount:absSum"],
    transfersIncluded: false,
  });
  let incomeTotal = 0;
  let expenseTotal = 0;
  for (const r of results as Array<{ recordType: string; "baseAmount:absSum"?: number }>) {
    if (r.recordType === "income") incomeTotal = r["baseAmount:absSum"] ?? 0;
    if (r.recordType === "expense") expenseTotal = r["baseAmount:absSum"] ?? 0;
  }

  rows.push(
    {
      name: "INCOME (all, excl. transfers)",
      kind: "derived",
      aim: null,
      actual: incomeTotal,
      currency: "CZK",
      progress: null,
    },
    {
      name: "EXPENSES (all, excl. transfers)",
      kind: "derived",
      aim: null,
      actual: expenseTotal,
      currency: "CZK",
      progress: null,
    },
    {
      name: "BALANCE",
      kind: "derived",
      aim: null,
      actual: incomeTotal - expenseTotal,
      currency: "CZK",
      progress: null,
    },
  );

  const budgetRows = rows.filter((r) => r.kind === "budget");
  return {
    month,
    incomeTotal,
    expenseTotal,
    balance: incomeTotal - expenseTotal,
    budgetPoints: budgetRows.length ? provisionalPoints(budgetRows) : null,
    pointsMethod: budgetRows.length ? "provisional-overspend-v1" : null,
    rows,
  };
}

export async function persistEvaluation(draft: MonthEvaluationDraft) {
  const { rows, ...head } = draft;
  return prisma.monthEvaluation.upsert({
    where: { month: draft.month },
    create: { ...head, rows: { create: rows } },
    update: {
      ...head,
      computedAt: new Date(),
      rows: { deleteMany: {}, create: rows },
    },
  });
}
