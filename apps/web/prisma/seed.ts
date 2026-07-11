import { PrismaClient } from "@prisma/client";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const prisma = new PrismaClient();

interface SeedProposal {
  section: string;
  kind: string;
  walletRecordId: string | null;
  title: string;
  detail: string;
  proposedAction: string;
  actionData: string | null;
  evidence: string;
  confidence: string;
}

interface SeedFile {
  run: { runDate: string; type: string; summary?: string };
  proposals: SeedProposal[];
}

async function main() {
  const dir = join(__dirname, "seed-data");
  const files = readdirSync(dir).filter(
    (f) => f.endsWith(".json") && f !== "example.json",
  );

  for (const file of files) {
    const data: SeedFile = JSON.parse(readFileSync(join(dir, file), "utf-8"));
    const runDate = new Date(data.run.runDate);

    const existing = await prisma.agentRun.findFirst({
      where: { runDate, type: data.run.type },
    });
    if (existing) {
      console.log(`skip ${file} — run already seeded (${existing.id})`);
      continue;
    }

    const run = await prisma.agentRun.create({
      data: {
        runDate,
        type: data.run.type,
        summary: data.run.summary ?? null,
        proposals: { create: data.proposals },
      },
    });
    console.log(`seeded ${file}: run ${run.id}, ${data.proposals.length} proposals`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
