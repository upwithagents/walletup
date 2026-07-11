// Refresh an existing agent run's proposals from its (updated) seed file —
// used when the run itself is amended rather than a new run created.
// Refuses to touch runs where the user already made decisions.
// Usage: tsx scripts/refresh-run.ts <seed-file-name>
import { PrismaClient } from "@prisma/client";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const prisma = new PrismaClient();
const file = process.argv[2];
if (!file) {
  console.error("usage: tsx scripts/refresh-run.ts <seed-file-name>");
  process.exit(1);
}

const data = JSON.parse(
  readFileSync(join(dirname(fileURLToPath(import.meta.url)), "..", "prisma", "seed-data", file), "utf-8"),
);

const run = await prisma.agentRun.findFirst({
  where: { runDate: new Date(data.run.runDate), type: data.run.type },
});
if (!run) {
  console.error("run not found — use db:seed for new runs");
  process.exit(1);
}

const decided = await prisma.proposal.count({
  where: { runId: run.id, status: { not: "proposal" } },
});
if (decided > 0) {
  console.error(`refusing: run has ${decided} decided proposal(s) — refresh would destroy decisions`);
  process.exit(1);
}

await prisma.$transaction([
  prisma.agentRun.update({
    where: { id: run.id },
    data: { summary: data.run.summary ?? run.summary },
  }),
  prisma.proposal.deleteMany({ where: { runId: run.id } }),
  prisma.proposal.createMany({
    data: data.proposals.map((p: Record<string, unknown>) => ({ ...p, runId: run.id })),
  }),
]);
console.log(`run ${run.id} refreshed with ${data.proposals.length} proposals`);
await prisma.$disconnect();
