/**
 * Categorization propose-pipeline (plan 01 phase A, automated).
 *
 * Pulls uncategorized records from the provider, searches each merchant's
 * history for how it was categorized before, and drafts proposals (with
 * record snapshots for the Wallet-style UI) into a new AgentRun in the
 * shared review queue. READ-ONLY against the provider; the human decides
 * in the app or Discord, and a separate apply step executes.
 */

import { prisma } from "@walletup/db";
import { WalletProvider } from "@walletup/provider-wallet";
import { extractTokens, rankVotes, type CategoryVote } from "./tokens.ts";

interface ProviderRecord {
  id: string;
  accountId: string;
  accountName: string;
  amount: { value: number; currencyCode: string };
  recordDate: string;
  recordType: string;
  note?: string;
  counterParty?: string;
  paymentType?: string;
  category: { id: string; name: string; color: string };
  labels: Array<{ id: string; name: string; color: string }>;
}

export interface DraftProposal {
  section: string;
  kind: string;
  walletRecordId: string;
  title: string;
  detail: string;
  proposedAction: string;
  actionData: string | null;
  evidence: string;
  recordData: string;
  confidence: string;
}

const UNKNOWN_CATEGORY_IDS = new Set([
  "5c5c32c8-0082-8000-8000-000000000000",
  "5c5c32c9-0082-8000-8000-000000000000",
  "5c5c4e23-00c8-8000-8000-000000000000",
]);

function searchText(record: ProviderRecord): string {
  return record.counterParty ?? record.note ?? "";
}

async function historyVotes(
  wallet: WalletProvider,
  record: ProviderRecord,
): Promise<{ votes: CategoryVote[]; tokens: string[] }> {
  const tokens = extractTokens(searchText(record), 2);
  if (tokens.length === 0) return { votes: [], tokens };

  const field = record.counterParty ? "counterParty" : "note";
  const { records } = await wallet.getRecords({
    [field]: `contains-i.${tokens[0]}`,
    limit: 50,
    sortBy: ["-recordDate"],
  });

  const votes = new Map<string, CategoryVote>();
  for (const raw of records as unknown as ProviderRecord[]) {
    if (raw.id === record.id) continue;
    if (UNKNOWN_CATEGORY_IDS.has(raw.category.id)) continue;
    // require the second token too when we have one (precision over recall)
    if (tokens[1]) {
      const hay = `${raw.counterParty ?? ""} ${raw.note ?? ""}`.toLowerCase();
      if (!hay.includes(tokens[1])) continue;
    }
    const v = votes.get(raw.category.id) ?? {
      categoryId: raw.category.id,
      categoryName: raw.category.name,
      count: 0,
      lastSeen: raw.recordDate,
    };
    v.count += 1;
    if (raw.recordDate > v.lastSeen) v.lastSeen = raw.recordDate;
    votes.set(raw.category.id, v);
  }
  return { votes: [...votes.values()], tokens };
}

function recordSnapshot(record: ProviderRecord, accountColor: string): string {
  return JSON.stringify({
    recordType: record.recordType,
    amount: record.amount,
    recordDate: record.recordDate,
    accountName: record.accountName,
    accountColor,
    counterParty: record.counterParty ?? null,
    note: record.note ?? null,
    currentCategory: { name: record.category.name, color: record.category.color },
    labels: record.labels.map((l) => ({ name: l.name, color: l.color })),
    paymentType: record.paymentType ?? null,
  });
}

export interface RunResult {
  drafts: DraftProposal[];
  skippedExisting: number;
  backlogTotal: number;
}

export async function buildProposals(wallet: WalletProvider): Promise<RunResult> {
  const { records } = (await wallet.uncategorized("2000-01-01")) as unknown as {
    records: ProviderRecord[];
  };

  // Don't re-propose records that already sit in the queue undecided/decided.
  const existing = await prisma.proposal.findMany({
    where: { walletRecordId: { in: records.map((r) => r.id) } },
    select: { walletRecordId: true },
  });
  const covered = new Set(existing.map((e) => e.walletRecordId));
  const fresh = records.filter((r) => !covered.has(r.id));

  // account colors for snapshots
  const accountColor = new Map<string, string>();
  let offset = 0;
  for (;;) {
    const page = await wallet.getAccounts({ limit: 20, offset });
    for (const a of page.accounts as unknown as Array<{ id: string; color?: string }>) {
      accountColor.set(a.id, a.color ?? "#5f7c8a");
    }
    if (page.nextOffset == null) break;
    offset = page.nextOffset;
  }

  const drafts: DraftProposal[] = [];
  for (const record of fresh) {
    const { votes, tokens } = await historyVotes(wallet, record);
    const ranked = rankVotes(votes);
    const merchant = searchText(record) || "(no note)";
    const snapshot = recordSnapshot(record, accountColor.get(record.accountId) ?? "#5f7c8a");

    if (ranked.best) {
      drafts.push({
        section: ranked.confidence === "high" ? "High confidence" : "Medium confidence",
        kind: "categorize",
        walletRecordId: record.id,
        title: `${merchant} — ${record.amount.value} ${record.amount.currencyCode}`,
        detail: `${record.recordDate.slice(0, 10)} • ${record.accountName}`,
        proposedAction: `Categorize as ${ranked.best.categoryName}`,
        actionData: JSON.stringify({
          categoryId: ranked.best.categoryId,
          categoryName: ranked.best.categoryName,
        }),
        evidence:
          `History match on "${tokens.join(" ")}": ${ranked.best.count} of ${ranked.total} ` +
          `prior categorized record(s) are ${ranked.best.categoryName} ` +
          `(last ${ranked.best.lastSeen.slice(0, 10)}).`,
        recordData: snapshot,
        confidence: ranked.confidence,
      });
    } else {
      drafts.push({
        section: "Needs your decision",
        kind: "open_question",
        walletRecordId: record.id,
        title: `${merchant} — ${record.amount.value} ${record.amount.currencyCode}`,
        detail: `${record.recordDate.slice(0, 10)} • ${record.accountName}`,
        proposedAction:
          "No categorized history for this merchant — what is it? Answer in the note.",
        actionData: null,
        evidence: tokens.length
          ? `No prior categorized records matching "${tokens.join(" ")}".`
          : "Record has no note or counterparty to match on.",
        recordData: snapshot,
        confidence: "needs_input",
      });
    }
  }

  return { drafts, skippedExisting: covered.size, backlogTotal: records.length };
}

export async function persistRun(drafts: DraftProposal[], summary: string) {
  return prisma.agentRun.create({
    data: {
      runDate: new Date(),
      type: "categorization",
      summary,
      proposals: { create: drafts },
    },
  });
}
