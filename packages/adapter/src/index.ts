/**
 * WalletUp channel adapter — MCP server bridging a Claude Code agent and the hub.
 *
 * Talks MCP JSON-RPC to Claude over stdio and HTTP to the hub. Database
 * access (memory, proposals) is direct — same SQLite file as the app.
 *
 * Stdout is reserved for MCP. ALL logging goes to stderr.
 */

import http from "node:http";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { prisma } from "@walletup/db";
import { recall, remember, rememberProposalDecision } from "@walletup/memory";

const HUB_URL = process.env.HUB_URL;
const AGENT_ID = process.env.AGENT_ID;
const AGENT_PORT = Number(process.env.AGENT_PORT);

if (!HUB_URL || !AGENT_ID || !AGENT_PORT) {
  console.error("[adapter] missing required env: HUB_URL, AGENT_ID, AGENT_PORT");
  process.exit(1);
}

const server = new McpServer(
  { name: "walletup-adapter", version: "0.0.1" },
  { capabilities: { experimental: { "claude/channel": {} } } },
);

function text(t: string) {
  return { content: [{ type: "text" as const, text: t }] };
}

server.tool(
  "reply",
  "Send a message to a Discord channel. This is your ONLY way to talk to the user — use it for every response to <channel> messages.",
  {
    channel: z.string().describe("The channel_id from the <channel> tag"),
    content: z.string().describe("Your message (Discord markdown, max ~1900 chars per message)"),
  },
  async ({ channel, content }) => {
    const res = await fetch(`${HUB_URL}/agents/${AGENT_ID}/reply`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ channel_id: channel, content }),
    });
    if (!res.ok) {
      const t = await res.text();
      console.error(`[adapter] reply failed: ${res.status} ${t}`);
      return text(`Error: ${t}`);
    }
    return text("Reply sent.");
  },
);

server.tool(
  "read_channel",
  "Read recent messages from a Discord channel (from the hub's audit log).",
  {
    channel_id: z.string(),
    limit: z.number().optional().describe("Default 30, max 100"),
  },
  async ({ channel_id, limit }) => {
    const messages = await prisma.channelMessage.findMany({
      where: { channelId: channel_id },
      orderBy: { createdAt: "desc" },
      take: Math.min(limit ?? 30, 100),
    });
    const lines = messages
      .reverse()
      .map((m) => `[${m.createdAt.toISOString()}] ${m.authorName}: ${m.content}`);
    return text(lines.join("\n") || "(no messages logged yet)");
  },
);

server.tool(
  "remember",
  "Save a memory to the shared WalletUp knowledge store. Use for durable facts the user tells you, session notes worth keeping, and feedback about your work.",
  {
    kind: z.enum(["fact", "session_note", "feedback"]),
    content: z.string(),
    tags: z.array(z.string()).optional(),
  },
  async ({ kind, content, tags }) => {
    const m = await remember({ kind, content, source: "discord", tags });
    return text(`Remembered (${m.id}).`);
  },
);

server.tool(
  "recall",
  "Search the shared WalletUp knowledge store (facts, session notes, review feedback from both Discord and the app).",
  {
    query: z.string().describe("1-4 keywords; all must match"),
    kind: z.enum(["fact", "session_note", "feedback"]).optional(),
    limit: z.number().optional(),
  },
  async ({ query, kind, limit }) => {
    const results = await recall(query, { kind, limit });
    if (results.length === 0) return text("(no matching memories)");
    const lines = results.map(
      (m) => `- [${m.kind}|${m.source}|${m.createdAt.toISOString().slice(0, 10)}] ${m.content}`,
    );
    return text(lines.join("\n"));
  },
);

server.tool(
  "list_proposals",
  "List agent proposals from the review queue (shared with the web app).",
  {
    status: z.enum(["proposal", "approved", "rejected", "applied"]).optional()
      .describe("Filter by status; omit for all"),
  },
  async ({ status }) => {
    const proposals = await prisma.proposal.findMany({
      where: status ? { status } : undefined,
      orderBy: { createdAt: "asc" },
    });
    if (proposals.length === 0) return text("(no proposals)");
    const lines = proposals.map(
      (p, i) =>
        `${i + 1}. [${p.status}] (${p.kind}) ${p.title} — ${p.proposedAction}` +
        (p.reviewNote ? ` | note: ${p.reviewNote}` : "") +
        ` | id: ${p.id}`,
    );
    return text(lines.join("\n"));
  },
);

server.tool(
  "decide_proposal",
  "Record the user's decision on a proposal — ONLY when the user explicitly said so in Discord. Approving an open_question requires their answer as the note. This never writes to the finance provider; it updates the shared review queue.",
  {
    id: z.string().describe("Proposal id (from list_proposals)"),
    decision: z.enum(["approved", "rejected"]),
    note: z.string().optional().describe("User's note/answer, verbatim where possible"),
  },
  async ({ id, decision, note }) => {
    const proposal = await prisma.proposal.findUnique({ where: { id } });
    if (!proposal) return text(`Error: proposal ${id} not found`);
    if (proposal.status === "applied") return text("Error: already applied — cannot change");
    if (proposal.kind === "open_question" && decision === "approved" && !note) {
      return text("Error: an open question needs the user's answer in the note");
    }
    await prisma.proposal.update({
      where: { id },
      data: { status: decision, reviewNote: note ?? null, reviewedAt: new Date() },
    });
    await rememberProposalDecision(proposal, decision, note ?? null, "discord");
    return text(`Proposal ${decision}: ${proposal.title}`);
  },
);

const transport = new StdioServerTransport();
await server.connect(transport);
console.error(`[adapter] MCP connected for agent ${AGENT_ID}`);

// HTTP listener: the hub POSTs inbound Discord messages here; we forward
// them to Claude as channel notifications (delivered between turns).
const httpServer = http.createServer((req, res) => {
  if (req.method === "POST" && req.url === "/message") {
    let body = "";
    req.on("data", (c) => (body += c));
    req.on("end", async () => {
      try {
        const msg = JSON.parse(body) as {
          channel_id: string;
          channel_name: string;
          author: string;
          content: string;
          message_id: string;
        };
        console.error(`[adapter] message from ${msg.author} in #${msg.channel_name}`);
        await server.server.notification({
          method: "notifications/claude/channel",
          params: {
            content: msg.content,
            meta: {
              author: msg.author,
              channel_name: msg.channel_name,
              channel_id: msg.channel_id,
              message_id: msg.message_id,
            },
          },
        });
        res.writeHead(200).end("ok");
      } catch (e) {
        console.error(`[adapter] bad /message payload: ${e}`);
        res.writeHead(400).end("bad request");
      }
    });
    return;
  }
  res.writeHead(404).end("not found");
});
httpServer.listen(AGENT_PORT, "127.0.0.1", () => {
  console.error(`[adapter] HTTP listening on 127.0.0.1:${AGENT_PORT}`);
});

// Tell the hub we're ready (it will deliver the boot message + queued backlog).
async function signalReady() {
  for (let i = 0; i < 30; i++) {
    try {
      await fetch(`${HUB_URL}/agents/${AGENT_ID}/ready`, { method: "POST" });
      console.error("[adapter] signaled ready to hub");
      return;
    } catch {
      await new Promise((r) => setTimeout(r, 2000));
    }
  }
  console.error("[adapter] hub unreachable after 30 retries");
}
await signalReady();
