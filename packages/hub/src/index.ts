/**
 * WalletUp hub — owns the Discord gateway, the agent registry, and the
 * HTTP API that adapters call. One process, started with `pnpm hub`.
 */

import { Events } from "discord.js";
import { prisma, type HubAgent } from "@walletup/db";
import { startApi } from "./api";
import { DebounceBuffer, type BufferedMessage } from "./debounce";
import { createClient, isEcho, logInbound } from "./discord";
import { env } from "./env";
import { spawnAgent } from "./spawn";

const ADVISOR_NAME = "Advisor";

async function ensureAdvisor(): Promise<HubAgent> {
  const existing = await prisma.hubAgent.findUnique({ where: { name: ADVISOR_NAME } });
  if (existing) return existing;
  return prisma.hubAgent.create({
    data: {
      name: ADVISOR_NAME,
      kind: "advisor",
      channelId: env.generalChannelId(),
      adapterPort: env.adapterBasePort,
      status: "offline",
    },
  });
}

/** POST a message batch to the agent's adapter. */
async function deliverToAgent(
  agent: HubAgent,
  channelName: string,
  messages: BufferedMessage[],
): Promise<boolean> {
  const combined = messages.map((m) => `${m.author}: ${m.content}`).join("\n");
  try {
    const res = await fetch(`http://127.0.0.1:${agent.adapterPort}/message`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        channel_id: messages[0].channelId,
        channel_name: channelName,
        author: messages.length === 1 ? messages[0].author : "multiple",
        content: combined,
        message_id: messages[messages.length - 1].messageId,
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

async function deliverSystemMessage(agent: HubAgent, content: string): Promise<boolean> {
  return deliverToAgent(agent, "general", [
    {
      channelId: agent.channelId,
      channelName: "general",
      author: "system",
      content,
      messageId: `system-${Date.now()}`,
    },
  ]);
}

async function undeliveredBacklog(agent: HubAgent): Promise<string> {
  const lastOutbound = await prisma.channelMessage.findFirst({
    where: { agentId: agent.id, direction: "outbound" },
    orderBy: { createdAt: "desc" },
  });
  const missed = await prisma.channelMessage.findMany({
    where: {
      channelId: agent.channelId,
      direction: "inbound",
      ...(lastOutbound ? { createdAt: { gt: lastOutbound.createdAt } } : {}),
    },
    orderBy: { createdAt: "asc" },
    take: 20,
  });
  if (missed.length === 0) return "";
  const lines = missed.map(
    (m) => `[${m.createdAt.toISOString()}] ${m.authorName}: ${m.content}`,
  );
  return `\n\nMessages received while you were offline:\n${lines.join("\n")}`;
}

async function main() {
  const client = createClient();
  const advisor = await ensureAdvisor();

  const buffer = new DebounceBuffer(async (channelId, messages) => {
    const agent = await prisma.hubAgent.findUnique({ where: { name: ADVISOR_NAME } });
    if (!agent || agent.channelId !== channelId) return;
    const channel = await client.channels.fetch(channelId);
    const channelName =
      channel && "name" in channel && channel.name ? channel.name : "general";
    const ok = await deliverToAgent(agent, channelName, messages);
    if (!ok) {
      console.warn("[hub] delivery failed — adapter down? Messages stay in the audit log.");
    }
  });

  client.on(Events.MessageCreate, async (message) => {
    if (isEcho(client, message)) return;
    if (message.guildId !== env.guildId()) return;
    await logInbound(message);
    buffer.push({
      channelId: message.channelId,
      channelName: "name" in message.channel && message.channel.name ? message.channel.name : "?",
      author: message.author.username,
      content: message.content,
      messageId: message.id,
    });
  });

  startApi(client, async (agentId) => {
    const agent = await prisma.hubAgent.findUnique({ where: { id: agentId } });
    if (!agent) return;
    const backlog = await undeliveredBacklog(agent);
    await deliverSystemMessage(
      agent,
      `You are ${agent.name}, the WalletUp financial advisor, now online in ` +
        `#general (channel_id: ${agent.channelId}). Greet the user briefly ` +
        `(1-2 sentences) using the reply tool and mention what you can help ` +
        `with right now.${backlog}`,
    );
  });

  client.once(Events.ClientReady, async () => {
    console.log(`[hub] Discord connected as ${client.user?.tag}`);
    await spawnAgent(advisor);
  });

  await client.login(env.discordToken());
}

main().catch((e) => {
  console.error(`[hub] fatal: ${e}`);
  process.exit(1);
});
