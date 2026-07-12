/**
 * Apply engine (plan 01 phase B): executes USER-APPROVED proposals against
 * the provider. Hard rules:
 *   - only proposals with status "approved" are touched
 *   - required scopes are verified up front; missing scopes abort
 *   - every applied item gets a LearningNote + feedback memory
 *   - idempotent: re-running skips items already marked applied
 */

import { prisma, type Proposal } from "@walletup/db";
import { remember } from "@walletup/memory";
import { WalletWriter } from "@walletup/provider-wallet";

export interface ApplyPlanItem {
  proposal: Proposal;
  action: string;
  requiredScope: string;
  execute: (writer: WalletWriter) => Promise<unknown>;
}

export interface ApplyReport {
  planned: ApplyPlanItem[];
  unsupported: Proposal[];
  missingScopes: string[];
}

function parseAction(p: Proposal): Record<string, unknown> {
  try {
    return p.actionData ? JSON.parse(p.actionData) : {};
  } catch {
    return {};
  }
}

export async function planApply(writer: WalletWriter): Promise<ApplyReport> {
  const approved = await prisma.proposal.findMany({
    where: { status: "approved" },
    orderBy: { reviewedAt: "asc" },
  });

  const planned: ApplyPlanItem[] = [];
  const unsupported: Proposal[] = [];

  for (const p of approved) {
    const data = parseAction(p);
    const recordId = p.walletRecordId;

    if (p.kind === "categorize" || p.kind === "fix_category") {
      const categoryId = data.categoryId as string | undefined;
      if (!recordId || !categoryId) {
        unsupported.push(p);
        continue;
      }
      planned.push({
        proposal: p,
        action: `set category ${data.categoryName ?? categoryId} on record ${recordId}`,
        requiredScope: "records.update",
        execute: (w) => w.patchRecordCategory(recordId, categoryId),
      });
    } else if (p.kind === "remove_label") {
      const labelId = data.removeLabelId as string | undefined;
      if (!recordId || !labelId) {
        unsupported.push(p);
        continue;
      }
      planned.push({
        proposal: p,
        action: `remove label ${data.removeLabelName ?? labelId} from record ${recordId}`,
        requiredScope: "records.update",
        execute: (w) => w.removeRecordLabel(recordId, labelId),
      });
    } else if (p.kind === "delete_duplicate") {
      if (!recordId) {
        unsupported.push(p);
        continue;
      }
      planned.push({
        proposal: p,
        action: `delete duplicate record ${recordId}`,
        requiredScope: "records.delete",
        execute: (w) => w.deleteRecords([recordId]),
      });
    } else {
      // open_question approvals carry the user's answer; a future sweep
      // turns them into concrete proposals — nothing to execute directly.
      unsupported.push(p);
    }
  }

  const { grantedScopes } = await writer.getClientProfile();
  const needed = [...new Set(planned.map((i) => i.requiredScope))];
  const missingScopes = needed.filter((s) => !grantedScopes.includes(s));

  return { planned, unsupported, missingScopes };
}

export async function executeApply(
  writer: WalletWriter,
  items: ApplyPlanItem[],
): Promise<{ applied: number; failed: Array<{ id: string; error: string }> }> {
  let applied = 0;
  const failed: Array<{ id: string; error: string }> = [];

  for (const item of items) {
    const p = item.proposal;
    try {
      await item.execute(writer);
      const lesson =
        `User approved: ${p.title} -> ${p.proposedAction}` +
        (p.reviewNote ? ` (note: ${p.reviewNote})` : "");
      await prisma.$transaction([
        prisma.proposal.update({
          where: { id: p.id },
          data: { status: "applied", appliedAt: new Date() },
        }),
        prisma.learningNote.upsert({
          where: { proposalId: p.id },
          create: { proposalId: p.id, lesson },
          update: { lesson },
        }),
      ]);
      await remember({
        kind: "feedback",
        source: "app",
        content: `APPLIED to provider: ${item.action} — ${lesson}`,
        tags: [`proposal:${p.id}`, p.kind, "applied"],
      });
      applied++;
    } catch (e) {
      failed.push({ id: p.id, error: e instanceof Error ? e.message : String(e) });
    }
  }
  return { applied, failed };
}
