"use server";

/**
 * CRUD server actions for the sheet-replacement entities. Deliberately
 * plain: every page is a set of forms posting here; visual polish and
 * auth are a separate session's concern.
 */

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";

const str = (f: FormData, k: string) => String(f.get(k) ?? "").trim();
const opt = (f: FormData, k: string) => str(f, k) || null;
const num = (f: FormData, k: string) => {
  const v = str(f, k);
  return v === "" ? null : Number(v.replace(",", "."));
};

function revalidate(path: string) {
  revalidatePath(path);
  revalidatePath("/");
}

// --- Todos -----------------------------------------------------------------
export async function saveTodo(f: FormData) {
  const id = str(f, "id");
  const data = {
    title: str(f, "title"),
    status: str(f, "status") || "todo",
    notes: opt(f, "notes"),
  };
  if (!data.title) return;
  if (id) await prisma.todo.update({ where: { id }, data });
  else
    await prisma.todo.create({
      data: { ...data, sortOrder: (await prisma.todo.count()) + 1 },
    });
  revalidate("/todos");
}

export async function deleteTodo(f: FormData) {
  await prisma.todo.delete({ where: { id: str(f, "id") } });
  revalidate("/todos");
}

// --- Tips (Presentations) ---------------------------------------------------
export async function saveTip(f: FormData) {
  const id = str(f, "id");
  const data = {
    monthLabel: str(f, "monthLabel"),
    text: str(f, "text"),
    status: str(f, "status") || "open",
  };
  if (!data.text) return;
  if (id) await prisma.tip.update({ where: { id }, data });
  else await prisma.tip.create({ data });
  revalidate("/tips");
}

export async function deleteTip(f: FormData) {
  await prisma.tip.delete({ where: { id: str(f, "id") } });
  revalidate("/tips");
}

// --- Category mappings --------------------------------------------------------
export async function saveMapping(f: FormData) {
  const id = str(f, "id");
  const data = {
    emoji: opt(f, "emoji"),
    name: str(f, "name"),
    type: str(f, "type"),
    inWallet: str(f, "inWallet"),
  };
  if (!data.name) return;
  if (id) await prisma.categoryMapping.update({ where: { id }, data });
  else await prisma.categoryMapping.create({ data });
  revalidate("/mappings");
}

export async function deleteMapping(f: FormData) {
  await prisma.categoryMapping.delete({ where: { id: str(f, "id") } });
  revalidate("/mappings");
}

// --- Set-Aside ----------------------------------------------------------------
export async function saveSetAside(f: FormData) {
  const id = str(f, "id");
  const data = {
    num: Number(str(f, "num") || 0),
    name: str(f, "name"),
    description: opt(f, "description"),
    dueLabel: opt(f, "dueLabel"),
    windowLabel: opt(f, "windowLabel"),
    monthlyAmount: num(f, "monthlyAmount"),
    notes: opt(f, "notes"),
  };
  if (!data.name) return;
  if (id) await prisma.setAsideItem.update({ where: { id }, data });
  else await prisma.setAsideItem.create({ data });
  revalidate("/set-aside");
}

export async function deleteSetAside(f: FormData) {
  await prisma.setAsideItem.delete({ where: { id: str(f, "id") } });
  revalidate("/set-aside");
}

export async function saveSetAsideProgress(f: FormData) {
  const id = str(f, "id");
  const data = {
    yearLabel: str(f, "yearLabel"),
    saved: num(f, "saved") ?? 0,
    target: num(f, "target") ?? 0,
  };
  if (id) await prisma.setAsideProgress.update({ where: { id }, data });
  else
    await prisma.setAsideProgress.create({
      data: { ...data, itemId: str(f, "itemId") },
    });
  revalidate("/set-aside");
}

export async function deleteSetAsideProgress(f: FormData) {
  await prisma.setAsideProgress.delete({ where: { id: str(f, "id") } });
  revalidate("/set-aside");
}

// --- Procedures (Checks + Distributions) ---------------------------------------
export async function saveProcedure(f: FormData) {
  const id = str(f, "id");
  const steps = str(f, "steps")
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((text, i) => ({ order: i + 1, text: text.replace(/^\d+[.)]\s*/, "") }));
  const data = {
    kind: str(f, "kind") || "check",
    num: Number(str(f, "num") || 0),
    name: str(f, "name"),
    description: opt(f, "description"),
    whenToRun: opt(f, "whenToRun"),
    notes: opt(f, "notes"),
  };
  if (!data.name) return;
  if (id) {
    await prisma.$transaction([
      prisma.procedure.update({ where: { id }, data }),
      prisma.procedureStep.deleteMany({ where: { procedureId: id } }),
      prisma.procedureStep.createMany({
        data: steps.map((s) => ({ ...s, procedureId: id })),
      }),
    ]);
  } else {
    await prisma.procedure.create({ data: { ...data, steps: { create: steps } } });
  }
  revalidate("/procedures");
}

export async function deleteProcedure(f: FormData) {
  await prisma.procedure.delete({ where: { id: str(f, "id") } });
  revalidate("/procedures");
}

export async function addProcedureCompletion(f: FormData) {
  const label = str(f, "label");
  if (!label) return;
  await prisma.procedureCompletion.create({
    data: { procedureId: str(f, "procedureId"), label },
  });
  revalidate("/procedures");
}

export async function deleteProcedureCompletion(f: FormData) {
  await prisma.procedureCompletion.delete({ where: { id: str(f, "id") } });
  revalidate("/procedures");
}
