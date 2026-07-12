import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

const STATUS_STYLE: Record<string, string> = {
  pass: "bg-approve-soft text-approve",
  warn: "bg-attention-soft text-attention",
  fail: "bg-reject-soft text-reject",
};

export default async function ChecksPage() {
  const runs = await prisma.checkRun.findMany({
    orderBy: { runDate: "desc" },
    take: 10,
    include: { results: true },
  });
  const latest = runs[0];

  return (
    <main className="mx-auto w-full max-w-3xl grow px-4 pt-8 pb-24">
      <header>
        <p className="font-mono text-[11px] tracking-[0.2em] text-ink-soft uppercase">
          WalletUp
        </p>
        <h1 className="font-display mt-1 text-4xl font-semibold tracking-tight">
          Checks
        </h1>
        <p className="mt-3 max-w-prose text-sm text-ink-soft">
          The sheet&apos;s manual health checks, run as a program. Detections are
          read-only; remedies stay with you (for now).
        </p>
      </header>

      {!latest ? (
        <p className="mt-12 border-t border-rule pt-8 text-sm text-ink-soft">
          No check runs yet. Run{" "}
          <code className="font-mono text-xs">pnpm --filter @walletup/agent checks</code>
          .
        </p>
      ) : (
        <>
          <p className="mt-6 font-mono text-xs text-ink-soft">
            latest run {latest.runDate.toISOString().replace("T", " ").slice(0, 16)} ·{" "}
            {latest.results.filter((r) => r.status === "fail").length} fail ·{" "}
            {latest.results.filter((r) => r.status === "warn").length} warn ·{" "}
            {latest.results.filter((r) => r.status === "pass").length} pass
          </p>
          <div className="mt-3 overflow-hidden rounded-md border border-rule bg-card shadow-[0_1px_2px_rgba(24,38,32,0.06)]">
            {latest.results.map((r) => (
              <div key={r.id} className="border-t border-rule px-4 py-3 first:border-t-0">
                <div className="flex items-center gap-3">
                  <span
                    className={`rounded px-2 py-0.5 font-mono text-[10px] font-medium tracking-widest uppercase ${STATUS_STYLE[r.status] ?? ""}`}
                  >
                    {r.status}
                  </span>
                  <span className="text-[15px] font-medium">{r.name}</span>
                </div>
                <p className="mt-1.5 text-[13px] text-ink-soft">{r.evidence}</p>
                {r.remedy && r.status !== "pass" ? (
                  <p className="mt-1 text-[13px]">
                    <span className="font-mono text-[10px] tracking-widest text-ink-soft uppercase">
                      remedy ·{" "}
                    </span>
                    {r.remedy}
                  </p>
                ) : null}
              </div>
            ))}
          </div>

          {runs.length > 1 ? (
            <p className="mt-6 font-mono text-xs text-ink-soft">
              history:{" "}
              {runs
                .slice(1)
                .map(
                  (r) =>
                    `${r.runDate.toISOString().slice(5, 10)} (${r.results.filter((x) => x.status === "fail").length}F/${r.results.filter((x) => x.status === "warn").length}W)`,
                )
                .join(" · ")}
            </p>
          ) : null}
        </>
      )}
    </main>
  );
}
