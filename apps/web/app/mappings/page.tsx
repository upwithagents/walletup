import { prisma } from "@/lib/db";
import { deleteMapping, saveMapping } from "../manage/actions";
import { Card, DeleteButton, Field, PageHeader, SaveButton } from "../manage/ui";

export const dynamic = "force-dynamic";

export default async function MappingsPage() {
  const mappings = await prisma.categoryMapping.findMany({
    orderBy: [{ type: "asc" }, { name: "asc" }],
  });
  const types = [...new Set(mappings.map((m) => m.type))];

  return (
    <main className="mx-auto w-full max-w-4xl grow px-4 pt-8 pb-24">
      <PageHeader
        title="Categories & Labels"
        blurb="How sheet concepts map to provider categories and labels (the sheet's Categories/Labels tab)."
      />
      <div className="mt-6">
        <Card>
          <form action={saveMapping} className="flex flex-wrap items-center gap-2">
            <span className="w-14">
              <input name="emoji" placeholder="emoji" className="w-14 rounded border border-rule bg-card px-1 py-1 text-sm" />
            </span>
            <span className="min-w-48 flex-1">
              <Field name="name" placeholder="name" wide />
            </span>
            <Field name="type" placeholder="Income/Expense/Transfer" />
            <span className="min-w-48 flex-1">
              <Field name="inWallet" placeholder="in Wallet" wide />
            </span>
            <SaveButton label="Add" />
          </form>
        </Card>
      </div>
      {types.map((type) => (
        <div key={type}>
          <h3 className="mt-8 mb-2 font-mono text-[11px] tracking-[0.18em] text-ink-soft uppercase">
            {type} · {mappings.filter((m) => m.type === type).length}
          </h3>
          <Card>
            {mappings
              .filter((m) => m.type === type)
              .map((m) => (
                <div
                  key={m.id}
                  className="flex flex-wrap items-center gap-2 border-t border-rule py-1.5 first:border-t-0"
                >
                  <form action={saveMapping} className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
                    <input type="hidden" name="id" value={m.id} />
                    <input type="hidden" name="type" value={m.type} />
                    <span className="w-14">
                      <input name="emoji" defaultValue={m.emoji ?? ""} className="w-14 rounded border border-rule bg-card px-1 py-1 text-sm" />
                    </span>
                    <span className="min-w-48 flex-1">
                      <Field name="name" defaultValue={m.name} wide />
                    </span>
                    <span className="min-w-48 flex-1">
                      <Field name="inWallet" defaultValue={m.inWallet} wide />
                    </span>
                    <SaveButton />
                  </form>
                  <form action={deleteMapping}>
                    <input type="hidden" name="id" value={m.id} />
                    <DeleteButton />
                  </form>
                </div>
              ))}
          </Card>
        </div>
      ))}
    </main>
  );
}
