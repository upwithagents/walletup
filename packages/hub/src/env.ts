import { config } from "dotenv";
import { join } from "node:path";

export const REPO_ROOT = join(import.meta.dirname, "..", "..", "..");

config({ path: join(REPO_ROOT, ".env") });

function required(name: string): string {
  const v = process.env[name];
  if (!v) {
    console.error(`[hub] missing required env var ${name} (set it in ${REPO_ROOT}/.env)`);
    process.exit(1);
  }
  return v;
}

export const env = {
  discordToken: () => required("DISCORD_TOKEN"),
  guildId: () => required("DISCORD_GUILD_ID"),
  generalChannelId: () => required("DISCORD_GENERAL_CHANNEL_ID"),
  stakeholderId: () => required("STAKEHOLDER_DISCORD_ID"),
  hubPort: Number(process.env.HUB_PORT ?? 4400),
  adapterBasePort: Number(process.env.HUB_ADAPTER_BASE_PORT ?? 4500),
  advisorModel: process.env.ADVISOR_MODEL ?? "claude-sonnet-5",
};

export const HUB_URL = `http://127.0.0.1:${env.hubPort}`;
