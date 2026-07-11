"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";

async function setDecision(
  id: string,
  status: "approved" | "rejected",
  note: string | null,
) {
  const proposal = await prisma.proposal.findUnique({ where: { id } });
  if (!proposal) throw new Error("Proposal not found");
  if (proposal.status === "applied") {
    throw new Error("Already applied to the provider — undo is not possible");
  }
  if (proposal.kind === "open_question" && status === "approved" && !note) {
    // The note IS the decision for an open question; the form marks it
    // required, this guards direct submissions.
    throw new Error("An open question needs an answer in the note");
  }

  await prisma.proposal.update({
    where: { id },
    data: { status, reviewNote: note, reviewedAt: new Date() },
  });
  revalidatePath("/review");
}

export async function decideProposal(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const decision = String(formData.get("decision") ?? "");
  const note = String(formData.get("note") ?? "").trim() || null;

  if (decision !== "approved" && decision !== "rejected") {
    throw new Error(`Unknown decision: ${decision}`);
  }
  await setDecision(id, decision, note);
}

export async function undoDecision(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const proposal = await prisma.proposal.findUnique({ where: { id } });
  if (!proposal) throw new Error("Proposal not found");
  if (proposal.status === "applied") {
    throw new Error("Already applied to the provider — undo is not possible");
  }

  await prisma.proposal.update({
    where: { id },
    data: { status: "proposal", reviewNote: null, reviewedAt: null },
  });
  revalidatePath("/review");
}
