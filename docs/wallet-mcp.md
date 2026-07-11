# Wallet MCP — Usage Guide

The `wallet` MCP server (configured in this project, token in `.env` as
`MCP_TOKEN`) talks to Wallet by BudgetBakers. REST API + MCP are official but
**BETA**, Premium-only, managed at web.budgetbakers.com → Settings → MCP
Server. Docs: https://support.budgetbakers.com/hc/en-us/articles/10761479741586-Rest-API-MCP

## Session protocol

1. `get_client_profile` first. Check:
   - `syncState` — must be `complete` (wait if `syncing`, report if `error`)
   - `grantedScopes` — what operations are allowed
   - `mcpTools` — authoritative tool inventory (20 tools)
2. `_meta` on every GET response has `syncedAt` (last bank→API sync) and
   `rateLimit`.

## Current permissions (as of 2026-07-09)

Read-only: `accounts.read`, `budgets.read`, `categories.read`, `goals.read`,
`labels.read`, `recordRules.read`, `records.read`, `standingOrders.read`.

Write tools (`patch_records`, `create_records`, `patch_categories`,
`create_label`, `delete_documents`, …) are exposed but will be rejected until
write scopes are enabled in web settings. **Auto-categorization requires
`records.update`** — enable it when plan 01 is implemented.

Not available via MCP at all (no tools): record rules (auto-assign patterns),
standing orders, goals — those are read-scoped but have no get/write tools in
`mcpTools` today. Managing automatic rules still means the web app (manual or
Playwright).

## Rate limits

Token bucket per `_meta.rateLimit`: **capacity 300, refill 5/min**. Practical
rules:

- Prefer `get_records_aggregation` over paging `get_records` client-side.
- Batch reads; don't poll. A full monthly evaluation should cost <20 calls.
- If doing large historical pulls, use `limit: 400` on `get_records` (max).

## Filtering conventions (apply to all GET tools)

- **Ranges** (`recordDate`, `amount`, `createdAt`, …): array of max 2 strings
  with `eq.` / `gt.` / `gte.` / `lt.` / `lte.` prefix. UTC. `eq.2026-07-01`
  spans the whole UTC day. Example: `["gte.2026-06-01", "lt.2026-07-01"]`.
- **Text** (`name`, `note`, `counterParty`): `eq.` / `contains.`
  (case-sensitive) or `eq-i.` / `contains-i.`.
- **IDs**: bare UUIDs, comma-separated, no prefix.
- **Pagination**: `limit` + `offset`; response returns `nextOffset` when more
  exist. `total` gives the full count.
- **Sorting**: `sortBy: ["-recordDate", "+name"]`.
- **`categoryId: ["unknown"]`** expands to Unknown income + Unknown expense +
  Uncategorized — the way to find uncategorized records.

## Aggregation cookbook

`get_records_aggregation` is the workhorse for evaluations:

- Monthly spend by category:
  `groupBy: ["month", "category:id"]`, `compute: ["baseAmount:absSum"]`,
  `recordType: "expense"`, `transfersIncluded: false`,
  `recordDate: ["gte.2026-06-01", "lt.2026-07-01"]`
- `baseAmount:*` computes convert to CZK via historical forex — use these for
  cross-currency totals instead of `amount:*`.
- `absSum` mixes income/expense magnitudes → always filter `recordType` or
  group by it.
- Uncategorized backlog: `categoryId: ["unknown"]` + date range.

## Records — fields that matter

- `category`, `labels`, `note`, `counterParty`, `accountName`, `paymentType`
- `transfer`: null for regular records; `{type: paired|unpaired, mirrorRecord}`
  for transfers. Transfers pollute expense stats — exclude with
  `transfersIncluded: false` in aggregations.
- `source`: `android|ios|web|backend|rest|mcp` — `backend` = bank sync import.
- `recordState`: reconciled / cleared / uncleared.

## Key entity IDs

- Uncategorized trio: income `5c5c32c8-0082-8000-8000-000000000000`, expense
  `5c5c32c9-0082-8000-8000-000000000000`, uncategorized
  `5c5c4e23-00c8-8000-8000-000000000000` (or just use `"unknown"`).
- Virtual accounts: Manual Edits `57f71a47-b851-461d-b09e-05f813c1f4b0`,
  Distributed Edit `6237ac26-7861-4b66-be56-64c3f3fee3ef`,
  Raiffeisen CC Manual `eb4dc1fa-1162-4f54-8c10-7cc1f44babe6`,
  La Familia Virtual Inverse `200d4d84-6926-4451-a43c-39435db88c18`.
- Labels worth knowing: Review 🔍 `3d216ece-213c-49a0-97df-5ef1656609ac`,
  Correction ❗ `27045a24-77d6-49c7-8870-eb83248701ca`, Manual Edit ↔️
  `3d21ba06-74df-4b6c-9986-cd6fea033d5c`, Distributed Edit ↔️
  `425bf108-633c-45e9-be30-b61231724895`.
- Don't hardcode more IDs — fetch fresh via `get_categories` /
  `get_accounts` / `get_labels`; user has 31 accounts, 120 categories
  (~30 custom groups), 38 labels, 46 budgets and they evolve.

## Gotchas

- Bank sync is roughly daily; `recordStats.lastUpdatedAt` on accounts shows
  freshness per account. Don't conclude "missing transaction" without
  checking `syncedAt`.
- Some accounts are `excludeFromStats: true` (standing-payment routing
  accounts, the real Raiffeisen CC account that CC Manual mirrors) —
  respect that flag when computing spend.
- Credit-card accounts use special `balanceMode`s; `currentBalance` semantics
  differ (see `balance.formula`).
- `get_budgets` returns pre-computed `spending` (limit/spent/overspent per
  period) — use it instead of recomputing budget progress; `spending`
  parameter controls how many past periods you get.
