import { prisma } from "@/lib/db";
import { deleteTodo, saveTodo } from "../manage/actions";
import { Area, Card, DeleteButton, Field, PageHeader, SaveButton } from "../manage/ui";

export const dynamic = "force-dynamic";

export default async function TodosPage() {
  const todos = await prisma.todo.findMany({
    orderBy: [{ status: "desc" }, { sortOrder: "asc" }],
  });
  const open = todos.filter((t) => t.status !== "done");
  const done = todos.filter((t) => t.status === "done");

  function Row({ todo }: { todo: (typeof todos)[number] }) {
    return (
      <div className="flex flex-col gap-1 border-t border-rule py-2 first:border-t-0">
        <form action={saveTodo} className="flex flex-wrap items-center gap-2">
          <input type="hidden" name="id" value={todo.id} />
          <select
            name="status"
            defaultValue={todo.status}
            className="rounded border border-rule bg-card px-1 py-1 text-sm"
          >
            <option value="todo">todo</option>
            <option value="doing">doing</option>
            <option value="done">done</option>
          </select>
          <span className="min-w-64 flex-1">
            <Field name="title" defaultValue={todo.title} wide />
          </span>
          <span className="min-w-64 flex-[1.5]">
            <Field name="notes" defaultValue={todo.notes} placeholder="notes" wide />
          </span>
          <SaveButton />
        </form>
        <form action={deleteTodo} className="self-end">
          <input type="hidden" name="id" value={todo.id} />
          <DeleteButton />
        </form>
      </div>
    );
  }

  return (
    <main className="mx-auto w-full max-w-4xl grow px-4 pt-8 pb-24">
      <PageHeader
        title="TODO"
        blurb="Finance planning backlog — the sheet's TODO tab, now editable here."
      />
      <div className="mt-6">
        <Card>
          <h3 className="mb-1 font-mono text-[11px] tracking-[0.18em] text-ink-soft uppercase">
            Add task
          </h3>
          <form action={saveTodo} className="flex flex-wrap items-center gap-2">
            <span className="min-w-64 flex-1">
              <Field name="title" placeholder="new task" wide />
            </span>
            <span className="min-w-64 flex-1">
              <Field name="notes" placeholder="notes" wide />
            </span>
            <SaveButton label="Add" />
          </form>
        </Card>
      </div>
      <h3 className="mt-8 mb-2 font-mono text-[11px] tracking-[0.18em] text-ink-soft uppercase">
        Open · {open.length}
      </h3>
      <Card>{open.map((t) => <Row key={t.id} todo={t} />)}</Card>
      <h3 className="mt-8 mb-2 font-mono text-[11px] tracking-[0.18em] text-ink-soft uppercase">
        Done · {done.length}
      </h3>
      <Card>{done.map((t) => <Row key={t.id} todo={t} />)}</Card>
    </main>
  );
}
