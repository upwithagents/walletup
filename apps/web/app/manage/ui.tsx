/** Tiny shared primitives for the plain CRUD pages (visuals outsourced). */

export function PageHeader({ title, blurb }: { title: string; blurb: string }) {
  return (
    <header>
      <p className="font-mono text-[11px] tracking-[0.2em] text-ink-soft uppercase">
        WalletUp
      </p>
      <h1 className="font-display mt-1 text-4xl font-semibold tracking-tight">
        {title}
      </h1>
      <p className="mt-3 max-w-prose text-sm text-ink-soft">{blurb}</p>
    </header>
  );
}

export function Field(props: {
  name: string;
  defaultValue?: string | number | null;
  placeholder?: string;
  wide?: boolean;
}) {
  return (
    <input
      name={props.name}
      defaultValue={props.defaultValue ?? ""}
      placeholder={props.placeholder ?? props.name}
      className={`rounded border border-rule bg-card px-2 py-1 text-sm ${props.wide ? "w-full" : "w-32"}`}
    />
  );
}

export function Area(props: {
  name: string;
  defaultValue?: string | null;
  rows?: number;
  placeholder?: string;
}) {
  return (
    <textarea
      name={props.name}
      defaultValue={props.defaultValue ?? ""}
      rows={props.rows ?? 2}
      placeholder={props.placeholder ?? props.name}
      className="w-full rounded border border-rule bg-card px-2 py-1 text-sm"
    />
  );
}

export function SaveButton({ label = "Save" }: { label?: string }) {
  return (
    <button
      type="submit"
      className="rounded bg-approve px-3 py-1 text-sm font-medium text-card hover:bg-approve/90"
    >
      {label}
    </button>
  );
}

export function DeleteButton() {
  return (
    <button
      type="submit"
      className="rounded border border-reject/50 px-2 py-1 text-xs font-medium text-reject hover:bg-reject-soft"
    >
      Delete
    </button>
  );
}

export function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-md border border-rule bg-card px-4 py-3 shadow-[0_1px_2px_rgba(24,38,32,0.06)]">
      {children}
    </div>
  );
}
