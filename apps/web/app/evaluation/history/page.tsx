import { prisma } from "@/lib/db";
import { PageHeader } from "../../manage/ui";

export const dynamic = "force-dynamic";

// MFA-style pivot: budgets as rows, months as columns, sheet coloring.
function cellStyle(actual: number, aim: number | null): string {
  if (aim == null || aim <= 1) return "";
  const p = actual / aim;
  if (p <= 1) return "bg-[#c8e6c9] text-[#1b5e20]";
  if (p <= 1.15) return "bg-[#ffe0b2] text-[#e65100]";
  return "bg-[#ffcdd2] text-[#b71c1c]";
}

function czk(v: number) {
  return v.toLocaleString("en-US", { maximumFractionDigits: 0 });
}

export default async function EvaluationHistoryPage() {
  const evaluations = await prisma.monthEvaluation.findMany({
    orderBy: { month: "asc" },
    include: { rows: true },
  });
  const months = evaluations.map((e) => e.month);

  // row name -> month -> {actual, aim}; aims can drift, use latest known.
  const names = new Map<string, { aim: number | null; byMonth: Map<string, number> }>();
  for (const ev of evaluations) {
    for (const r of ev.rows.filter((x) => x.kind === "budget")) {
      const entry = names.get(r.name) ?? { aim: r.aim, byMonth: new Map() };
      entry.aim = r.aim ?? entry.aim;
      entry.byMonth.set(ev.month, r.actual);
      names.set(r.name, entry);
    }
  }
  const rows = [...names.entries()].sort((a, b) => a[0].localeCompare(b[0]));

  return (
    <main className="mx-auto w-full max-w-5xl grow px-4 pt-8 pb-24">
      <PageHeader
        title="Evaluation history"
        blurb="Every budget across months — the MFA/Budgets grid, computed from provider data. Cells color against the aim like the sheet did."
      />
      <p className="mt-3 font-mono text-xs">
        <a href="/evaluation" className="text-ink-soft underline hover:text-ink">
          ← single month view
        </a>
      </p>

      <div className="mt-6 overflow-x-auto rounded-md border border-rule bg-card shadow-[0_1px_2px_rgba(24,38,32,0.06)]">
        <table className="w-full border-collapse text-[13px]">
          <thead>
            <tr className="border-b border-rule">
              <th className="px-3 py-2 text-left font-mono text-[10px] tracking-widest text-ink-soft uppercase">
                budget
              </th>
              <th className="px-2 py-2 text-right font-mono text-[10px] tracking-widest text-ink-soft uppercase">
                aim
              </th>
              {months.map((m) => (
                <th
                  key={m}
                  className="px-2 py-2 text-right font-mono text-[10px] tracking-widest text-ink-soft uppercase"
                >
                  {m.slice(2)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(([name, data]) => (
              <tr key={name} className="border-b border-rule last:border-b-0">
                <td className="max-w-56 truncate px-3 py-1.5 font-medium">{name}</td>
                <td className="px-2 py-1.5 text-right font-mono text-ink-soft tabular-nums">
                  {data.aim != null && data.aim > 1 ? czk(data.aim) : "—"}
                </td>
                {months.map((m) => {
                  const v = data.byMonth.get(m);
                  return (
                    <td
                      key={m}
                      className={`px-2 py-1.5 text-right font-mono tabular-nums ${v != null ? cellStyle(v, data.aim) : "text-ink-soft/50"}`}
                    >
                      {v != null ? czk(v) : "·"}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-rule">
              <td className="px-3 py-2 font-semibold">BUDGET POINTS*</td>
              <td className="px-2 py-2 text-right font-mono text-ink-soft">100</td>
              {evaluations.map((e) => (
                <td key={e.month} className="px-2 py-2 text-right font-mono font-semibold tabular-nums">
                  {e.budgetPoints ?? "—"}
                </td>
              ))}
            </tr>
            <tr>
              <td className="px-3 py-1 font-semibold">BALANCE</td>
              <td />
              {evaluations.map((e) => (
                <td
                  key={e.month}
                  className={`px-2 py-1 text-right font-mono font-medium tabular-nums ${e.balance >= 0 ? "text-[#43a047]" : "text-[#e53935]"}`}
                >
                  {czk(e.balance)}
                </td>
              ))}
            </tr>
          </tfoot>
        </table>
      </div>
      <p className="mt-2 font-mono text-[11px] text-ink-soft">
        * provisional formula until the sheet formula is confirmed
      </p>
    </main>
  );
}
