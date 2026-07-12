import { prisma } from "@/lib/db";
import { deleteTip, saveTip } from "../manage/actions";
import { Card, DeleteButton, Field, PageHeader, SaveButton } from "../manage/ui";

export const dynamic = "force-dynamic";

export default async function TipsPage() {
  const tips = await prisma.tip.findMany({ orderBy: { createdAt: "desc" } });

  return (
    <main className="mx-auto w-full max-w-4xl grow px-4 pt-8 pb-24">
      <PageHeader
        title="Tips"
        blurb="Presentation notes for the family team — what to focus on in budgeting (the sheet's Presentations tab)."
      />
      <div className="mt-6">
        <Card>
          <form action={saveTip} className="flex flex-wrap items-center gap-2">
            <Field name="monthLabel" placeholder="July 2026" />
            <span className="min-w-64 flex-1">
              <Field name="text" placeholder="new tip" wide />
            </span>
            <SaveButton label="Add" />
          </form>
        </Card>
      </div>
      <div className="mt-6">
        <Card>
          {tips.map((t) => (
            <div
              key={t.id}
              className="flex flex-col gap-1 border-t border-rule py-2 first:border-t-0"
            >
              <form action={saveTip} className="flex flex-wrap items-center gap-2">
                <input type="hidden" name="id" value={t.id} />
                <Field name="monthLabel" defaultValue={t.monthLabel} />
                <span className="min-w-64 flex-1">
                  <Field name="text" defaultValue={t.text} wide />
                </span>
                <select
                  name="status"
                  defaultValue={t.status}
                  className="rounded border border-rule bg-card px-1 py-1 text-sm"
                >
                  <option value="open">open</option>
                  <option value="done">done</option>
                </select>
                <SaveButton />
              </form>
              <form action={deleteTip} className="self-end">
                <input type="hidden" name="id" value={t.id} />
                <DeleteButton />
              </form>
            </div>
          ))}
        </Card>
      </div>
    </main>
  );
}
