import {
  ChannelType,
  Client,
  GatewayIntentBits,
  WebhookClient,
  type Message,
  type TextChannel,
} from "discord.js";
import { prisma, type HubAgent } from "@walletup/db";
import { env } from "./env";

export function createClient(): Client {
  return new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent,
    ],
  });
}

export async function getTextChannel(client: Client, channelId: string): Promise<TextChannel> {
  const channel = await client.channels.fetch(channelId);
  if (!channel || channel.type !== ChannelType.GuildText) {
    throw new Error(`Channel ${channelId} is not a guild text channel`);
  }
  return channel;
}

/** Ensure the agent has a webhook persona in the given channel; persist it. */
export async function ensureWebhook(
  client: Client,
  agent: HubAgent,
  channelId: string,
): Promise<{ id: string; token: string }> {
  if (agent.webhookId && agent.webhookToken) {
    return { id: agent.webhookId, token: agent.webhookToken };
  }
  const channel = await getTextChannel(client, channelId);
  const hooks = await channel.fetchWebhooks();
  const existing = hooks.find((h) => h.name === `walletup-${agent.name}` && h.token);
  const hook =
    existing ??
    (await channel.createWebhook({ name: `walletup-${agent.name}` }));
  if (!hook.token) throw new Error(`Webhook for ${agent.name} has no token`);
  await prisma.hubAgent.update({
    where: { id: agent.id },
    data: { webhookId: hook.id, webhookToken: hook.token },
  });
  return { id: hook.id, token: hook.token };
}

const DISCORD_MESSAGE_LIMIT = 2000;

function chunkContent(content: string): string[] {
  if (content.length <= DISCORD_MESSAGE_LIMIT) return [content];
  const chunks: string[] = [];
  let rest = content;
  while (rest.length > 0) {
    if (rest.length <= DISCORD_MESSAGE_LIMIT) {
      chunks.push(rest);
      break;
    }
    // Prefer breaking on a newline inside the window
    let cut = rest.lastIndexOf("\n", DISCORD_MESSAGE_LIMIT);
    if (cut < DISCORD_MESSAGE_LIMIT / 2) cut = DISCORD_MESSAGE_LIMIT;
    chunks.push(rest.slice(0, cut));
    rest = rest.slice(cut).replace(/^\n/, "");
  }
  return chunks;
}

/** Post as the agent's persona via its webhook and log to the audit trail. */
export async function sendAsAgent(
  client: Client,
  agent: HubAgent,
  channelId: string,
  content: string,
): Promise<void> {
  const { id, token } = await ensureWebhook(client, agent, channelId);
  const webhook = new WebhookClient({ id, token });
  for (const chunk of chunkContent(content)) {
    await webhook.send({ content: chunk, username: agent.name });
  }
  await prisma.channelMessage.create({
    data: {
      channelId,
      direction: "outbound",
      authorName: agent.name,
      agentId: agent.id,
      content,
    },
  });
}

/** True for messages the hub should ignore (its own personas / the bot). */
export function isEcho(client: Client, message: Message): boolean {
  if (message.author.id === client.user?.id) return true;
  // Webhook messages from our personas: username prefix is enough for v1
  if (message.webhookId) return true;
  return false;
}

export async function logInbound(message: Message): Promise<void> {
  await prisma.channelMessage.create({
    data: {
      discordId: message.id,
      channelId: message.channelId,
      direction: "inbound",
      authorName: message.author.username,
      content: message.content,
    },
  });
}

export function isStakeholder(message: Message): boolean {
  return message.author.id === env.stakeholderId();
}
