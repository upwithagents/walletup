/**
 * Daily chore scheduler: while the hub runs, the agent's daily sweep
 * (categorize + checks + evaluate) fires once per day after RUN_HOUR.
 * The day's CheckRun row doubles as the "already ran today" marker, so
 * hub restarts never double-run.
 */

import { execFile } from "node:child_process";
import { join } from "node:path";
import { prisma } from "@walletup/db";
import { remember } from "@walletup/memory";
import { REPO_ROOT } from "./env";

const RUN_HOUR = 7; // local time
const POLL_MS = 15 * 60 * 1000;

async function ranToday(): Promise<boolean> {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const count = await prisma.checkRun.count({ where: { runDate: { gte: start } } });
  return count > 0;
}

function runDaily(): Promise<{ ok: boolean; tail: string }> {
  return new Promise((resolve) => {
    execFile(
      join(REPO_ROOT, "node_modules", ".bin", "tsx"),
      [join(REPO_ROOT, "packages", "agent", "src", "daily-cli.ts")],
      { cwd: REPO_ROOT, timeout: 10 * 60 * 1000 },
      (error, stdout, stderr) => {
        const tail = (stdout + stderr).split("\n").slice(-12).join("\n");
        resolve({ ok: !error, tail });
      },
    );
  });
}

export function startScheduler() {
  const tick = async () => {
    try {
      if (new Date().getHours() < RUN_HOUR) return;
      if (await ranToday()) return;
      console.log("[scheduler] starting daily chore run");
      const { ok, tail } = await runDaily();
      console.log(`[scheduler] daily run ${ok ? "completed" : "FAILED"}\n${tail}`);
      await remember({
        kind: "session_note",
        source: "app",
        tags: ["scheduler", "daily-run", ok ? "ok" : "failed"],
        content: `Scheduled daily chore run ${ok ? "completed" : "FAILED"}: ${tail.slice(-400)}`,
      });
    } catch (e) {
      console.error(`[scheduler] tick error: ${e}`);
    }
  };
  void tick();
  setInterval(tick, POLL_MS);
  console.log(`[scheduler] armed — daily chores after ${RUN_HOUR}:00`);
}
