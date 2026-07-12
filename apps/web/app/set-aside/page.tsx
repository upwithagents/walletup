import { prisma } from "@/lib/db";
import {
  deleteSetAside,
  deleteSetAsideProgress,
  saveSetAside,
  saveSetAsideProgress,
} from "../manage/actions";
import { Area, Card, DeleteButton, Field, PageHeader, SaveButton } from "../manage/ui";

export const dynamic = "force-dynamic";

export default async function SetAsidePage() {
  const items = await prisma.setAsideItem.findMany({
    orderBy: { num: "asc" },
    include: { progress: true },
  });
  const monthlyTotal = items.reduce((s, i) => s + (i.monthlyAmount ?? 0), 0);

  return (
    <main className="mx-auto w-full max-w-4xl grow px-4 pt-8 pb-24">
      <PageHeader
        title="Set-Aside"
        blurb={`Monthly reservations toward annual payments and goals. Current monthly total: ${monthlyTotal.toLocaleString("en-US")} CZK (1st–3rd of month).`}
      />
      <div className="mt-6 flex flex-col gap-4">
        {items.map((it) => (
          <Card key={it.id}>
            <form action={saveSetAside} className="flex flex-col gap-2">
              <input type="hidden" name="id" value={it.id} />
              <div className="flex flex-wrap items-center gap-2">
                <span className="w-10">
                  <input
                    name="num"
                    defaultValue={it.num}
                    className="w-10 rounded border border-rule bg-card px-1 py-1 text-sm"
                  />
                </span>
                <span className="min-w-64 flex-1">
                  <Field name="name" defaultValue={it.name} wide />
                </span>
                <Field name="monthlyAmount" defaultValue={it.monthlyAmount} placeholder="CZK/month" />
                <SaveButton />
              </div>
              <div className="flex flex-wrap gap-2">
                <span className="flex-1">
                  <Field name="dueLabel" defaultValue={it.dueLabel} placeholder="DUE" wide />
                </span>
                <span className="flex-1">
                  <Field name="windowLabel" defaultValue={it.windowLabel} placeholder="set-aside window" wide />
                </span>
              </div>
              <Area name="description" defaultValue={it.description} placeholder="description" />
              <Area name="notes" defaultValue={it.notes} placeholder="notes" rows={3} />
            </form>
            <div className="mt-2 border-t border-dashed border-rule pt-2">
              <p className="mb-1 font-mono text-[10px] tracking-widest text-ink-soft uppercase">
                progress
              </p>
              {it.progress.map((p) => (
                <div key={p.id} className="flex flex-wrap items-center gap-2 py-1">
                  <form action={saveSetAsideProgress} className="flex flex-wrap items-center gap-2">
                    <input type="hidden" name="id" value={p.id} />
                    <Field name="yearLabel" defaultValue={p.yearLabel} />
                    <Field name="saved" defaultValue={p.saved} />
                    <span className="text-sm text-ink-soft">/</span>
                    <Field name="target" defaultValue={p.target} />
                    <span className="font-mono text-xs text-ink-soft">
                      {p.target > 0 ? `${Math.round((p.saved / p.target) * 100)}%` : "—"}
                    </span>
                    <SaveButton />
                  </form>
                  <form action={deleteSetAsideProgress}>
                    <input type="hidden" name="id" value={p.id} />
                    <DeleteButton />
                  </form>
                </div>
              ))}
              <form action={saveSetAsideProgress} className="mt-1 flex flex-wrap items-center gap-2">
                <input type="hidden" name="itemId" value={it.id} />
                <Field name="yearLabel" placeholder="2027" />
                <Field name="saved" placeholder="saved" />
                <Field name="target" placeholder="target" />
                <SaveButton label="Add progress" />
              </form>
            </div>
            <form action={deleteSetAside} className="mt-2 flex justify-end">
              <input type="hidden" name="id" value={it.id} />
              <DeleteButton />
            </form>
          </Card>
        ))}
        <Card>
          <h3 className="mb-1 font-mono text-[11px] tracking-[0.18em] text-ink-soft uppercase">
            Add item
          </h3>
          <form action={saveSetAside} className="flex flex-wrap items-center gap-2">
            <Field name="num" placeholder="#" />
            <span className="min-w-64 flex-1">
              <Field name="name" placeholder="name" wide />
            </span>
            <Field name="monthlyAmount" placeholder="CZK/month" />
            <SaveButton label="Add" />
          </form>
        </Card>
      </div>
    </main>
  );
}
