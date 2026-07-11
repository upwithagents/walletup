import type { Proposal } from "@walletup/db";
import { prisma } from "@/lib/db";
import { decideProposal, undoDecision } from "./actions";

export const dynamic = "force-dynamic";

interface RecordData {
  recordType: "expense" | "income";
  amount: { value: number; currencyCode: string };
  recordDate: string;
  accountName: string;
  accountColor: string;
  counterParty: string | null;
  note: string | null;
  currentCategory: { name: string; color: string };
  labels: Array<{ name: string; color: string }>;
  paymentType: string | null;
  resolvedInProvider?: { category: string; note: string };
}

const KIND_LABEL: Record<string, string> = {
  categorize: "Categorize",
  delete_duplicate: "Delete",
  fix_category: "Recategorize",
  remove_label: "Remove label",
  open_question: "Question",
};

function parseRecord(p: Proposal): RecordData | null {
  if (!p.recordData) return null;
  try {
    return JSON.parse(p.recordData) as RecordData;
  } catch {
    return null;
  }
}

// Wallet formats amounts as "-CZK 7,018.00" — copied 1:1.
function walletAmount(value: number, currency: string): string {
  const abs = Math.abs(value).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${value < 0 ? "-" : ""}${currency} ${abs}`;
}

function categoryGlyph(name: string): string {
  const emoji = name.match(/\p{Extended_Pictographic}/u)?.[0];
  if (emoji) return emoji;
  if (/unknown|uncategorized/i.test(name)) return "?";
  return name[0]?.toUpperCase() ?? "?";
}

function StatusStamp({ status }: { status: string }) {
  if (status === "approved")
    return <span className="stamp text-approve">Approved</span>;
  if (status === "rejected")
    return <span className="stamp text-reject">Rejected</span>;
  if (status === "applied") return <span className="stamp text-ink">Applied</span>;
  return null;
}

function RecordSummary({ record }: { record: RecordData }) {
  return (
    <>
      {/* Category icon circle — gray "?" for unknown, category color otherwise */}
      <span
        className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white"
        style={{ backgroundColor: record.currentCategory.color }}
      >
        {categoryGlyph(record.currentCategory.name)}
      </span>

      <span className="min-w-0 flex-[1.2]">
        <span className="block truncate text-[15px] leading-snug font-semibold">
          {record.currentCategory.name}
        </span>
        <span className="block truncate text-xs text-ink-soft">
          {record.counterParty ?? record.note ?? "—"}
        </span>
      </span>

      <span className="hidden min-w-0 flex-1 items-center gap-1.5 sm:flex">
        <span
          className="size-2 shrink-0 rounded-full"
          style={{ backgroundColor: record.accountColor }}
        />
        <span className="truncate text-[13px] text-ink-soft">
          {record.accountName}
        </span>
      </span>

      <span className="hidden shrink-0 items-center gap-1 md:flex">
        {record.labels.map((l) => (
          <span
            key={l.name}
            className="max-w-32 truncate rounded-full px-2.5 py-0.5 text-[11px] font-medium text-white"
            style={{ backgroundColor: l.color }}
          >
            {l.name}
          </span>
        ))}
      </span>

      <span className="shrink-0 text-right">
        <span
          className={`block font-mono text-sm font-medium tabular-nums ${
            record.amount.value < 0 ? "text-[#e53935]" : "text-[#43a047]"
          }`}
        >
          {walletAmount(record.amount.value, record.amount.currencyCode)}
        </span>
        <span className="block text-[11px] text-ink-soft">
          {record.recordDate.slice(0, 10)}
        </span>
      </span>
    </>
  );
}

function ProposalRow({ proposal }: { proposal: Proposal }) {
  const record = parseRecord(proposal);
  const decided = proposal.status !== "proposal";
  const isQuestion = proposal.kind === "open_question";
  const resolved = record?.resolvedInProvider;

  return (
    <details
      className={`proposal border-t border-rule first:border-t-0 ${decided ? "bg-card-done" : ""}`}
    >
      <summary className="flex items-center gap-3 px-4 py-2.5 hover:bg-approve-soft/40">
        {record ? (
          <RecordSummary record={record} />
        ) : (
          <span className="min-w-0 flex-1">
            <span className="block text-[15px] leading-snug font-semibold">
              {proposal.title}
            </span>
            <span className="block truncate text-xs text-ink-soft">
              {proposal.detail}
            </span>
          </span>
        )}
        <span className="flex shrink-0 items-center gap-2 pl-1">
          <StatusStamp status={proposal.status} />
          <span className="expand-hint font-mono text-sm text-ink-soft" />
        </span>
      </summary>

      <div className="border-t border-dashed border-rule px-4 pt-3 pb-4 sm:pl-16">
        <p className="text-sm">
          <span className="mr-2 rounded border border-rule bg-card px-1.5 py-0.5 font-mono text-[10px] tracking-widest uppercase">
            {KIND_LABEL[proposal.kind] ?? proposal.kind}
          </span>
          {proposal.proposedAction}
        </p>
        {resolved ? (
          <p className="mt-2 text-[13px] font-medium text-attention">
            Already resolved in Wallet as “{resolved.category}” — {resolved.note}.
            Approve to confirm (and optionally refine), or reject as moot.
          </p>
        ) : null}
        <p className="mt-2 max-w-prose text-[13px] text-ink-soft">
          <span className="font-mono text-[10px] tracking-widest uppercase">
            evidence ·{" "}
          </span>
          {proposal.evidence}
        </p>
        {decided && proposal.reviewNote ? (
          <p className="mt-1 text-[13px] text-ink-soft italic">
            note: {proposal.reviewNote}
          </p>
        ) : null}
        {proposal.walletRecordId ? (
          <p className="mt-1 font-mono text-[11px] text-ink-soft/70">
            record {proposal.walletRecordId} · {proposal.section} ·{" "}
            {proposal.confidence.replace("_", " ")} confidence
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
    include: { proposals: true },
  });

  const proposals = runs.flatMap((r) => r.proposals);
  const open = proposals.filter((p) => p.status === "proposal").length;
  const approved = proposals.filter((p) => p.status === "approved").length;
  const rejected = proposals.filter((p) => p.status === "rejected").length;
  const applied = proposals.filter((p) => p.status === "applied").length;

  return (
    <main className="mx-auto w-full max-w-3xl grow px-4 pt-8 pb-24">
      <header>
        <p className="font-mono text-[11px] tracking-[0.2em] text-ink-soft uppercase">
          WalletUp
        </p>
        <h1 className="font-display mt-1 text-4xl font-semibold tracking-tight">
          Review desk
        </h1>
        <p className="mt-3 max-w-prose text-sm text-ink-soft">
          Oldest first, the way you work through records in Wallet. Nothing
          touches the provider until you approve — every decision teaches the
          agent.
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

      {runs.map((run) => {
        // Oldest → newest by provider record date; batch-level questions last.
        const withRecord = run.proposals
          .filter((p) => p.recordData)
          .sort((a, b) => {
            const da = (JSON.parse(a.recordData!) as RecordData).recordDate;
            const db = (JSON.parse(b.recordData!) as RecordData).recordDate;
            return da.localeCompare(db);
          });
        const questions = run.proposals.filter((p) => !p.recordData);

        return (
          <section key={run.id} className="mt-8">
            <div className="flex items-baseline justify-between gap-4">
              <h2 className="font-display text-xl font-medium">{run.type} run</h2>
              <p className="font-mono text-xs text-ink-soft">
                {run.runDate.toISOString().slice(0, 10)}
              </p>
            </div>
            {run.summary ? (
              <p className="mt-1 max-w-prose text-[13px] text-ink-soft">
                {run.summary}
              </p>
            ) : null}

            <div className="mt-4 overflow-hidden rounded-md border border-rule bg-card shadow-[0_1px_2px_rgba(24,38,32,0.06)]">
              {withRecord.map((p) => (
                <ProposalRow key={p.id} proposal={p} />
              ))}
            </div>

            {questions.length > 0 ? (
              <div className="mt-6">
                <h3 className="mb-2 font-mono text-[11px] tracking-[0.18em] text-ink-soft uppercase">
                  Questions without a record
                </h3>
                <div className="overflow-hidden rounded-md border border-rule bg-card shadow-[0_1px_2px_rgba(24,38,32,0.06)]">
                  {questions.map((p) => (
                    <ProposalRow key={p.id} proposal={p} />
                  ))}
                </div>
              </div>
            ) : null}
          </section>
        );
      })}
    </main>
  );
}
