import type { Proposal } from "@walletup/db";
import { prisma } from "@/lib/db";
import { decideProposal, undoDecision } from "./actions";

export const dynamic = "force-dynamic";

const SECTION_ORDER = [
  "High confidence",
  "Medium confidence (Slovakia trip)",
  "Probable duplicates (delete)",
  "Needs your decision",
  "Bonus fixes",
];

const KIND_LABEL: Record<string, string> = {
  categorize: "Categorize",
  delete_duplicate: "Delete",
  fix_category: "Recategorize",
  remove_label: "Remove label",
  open_question: "Question",
};

function sectionRank(name: string) {
  const i = SECTION_ORDER.indexOf(name);
  return i === -1 ? SECTION_ORDER.length : i;
}

function ConfidenceMark({ confidence }: { confidence: string }) {
  const styles: Record<string, string> = {
    high: "bg-approve",
    medium: "bg-attention",
    low: "bg-reject",
    needs_input: "bg-attention",
  };
  return (
    <span
      className={`mt-2 inline-block size-2 shrink-0 rounded-full ${styles[confidence] ?? "bg-ink-soft"}`}
      title={`confidence: ${confidence.replace("_", " ")}`}
    />
  );
}

function StatusStamp({ status }: { status: string }) {
  if (status === "approved")
    return <span className="stamp text-approve">Approved</span>;
  if (status === "rejected")
    return <span className="stamp text-reject">Rejected</span>;
  if (status === "applied")
    return <span className="stamp text-ink">Applied</span>;
  return null;
}

function ProposalRow({ proposal }: { proposal: Proposal }) {
  const decided = proposal.status !== "proposal";
  const isQuestion = proposal.kind === "open_question";

  return (
    <details
      className={`proposal border-t border-rule first:border-t-0 ${decided ? "bg-card-done" : ""}`}
    >
      <summary className="flex items-start gap-3 px-4 py-3 hover:bg-approve-soft/40">
        <ConfidenceMark confidence={proposal.confidence} />
        <span className="min-w-0 flex-1">
          <span
            className={`block text-[15px] leading-snug font-medium ${proposal.status === "rejected" ? "text-ink-soft line-through decoration-reject/70" : ""}`}
          >
            {proposal.title}
          </span>
          <span className="mt-0.5 block font-mono text-xs text-ink-soft">
            {proposal.detail}
          </span>
          {decided && proposal.reviewNote ? (
            <span className="mt-1 block text-xs text-ink-soft italic">
              note: {proposal.reviewNote}
            </span>
          ) : null}
        </span>
        <span className="flex shrink-0 items-center gap-3 pt-0.5">
          <span className="hidden font-mono text-[10px] tracking-widest text-ink-soft uppercase sm:inline">
            {KIND_LABEL[proposal.kind] ?? proposal.kind}
          </span>
          <StatusStamp status={proposal.status} />
          <span className="expand-hint font-mono text-sm text-ink-soft" />
        </span>
      </summary>

      <div className="border-t border-dashed border-rule px-4 pt-3 pb-4 pl-9">
        <p className="text-sm">{proposal.proposedAction}</p>
        <p className="mt-2 max-w-prose text-[13px] text-ink-soft">
          <span className="font-mono text-[10px] tracking-widest uppercase">
            evidence ·{" "}
          </span>
          {proposal.evidence}
        </p>
        {proposal.walletRecordId ? (
          <p className="mt-1 font-mono text-[11px] text-ink-soft/70">
            record {proposal.walletRecordId}
          </p>
        ) : null}

        {decided ? (
          <form action={undoDecision} className="mt-3">
            <input type="hidden" name="id" value={proposal.id} />
            <button
              type="submit"
              className="rounded border border-rule bg-card px-3 py-1 text-xs font-medium hover:border-ink-soft"
            >
              Undo decision
            </button>
          </form>
        ) : (
          <form action={decideProposal} className="mt-3 flex flex-col gap-2">
            <input type="hidden" name="id" value={proposal.id} />
            <textarea
              name="note"
              rows={2}
              required={isQuestion}
              placeholder={
                isQuestion
                  ? "Your answer (required — this decides the question)"
                  : "Note (optional — becomes a learning note for the agent)"
              }
              className="w-full max-w-xl rounded border border-rule bg-card px-2 py-1.5 text-sm placeholder:text-ink-soft/60"
            />
            <div className="flex gap-2">
              <button
                type="submit"
                name="decision"
                value="approved"
                className="rounded bg-approve px-4 py-1.5 text-sm font-medium text-card hover:bg-approve/90"
              >
                {isQuestion ? "Answer & approve" : "Approve"}
              </button>
              <button
                type="submit"
                name="decision"
                value="rejected"
                formNoValidate={!isQuestion}
                className="rounded border border-reject/50 px-4 py-1.5 text-sm font-medium text-reject hover:bg-reject-soft"
              >
                {isQuestion ? "Dismiss question" : "Reject"}
              </button>
            </div>
          </form>
        )}
      </div>
    </details>
  );
}

