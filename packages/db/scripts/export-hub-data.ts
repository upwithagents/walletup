// walletup/packages/db/scripts/export-hub-data.ts
/**
 * One-time migration: copies HubAgent/ChannelMessage rows out of Prisma
 * into an updiscord SqliteHubStore file. Run once, before dropping the
 * Prisma models (see Step 3). Safe to re-run against a fresh target path —
 * ensureAgent upserts by name, logMessage inserts (dupes possible on
 * re-run, so delete the target .db file before re-running).
 */
import { prisma } from "../src/index";
import { SqliteHubStore } from "updiscord";

async function main() {
  const targetPath = process.argv[2];
  if (!targetPath) {
    console.error("usage: tsx scripts/export-hub-data.ts <target-sqlite-path>");
    process.exit(1);
  }
  const store = new SqliteHubStore(targetPath);

  const agents = await prisma.hubAgent.findMany();
  const idMap = new Map<string, string>(); // old Prisma id -> new updiscord id
  for (const agent of agents) {
    const created = await store.ensureAgent({
      name: agent.name,
      kind: agent.kind,
      channelId: agent.channelId,
      adapterPort: agent.adapterPort ?? 4500,
    });
    idMap.set(agent.id, created.id);
    if (agent.webhookId && agent.webhookToken) {
      await store.updateAgent(created.id, { webhookId: agent.webhookId, webhookToken: agent.webhookToken });
    }
  }
  console.log(`Migrated ${agents.length} agent(s).`);

  const messages = await prisma.channelMessage.findMany({ orderBy: { createdAt: "asc" } });
  for (const m of messages) {
    await store.logMessage({
      discordId: m.discordId ?? undefined,
      channelId: m.channelId,
      direction: m.direction as "inbound" | "outbound",
      authorName: m.authorName,
      agentId: m.agentId ? idMap.get(m.agentId) : undefined,
      content: m.content,
    });
  }
  console.log(`Migrated ${messages.length} message(s).`);
  await store.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
