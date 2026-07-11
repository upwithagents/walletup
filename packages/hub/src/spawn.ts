import { spawnSync } from "node:child_process";
import { join } from "node:path";
import { prisma, type HubAgent } from "@walletup/db";
import { env, HUB_URL, REPO_ROOT } from "./env";

const DEV_CHANNELS_DIALOG_TEXT = "development channels";
const DEV_CHANNELS_READY_TEXT = "channel";
const DEV_CHANNELS_TIMEOUT_MS = 60_000;
const POLL_INTERVAL_MS = 1_000;
const MCP_SETTLE_DELAY_MS = 5_000;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export function tmuxSessionName(agentName: string) {
  return `walletup-${agentName}`;
}

function tmux(args: string[]) {
  return spawnSync("tmux", args, { encoding: "utf8" });
}

export function isTmuxSessionAlive(session: string): boolean {
  return tmux(["has-session", "-t", session]).status === 0;
}

/**
 * The wallet MCP (remote server) is passed to the agent with bearer-token
 * auth so the advisor can read finance data. Skipped if env is missing.
 */
function walletMcpEntry(): Record<string, unknown> | null {
  const url = process.env.WALLET_MCP_URL;
  const token = process.env.MCP_TOKEN;
  if (!url || !token) return null;
  return {
    type: "http",
    url,
    headers: { Authorization: `Bearer ${token}` },
  };
}

function buildMcpConfig(agent: HubAgent): string {
  const tsxBin = join(REPO_ROOT, "node_modules", ".bin", "tsx");
  const config: Record<string, unknown> = {
    mcpServers: {
      "hub-adapter": {
        command: tsxBin,
        args: [join(REPO_ROOT, "packages", "adapter", "src", "index.ts")],
        env: {
          AGENT_ID: agent.id,
          AGENT_PORT: String(agent.adapterPort),
          HUB_URL,
          DATABASE_URL: "file:./walletup.db",
        },
      },
    },
  };
  const wallet = walletMcpEntry();
  if (wallet) (config.mcpServers as Record<string, unknown>).wallet = wallet;
  return JSON.stringify(config);
}

/**
 * Poll the tmux pane for the dev-channels dialog, dismiss it, then wait for
 * the ready banner (and MCP settling) before returning. Ported behavior —
 * see the disco-factory learnings: messages sent before the MCP server is
 * wired to the channel listener are silently dropped.
 */
async function dismissDevChannelsDialog(session: string): Promise<void> {
  const deadline = Date.now() + DEV_CHANNELS_TIMEOUT_MS;
  let enterSent = false;
  while (Date.now() < deadline) {
    const result = tmux(["capture-pane", "-t", session, "-p"]);
    if (result.status === 0) {
      const output = result.stdout.toLowerCase();
      if (enterSent && output.includes(DEV_CHANNELS_READY_TEXT)) {
        await sleep(MCP_SETTLE_DELAY_MS);
        return;
      }
      if (!enterSent && output.includes(DEV_CHANNELS_DIALOG_TEXT)) {
        tmux(["send-keys", "-t", session, "Enter"]);
        enterSent = true;
      }
    }
    await sleep(POLL_INTERVAL_MS);
  }
  if (!enterSent) tmux(["send-keys", "-t", session, "Enter"]);
  console.warn(`[spawn] dev-channels handshake uncertain for ${session} — proceeding`);
}

/** Spawn (or respawn) the agent's Claude CLI session in a detached tmux. */
export async function spawnAgent(agent: HubAgent): Promise<void> {
  const session = tmuxSessionName(agent.name);
  if (isTmuxSessionAlive(session)) {
    tmux(["kill-session", "-t", session]);
  }

  const args = [
    "claude",
    "--agent", `walletup-${agent.kind}`,
    "--model", env.advisorModel,
    "--name", agent.name,
    "--dangerously-skip-permissions",
    "--dangerously-load-development-channels", "server:hub-adapter",
    // Only the servers we pass — never the user's personal/employer MCPs
    "--strict-mcp-config",
    "--mcp-config", buildMcpConfig(agent),
  ];

  const result = tmux(["new-session", "-d", "-s", session, "-c", REPO_ROOT, "--", ...args]);
  if (result.status !== 0) {
    throw new Error(`tmux new-session failed: ${result.stderr}`);
  }

  await prisma.hubAgent.update({
    where: { id: agent.id },
    data: { tmuxSession: session, status: "starting" },
  });

  await dismissDevChannelsDialog(session);
  console.log(`[spawn] ${agent.name} started in tmux session ${session}`);
}

export function killAgent(agent: HubAgent): void {
  if (agent.tmuxSession && isTmuxSessionAlive(agent.tmuxSession)) {
    tmux(["kill-session", "-t", agent.tmuxSession]);
  }
}