export default async function ReviewPage() {
  const runs = await prisma.agentRun.findMany({
    orderBy: { runDate: "desc" },
    include: { proposals: { orderBy: { createdAt: "asc" } } },
  });

  const proposals = runs.flatMap((r) => r.proposals);
  const open = proposals.filter((p) => p.status === "proposal").length;
  const approved = proposals.filter((p) => p.status === "approved").length;
  const rejected = proposals.filter((p) => p.status === "rejected").length;
  const applied = proposals.filter((p) => p.status === "applied").length;

  return (
    <main className="mx-auto w-full max-w-3xl grow px-4 pt-10 pb-24">
      <header>
        <p className="font-mono text-[11px] tracking-[0.2em] text-ink-soft uppercase">
          WalletUp
        </p>
        <h1 className="font-display mt-1 text-4xl font-semibold tracking-tight">
          Review desk
        </h1>
        <p className="mt-3 max-w-prose text-sm text-ink-soft">
          Proposals from agent runs wait here for your counter-signature.
          Nothing touches the finance provider until you approve it — and
          every decision teaches the agent.
        </p>
        <p data-testid="counters" className="mt-4 font-mono text-xs text-ink-soft">
          <span className="text-ink">{open} waiting</span>
          {" · "}
          <span className="text-approve">{approved} approved</span>
          {" · "}
          <span className="text-reject">{rejected} rejected</span>
          {" · "}
          {applied} applied
        </p>
      </header>

      {runs.length === 0 ? (
        <p className="mt-16 border-t border-rule pt-8 text-sm text-ink-soft">
          The desk is clear. Run a categorization sweep to bring in the next
          batch of proposals.
        </p>
      ) : (
        runs.map((run) => {
          const sections = [...new Set(run.proposals.map((p) => p.section))].sort(
            (a, b) => sectionRank(a) - sectionRank(b),
          );
          return (
            <section key={run.id} className="mt-10">
              <div className="flex items-baseline justify-between gap-4">
                <h2 className="font-display text-xl font-medium">
                  {run.type} run
                </h2>
                <p className="font-mono text-xs text-ink-soft">
                  {run.runDate.toISOString().slice(0, 10)}
                </p>
              </div>
              {run.summary ? (
                <p className="mt-1 max-w-prose text-[13px] text-ink-soft">
                  {run.summary}
                </p>
              ) : null}

              {sections.map((section) => (
                <div key={section} className="mt-6">
                  <h3 className="mb-2 font-mono text-[11px] tracking-[0.18em] text-ink-soft uppercase">
                    {section}
                  </h3>
                  <div className="overflow-hidden rounded-md border border-rule bg-card shadow-[0_1px_2px_rgba(24,38,32,0.06)]">
                    {run.proposals
                      .filter((p) => p.section === section)
                      .map((p) => (
                        <ProposalRow key={p.id} proposal={p} />
                      ))}
                  </div>
                </div>
              ))}
            </section>
          );
        })
      )}
    </main>
  );
}
