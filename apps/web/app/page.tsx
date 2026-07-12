import Link from "next/link";
import { prisma } from "@/lib/db";
import { Card, PageHeader } from "./manage/ui";

export const dynamic = "force-dynamic";

interface Event {
  at: Date;
  kind: string;
  text: string;
}

export default async function Dashboard() {
  const [
    waiting,
    approved,
    latestCheck,
    latestEval,
    memories,
    decidedProposals,
    checkRuns,
    openTodos,
    setAsideItems,
  ] = await Promise.all([
    prisma.proposal.count({ where: { status: "proposal" } }),
    prisma.proposal.count({ where: { status: "approved" } }),
    prisma.checkRun.findFirst({ orderBy: { runDate: "desc" }, include: { results: true } }),
    prisma.monthEvaluation.findFirst({ orderBy: { month: "desc" } }),
    prisma.memory.findMany({ where: { archived: false }, orderBy: { createdAt: "desc" }, take: 8 }),
    prisma.proposal.findMany({
      where: { reviewedAt: { not: null } },
      orderBy: { reviewedAt: "desc" },
      take: 5,
    }),
    prisma.checkRun.findMany({ orderBy: { runDate: "desc" }, take: 3, include: { results: true } }),
    prisma.todo.count({ where: { status: { not: "done" } } }),
    prisma.setAsideItem.findMany(),
  ]);

  const failCount = latestCheck?.results.filter((r) => r.status === "fail").length ?? 0;
  const monthlySetAside = setAsideItems.reduce((s, i) => s + (i.monthlyAmount ?? 0), 0);

  const events: Event[] = [
    ...memories.map((m) => ({
      at: m.createdAt,
      kind: `${m.kind} · ${m.source}`,
      text: m.content.slice(0, 160),
    })),
    ...decidedProposals.map((p) => ({
      at: p.reviewedAt!,
      kind: `proposal ${p.status}`,
      text: p.title,
    })),
    ...checkRuns.map((r) => ({
      at: r.runDate,
      kind: "check run",
      text: `${r.results.filter((x) => x.status === "fail").length} fail / ${r.results.filter((x) => x.status === "warn").length} warn / ${r.results.filter((x) => x.status === "pass").length} pass`,
    })),
  ]
    .sort((a, b) => b.at.getTime() - a.at.getTime())
    .slice(0, 14);

  const tools: Array<[string, string, string]> = [
    ["/review", "Review desk", `${waiting} waiting${approved ? ` · ${approved} approved to apply` : ""}`],
    ["/evaluation", "Month evaluation", latestEval ? `${latestEval.month}: ${latestEval.budgetPoints ?? "—"} pts` : "no data yet"],
    ["/checks", "Checks", latestCheck ? `${failCount} failing` : "no runs yet"],
    ["/accounts", "Accounts", "live balances"],
    ["/set-aside", "Set-Aside", `${monthlySetAside.toLocaleString("en-US")} CZK/month`],
    ["/procedures", "Procedures", "checks + distributions"],
    ["/todos", "TODO", `${openTodos} open`],
    ["/tips", "Tips", "presentation notes"],
    ["/mappings", "Categories & Labels", "provider mapping"],
  ];

  return (
    <main className="mx-auto w-full max-w-4xl grow px-4 pt-8 pb-24">
      <PageHeader
        title="Dashboard"
        blurb="Your financial system of record — agents propose, you decide, everything is logged."
      />

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {tools.map(([href, name, sub]) => (
          <Link key={href} href={href} className="group">
            <Card>
              <p className="text-[15px] font-semibold group-hover:underline">{name}</p>
              <p className="mt-0.5 font-mono text-xs text-ink-soft">{sub}</p>
            </Card>
          </Link>
        ))}
      </div>

      <h3 className="mt-10 mb-2 font-mono text-[11px] tracking-[0.18em] text-ink-soft uppercase">
        What happened when
      </h3>
      <Card>
        {events.length === 0 ? (
          <p className="py-2 text-sm text-ink-soft">No activity yet.</p>
        ) : (
          events.map((e, i) => (
            <div key={i} className="flex items-baseline gap-3 border-t border-rule py-2 first:border-t-0">
              <span className="w-28 shrink-0 font-mono text-[11px] text-ink-soft">
                {e.at.toISOString().replace("T", " ").slice(5, 16)}
              </span>
              <span className="w-36 shrink-0 font-mono text-[10px] tracking-widest text-ink-soft uppercase">
                {e.kind}
              </span>
              <span className="min-w-0 flex-1 text-[13px]">{e.text}</span>
            </div>
          ))
        )}
      </Card>
    </main>
  );
}
