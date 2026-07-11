import { prisma, type Memory, type Proposal } from "@walletup/db";

export type MemoryKind = "fact" | "session_note" | "feedback";
export type MemorySource = "discord" | "app" | "claude_session" | "seed";

export interface RememberInput {
  kind: MemoryKind;
  content: string;
  source: MemorySource;
  tags?: string[];
}

export async function remember(input: RememberInput): Promise<Memory> {
  return prisma.memory.create({
    data: {
      kind: input.kind,
      content: input.content,
      source: input.source,
      tags: input.tags?.join(",") || null,
    },
  });
}

export interface RecallOptions {
  tags?: string[];
  kind?: MemoryKind;
  limit?: number;
}

// Term-AND substring search over content+tags, newest first.
// Good enough for v1; swap for SQLite FTS5 when volume demands it.
export async function recall(
  query: string,
  opts: RecallOptions = {},
): Promise<Memory[]> {
  const terms = query.split(/\s+/).filter(Boolean);
  return prisma.memory.findMany({
    where: {
      archived: false,
      ...(opts.kind ? { kind: opts.kind } : {}),
      AND: [
        ...terms.map((t) => ({
          OR: [{ content: { contains: t } }, { tags: { contains: t } }],
        })),
        ...(opts.tags ?? []).map((t) => ({ tags: { contains: t } })),
      ],
    },
    orderBy: { createdAt: "desc" },
    take: opts.limit ?? 10,
  });
}

export async function recent(limit = 20): Promise<Memory[]> {
  return prisma.memory.findMany({
    where: { archived: false },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

// --- Proposal-decision feedback -------------------------------------------
// Every review decision (from any surface) becomes a feedback memory so
// agents can learn from it. Undo archives the memory again.

function proposalTag(proposalId: string) {
  return `proposal:${proposalId}`;
}

export async function rememberProposalDecision(
  proposal: Proposal,
  decision: "approved" | "rejected",
  note: string | null,
  source: MemorySource,
): Promise<Memory> {
  const content =
    `${decision.toUpperCase()} [${proposal.kind}] ${proposal.title} — ` +
    `proposed: ${proposal.proposedAction}` +
    (note ? ` — user note: ${note}` : "");
  return remember({
    kind: "feedback",
    content,
    source,
    tags: [proposalTag(proposal.id), proposal.kind, decision],
  });
}

export async function archiveProposalDecision(proposalId: string): Promise<number> {
  const res = await prisma.memory.updateMany({
    where: { kind: "feedback", tags: { contains: proposalTag(proposalId) } },
    data: { archived: true },
  });
  return res.count;
}
