import { prisma } from "@/lib/db";
import {
  addProcedureCompletion,
  deleteProcedure,
  deleteProcedureCompletion,
  saveProcedure,
} from "../manage/actions";
import { Area, Card, DeleteButton, Field, PageHeader, SaveButton } from "../manage/ui";

export const dynamic = "force-dynamic";

export default async function ProceduresPage() {
  const procedures = await prisma.procedure.findMany({
    orderBy: [{ kind: "asc" }, { num: "asc" }],
    include: { steps: { orderBy: { order: "asc" } }, completions: { orderBy: { completedAt: "asc" } } },
  });

  function Section({ kind, title }: { kind: string; title: string }) {
    const list = procedures.filter((p) => p.kind === kind);
    return (
      <>
        <h3 className="mt-8 mb-2 font-mono text-[11px] tracking-[0.18em] text-ink-soft uppercase">
          {title} · {list.length}
        </h3>
        <div className="flex flex-col gap-4">
          {list.map((p) => (
            <Card key={p.id}>
              <form action={saveProcedure} className="flex flex-col gap-2">
                <input type="hidden" name="id" value={p.id} />
                <input type="hidden" name="kind" value={p.kind} />
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    name="num"
                    defaultValue={p.num}
                    className="w-10 rounded border border-rule bg-card px-1 py-1 text-sm"
                  />
                  <span className="min-w-64 flex-1">
                    <Field name="name" defaultValue={p.name} wide />
                  </span>
                  <SaveButton />
                </div>
                <Area name="description" defaultValue={p.description} placeholder="description" />
                <Field name="whenToRun" defaultValue={p.whenToRun} placeholder="WHEN to run" wide />
                <Area
                  name="steps"
                  defaultValue={p.steps.map((s) => `${s.order}. ${s.text}`).join("\n")}
                  rows={Math.max(3, p.steps.length)}
                  placeholder="one step per line"
                />
                <Area name="notes" defaultValue={p.notes} placeholder="notes" />
              </form>
              <div className="mt-2 border-t border-dashed border-rule pt-2">
                <p className="mb-1 font-mono text-[10px] tracking-widest text-ink-soft uppercase">
                  done log
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  {p.completions.map((c) => (
                    <form key={c.id} action={deleteProcedureCompletion} className="flex items-center gap-1 rounded border border-rule bg-card-done px-2 py-0.5">
                      <input type="hidden" name="id" value={c.id} />
                      <span className="text-xs">{c.label}</span>
                      <button type="submit" className="text-xs text-reject" title="remove">
                        ×
                      </button>
                    </form>
                  ))}
                  <form action={addProcedureCompletion} className="flex items-center gap-1">
                    <input type="hidden" name="procedureId" value={p.id} />
                    <Field name="label" placeholder="Jul 2026" />
                    <SaveButton label="Mark done" />
                  </form>
                </div>
              </div>
              <form action={deleteProcedure} className="mt-2 flex justify-end">
                <input type="hidden" name="id" value={p.id} />
                <DeleteButton />
              </form>
            </Card>
          ))}
          <Card>
            <form action={saveProcedure} className="flex flex-wrap items-center gap-2">
              <input type="hidden" name="kind" value={kind} />
              <Field name="num" placeholder="#" />
              <span className="min-w-64 flex-1">
                <Field name="name" placeholder={`new ${kind}`} wide />
              </span>
              <SaveButton label="Add" />
            </form>
          </Card>
        </div>
      </>
    );
  }

  return (
    <main className="mx-auto w-full max-w-4xl grow px-4 pt-8 pb-24">
      <PageHeader
        title="Procedures"
        blurb="Operating procedures from the Checks and Distributions tabs — editable, with per-run done logs. Automated detections live under Checks."
      />
      <Section kind="check" title="Checks" />
      <Section kind="distribution" title="Distributions" />
    </main>
  );
}
