import { WalletProvider } from "@walletup/provider-wallet";

export const dynamic = "force-dynamic";

interface Account {
  id: string;
  name: string;
  accountType: string;
  archived: boolean;
  excludeFromStats: boolean;
  isBankSync: boolean;
  balance: { currencyCode: string; currentBalance: number };
  recordStats?: { recordCount: number; lastUpdatedAt?: string };
}

async function fetchAllAccounts(): Promise<{ accounts: Account[]; syncedAt?: string }> {
  const wallet = new WalletProvider();
  try {
    const accounts: Account[] = [];
    let offset = 0;
    let syncedAt: string | undefined;
    for (;;) {
      const page = await wallet.getAccounts({ limit: 20, offset });
      accounts.push(...page.accounts);
      syncedAt = page._meta?.syncedAt ?? syncedAt;
      if (page.nextOffset == null) break;
      offset = page.nextOffset;
    }
    return { accounts, syncedAt };
  } finally {
    await wallet.close();
  }
}

function groupOf(a: Account): string {
  if (a.archived) return "Archived";
  if (a.accountType === "Investment" || a.accountType === "Mortgage") return "Investments & assets";
  if (!a.isBankSync && ["General"].includes(a.accountType)) return "Virtual / bookkeeping";
  if (a.excludeFromStats) return "Routing (excluded from stats)";
  if (!a.isBankSync) return "Manual";
  return "Bank-synced";
}

const GROUP_ORDER = [
  "Bank-synced",
  "Manual",
  "Routing (excluded from stats)",
  "Virtual / bookkeeping",
  "Investments & assets",
  "Archived",
];

function formatAmount(value: number, currency: string) {
  return new Intl.NumberFormat("cs-CZ", {
    style: "currency",
    currency,
    maximumFractionDigits: value % 1 === 0 ? 0 : 2,
  }).format(value);
}

function daysAgo(iso?: string): string {
  if (!iso) return "—";
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (days === 0) return "today";
  if (days === 1) return "yesterday";
  return `${days}d ago`;
}

export default async function AccountsPage() {
  const { accounts, syncedAt } = await fetchAllAccounts();
  const groups = GROUP_ORDER.map((g) => ({
    name: g,
    accounts: accounts.filter((a) => groupOf(a) === g),
  })).filter((g) => g.accounts.length > 0);

  return (
    <main className="mx-auto w-full max-w-3xl grow px-4 pt-10 pb-24">
      <header>
        <p className="font-mono text-[11px] tracking-[0.2em] text-ink-soft uppercase">
          WalletUp
        </p>
        <h1 className="font-display mt-1 text-4xl font-semibold tracking-tight">
          Accounts
        </h1>
        <p className="mt-3 max-w-prose text-sm text-ink-soft">
          Live from the finance provider (read-only).{" "}
          {syncedAt ? `Last provider sync ${daysAgo(syncedAt)}.` : ""}
        </p>
      </header>

      {groups.map((group) => (
        <div key={group.name} className="mt-8">
          <h3 className="mb-2 font-mono text-[11px] tracking-[0.18em] text-ink-soft uppercase">
            {group.name} · {group.accounts.length}
          </h3>
          <div className="overflow-hidden rounded-md border border-rule bg-card shadow-[0_1px_2px_rgba(24,38,32,0.06)]">
            {group.accounts.map((a) => (
              <div
                key={a.id}
                className="flex items-baseline gap-3 border-t border-rule px-4 py-2.5 first:border-t-0"
              >
                <span className="min-w-0 flex-1 truncate text-[15px] font-medium">
                  {a.name}
                </span>
                <span className="hidden font-mono text-[10px] tracking-widest text-ink-soft uppercase sm:inline">
                  {a.accountType}
                  {a.recordStats?.lastUpdatedAt
                    ? ` · ${daysAgo(a.recordStats.lastUpdatedAt)}`
                    : ""}
                </span>
                <span className="font-mono text-sm tabular-nums">
                  {formatAmount(a.balance.currentBalance, a.balance.currencyCode)}
                </span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </main>
  );
}
