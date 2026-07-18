import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

// Sheet-style cell coloring: green within aim, orange slightly over, red over.
function progressStyle(progress: number | null, aim: number | null): string {
  if (progress == null || aim == null) return "";
  if (aim <= 1) return "text-ink-soft"; // "should be zero" watch budgets
  if (progress <= 1) return "bg-[#c8e6c9] text-[#1b5e20]";
  if (progress <= 1.15) return "bg-[#ffe0b2] text-[#e65100]";
  return "bg-[#ffcdd2] text-[#b71c1c]";
}

function czk(v: number) {
  return v.toLocaleString("en-US", { maximumFractionDigits: 0 });
}

export default async function EvaluationPage(props: {
  searchParams: Promise<{ month?: string }>;
}) {
  const { month } = await props.searchParams;
  const evaluations = await prisma.monthEvaluation.findMany({
    orderBy: { month: "desc" },
    select: { month: true },
  });
  const selected = month ?? evaluations[0]?.month;
  const evaluation = selected
    ? await prisma.monthEvaluation.findUnique({
        where: { month: selected },
        include: { rows: true },
      })
    : null;

  const budgets = evaluation?.rows
    .filter((r) => r.kind === "budget")
    .sort((a, b) => (b.progress ?? 0) - (a.progress ?? 0));
  const overCount = budgets?.filter((r) => (r.progress ?? 0) > 1 && (r.aim ?? 0) > 1).length ?? 0;

  return (
    <main className="mx-auto w-full max-w-3xl grow px-4 pt-8 pb-24">
      <header>
        <p className="font-mono text-[11px] tracking-[0.2em] text-ink-soft uppercase">
          WalletUp
        </p>
        <h1 className="mt-1 text-4xl font-semibold tracking-tight">
          Month evaluation
        </h1>
        <p className="mt-3 max-w-prose text-sm text-ink-soft">
          The Budgets tab, computed from live provider data. Budget points are
          provisional until the sheet formula is confirmed.{" "}
          <a href="/evaluation/history" className="underline hover:text-ink">
            Month-by-month grid →
          </a>
        </p>
        {evaluations.length > 0 ? (
          <p className="mt-3 font-mono text-xs">
            {evaluations.map((e) => (
              <a
                key={e.month}
                href={`/evaluation?month=${e.month}`}
                className={`mr-3 ${e.month === selected ? "text-ink underline" : "text-ink-soft hover:text-ink"}`}
              >
                {e.month}
              </a>
            ))}
          </p>
        ) : null}
      </header>

      {!evaluation ? (
        <p className="mt-12 border-t border-rule pt-8 text-sm text-ink-soft">
          No evaluations yet. Run{" "}
          <code className="font-mono text-xs">
            pnpm --filter @walletup/agent evaluate -- 2026-06
          </code>
          .
        </p>
      ) : (
        <>
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-md border border-rule bg-card px-3 py-2">
              <p className="font-mono text-[10px] tracking-widest text-ink-soft uppercase">
                Income
              </p>
              <p className="font-mono text-lg font-medium text-[#43a047] tabular-nums">
                {czk(evaluation.incomeTotal)}
              </p>
            </div>
            <div className="rounded-md border border-rule bg-card px-3 py-2">
              <p className="font-mono text-[10px] tracking-widest text-ink-soft uppercase">
                Expenses
              </p>
              <p className="font-mono text-lg font-medium text-[#e53935] tabular-nums">
                {czk(evaluation.expenseTotal)}
              </p>
            </div>
            <div className="rounded-md border border-rule bg-card px-3 py-2">
              <p className="font-mono text-[10px] tracking-widest text-ink-soft uppercase">
                Balance
              </p>
              <p
                className={`font-mono text-lg font-medium tabular-nums ${evaluation.balance >= 0 ? "text-[#43a047]" : "text-[#e53935]"}`}
              >
                {czk(evaluation.balance)}
              </p>
            </div>
            <div className="rounded-md border border-rule bg-card px-3 py-2">
              <p className="font-mono text-[10px] tracking-widest text-ink-soft uppercase">
                Points*
              </p>
              <p className="font-mono text-lg font-medium tabular-nums">
                {evaluation.budgetPoints ?? "—"}
              </p>
            </div>
          </div>
          <p className="mt-2 font-mono text-[11px] text-ink-soft">
            * {evaluation.pointsMethod} — {overCount} of {budgets?.length} budgets over
            aim · computed{" "}
            {evaluation.computedAt.toISOString().replace("T", " ").slice(0, 16)}
          </p>

          <div className="mt-6 overflow-hidden rounded-md border border-rule bg-card shadow-[0_1px_2px_rgba(24,38,32,0.06)]">
            {budgets?.map((r) => (
              <div
                key={r.id}
                className="flex items-baseline gap-3 border-t border-rule px-4 py-2 first:border-t-0"
              >
                <span className="min-w-0 flex-1 truncate text-[14px] font-medium">
                  {r.name}
                </span>
                {(r.aim ?? 0) <= 1 ? (
                  <span className="font-mono text-[10px] tracking-widest text-ink-soft uppercase">
                    watch
                  </span>
                ) : null}
                <span className="font-mono text-[13px] text-ink-soft tabular-nums">
                  {czk(r.actual)} / {r.aim != null ? czk(r.aim) : "—"}
                </span>
                <span
                  className={`w-16 rounded px-1.5 py-0.5 text-right font-mono text-[12px] font-medium tabular-nums ${progressStyle(r.progress, r.aim)}`}
                >
                  {r.progress != null ? `${Math.round(r.progress * 100)}%` : "—"}
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </main>
  );
}
