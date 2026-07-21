/**
 * WalletUp channel adapter — the walletup-specific MCP tools (memory,
 * proposal review) layered onto updiscord's generic adapter (reply,
 * read_channel, HTTP bridge, ready-signaling).
 */

import { z } from "zod";
import { runAdapter, type AdapterTool } from "updiscord/adapter";
import { prisma } from "@walletup/db";
import { recall, remember, rememberProposalDecision } from "@walletup/memory";

const tools: AdapterTool[] = [
  {
    name: "remember",
    description:
      "Save a memory to the shared WalletUp knowledge store. Use for durable facts the user tells you, session notes worth keeping, and feedback about your work.",
    schema: {
      kind: z.enum(["fact", "session_note", "feedback"]),
      content: z.string(),
      tags: z.array(z.string()).optional(),
    },
    handler: async ({ kind, content, tags }) => {
      const m = await remember({
        kind: kind as "fact" | "session_note" | "feedback",
        content: content as string,
        source: "discord",
        tags: tags as string[] | undefined,
      });
      return `Remembered (${m.id}).`;
    },
  },
  {
    name: "recall",
    description:
      "Search the shared WalletUp knowledge store (facts, session notes, review feedback from both Discord and the app).",
    schema: {
      query: z.string().describe("1-4 keywords; all must match"),
      kind: z.enum(["fact", "session_note", "feedback"]).optional(),
      limit: z.number().optional(),
    },
    handler: async ({ query, kind, limit }) => {
      const results = await recall(query as string, {
        kind: kind as "fact" | "session_note" | "feedback" | undefined,
        limit: limit as number | undefined,
      });
      if (results.length === 0) return "(no matching memories)";
      const lines = results.map(
        (m) => `- [${m.kind}|${m.source}|${m.createdAt.toISOString().slice(0, 10)}] ${m.content}`,
      );
      return lines.join("\n");
    },
  },
  {
    name: "list_proposals",
    description: "List agent proposals from the review queue (shared with the web app).",
    schema: {
      status: z.enum(["proposal", "approved", "rejected", "applied"]).optional()
        .describe("Filter by status; omit for all"),
    },
    handler: async ({ status }) => {
      const proposals = await prisma.proposal.findMany({
        where: status ? { status: status as string } : undefined,
        orderBy: { createdAt: "asc" },
      });
      if (proposals.length === 0) return "(no proposals)";
      const lines = proposals.map(
        (p, i) =>
          `${i + 1}. [${p.status}] (${p.kind}) ${p.title} — ${p.proposedAction}` +
          (p.reviewNote ? ` | note: ${p.reviewNote}` : "") +
          ` | id: ${p.id}`,
      );
      return lines.join("\n");
    },
  },
  {
    name: "decide_proposal",
    description:
      "Record the user's decision on a proposal — ONLY when the user explicitly said so in Discord. Approving an open_question requires their answer as the note. This never writes to the finance provider; it updates the shared review queue.",
    schema: {
      id: z.string().describe("Proposal id (from list_proposals)"),
      decision: z.enum(["approved", "rejected"]),
      note: z.string().optional().describe("User's note/answer, verbatim where possible"),
    },
    handler: async ({ id, decision, note }) => {
      const proposal = await prisma.proposal.findUnique({ where: { id: id as string } });
      if (!proposal) return `Error: proposal ${id} not found`;
      if (proposal.status === "applied") return "Error: already applied — cannot change";
      if (proposal.kind === "open_question" && decision === "approved" && !note) {
        return "Error: an open question needs the user's answer in the note";
      }
      await prisma.proposal.update({
        where: { id: id as string },
        data: { status: decision as string, reviewNote: (note as string) ?? null, reviewedAt: new Date() },
      });
      await rememberProposalDecision(proposal, decision as "approved" | "rejected", (note as string) ?? null, "discord");
      return `Proposal ${decision}: ${proposal.title}`;
    },
  },
];

await runAdapter({ name: "walletup-adapter", extraTools: tools });
