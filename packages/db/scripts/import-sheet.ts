// One-time import of the Google Sheet content (parsed into
// seed-data/sheet-content.json) — the app becomes the system of record.
// Idempotent: any table that already has rows is left untouched.
import { PrismaClient } from "@prisma/client";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const prisma = new PrismaClient();
const data = JSON.parse(
  readFileSync(
    join(dirname(fileURLToPath(import.meta.url)), "..", "prisma", "seed-data", "sheet-content.json"),
    "utf-8",
  ),
);

async function importIfEmpty(name: string, count: () => Promise<number>, run: () => Promise<number>) {
  if ((await count()) > 0) {
    console.log(`${name}: rows exist, skipped`);
    return;
  }
  console.log(`${name}: imported ${await run()}`);
}

await importIfEmpty("todos", () => prisma.todo.count(), async () => {
  const r = await prisma.todo.createMany({
    data: data.todos.map((t: Record<string, unknown>, i: number) => ({ ...t, sortOrder: i })),
  });
  return r.count;
});

await importIfEmpty("tips", () => prisma.tip.count(), async () => {
  const r = await prisma.tip.createMany({ data: data.tips });
  return r.count;
});

await importIfEmpty("mappings", () => prisma.categoryMapping.count(), async () => {
  const r = await prisma.categoryMapping.createMany({ data: data.mappings });
  return r.count;
});

await importIfEmpty("procedures", () => prisma.procedure.count(), async () => {
  for (const p of data.procedures) {
    await prisma.procedure.create({
      data: {
        kind: p.kind,
        num: p.num,
        name: p.name,
        description: p.description,
        whenToRun: p.whenToRun,
        notes: p.notes,
        steps: { create: p.steps },
        completions: { create: p.completions.map((label: string) => ({ label })) },
      },
    });
  }
  return data.procedures.length;
});

await importIfEmpty("set-aside", () => prisma.setAsideItem.count(), async () => {
  for (const it of data.setAside) {
    const { progress, ...item } = it;
    await prisma.setAsideItem.create({ data: { ...item, progress: { create: progress } } });
  }
  return data.setAside.length;
});

await prisma.$disconnect();
