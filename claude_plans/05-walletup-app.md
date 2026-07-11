# 05 — WalletUp app (personal finance management UI)

Status: PLANNED — this is the centerpiece; plans 01–03 route their
human-facing flows through it.

## Goal

A localhost web app for everything Wallet can't do: reviewing/approving
agent proposals, monthly evaluation, checks dashboard — replacing the
Google Sheet as the working UI (sheet stays as secondary
visualization/export until it becomes redundant).

## End picture (user's words)

1. **Discord** "WalletUp" server (already created) — chat about finances,
   agents post visuals (plan 04).
2. **App** (this plan) — the human's working surface for evaluation and
   approvals.
3. **Sheet** — kept for now, possibly retired later.
4. **Wallet stays the source of truth** for transactions; the app owns
   everything Wallet has no place for (proposals, reviews, evaluations,
   scores, learning notes).

## Stack (decision)

- **Next.js (App Router) + TypeScript**, single full-stack app — user knows
  Next; one stack for UI + API.
- **Prisma + SQLite** — zero-ops local DB, easy migrations; Postgres-ready
  if it ever gets hosted.
- **PWA** from early on — cheap path to Android (and coworker's iPhone)
  without native work; stretch, not MVP.
- Wallet data access: **BudgetBakers REST API** (same token as MCP, in
  `.env`) — verify base URL + endpoints from the web-app settings docs as
  first implementation step; fall back to routing reads through the agent
  if REST differs from MCP capabilities.
- Distribution potential: keep Wallet-specific code behind one thin
  `providers/wallet.ts` module (future multi-provider / public release as
  "WalletUp"), but no over-engineering for MVP.

## Core domain model (Prisma sketch)

- `Proposal` — agent suggestion: recordId, kind (categorize/label/delete/
  fix), payload (proposed categoryId etc.), evidence, confidence, status
  (proposal/approved/rejected/applied), reviewNote, timestamps, runId.
- `AgentRun` — one agent pass: date, type (categorization/checks/eval),
  summary, stats.
- `LearningNote` — per resolved proposal: what the agent learned (feeds
  future categorization prompts + memory).
- `MonthEvaluation` + `CategoryScore` — month, category, aim, actual,
  score 0/1/2, notes (mirrors gsheet Budgets tab).
- `CheckRun` + `CheckResult` — plan 03 outputs (PASS/WARN/FAIL + evidence).

## MVP scope (phase 1)

1. Scaffold app (`walletup-app/` inside this repo), Prisma + SQLite,
   `.env` sharing with repo root.
2. **Review queue**: import agent proposals (from `agent_reviews/*.md` or
   directly — agent writes into SQLite via a small `pnpm import` script /
   API route), list with evidence, one-click approve/reject + note.
3. Wallet read layer: accounts, records, budgets pull + local cache
   (enables fast UI and offline-ish work).
4. **Apply step stays with the agent**: session reads approved proposals
   from the DB, applies via MCP write tools, marks `applied`, writes
   `LearningNote` + memory entry. (App itself doesn't write to Wallet in
   MVP.)

## Phase 2

5. Month evaluation screen (plan 02 rendered live: actual vs aim, 0/1/2
   scoring, season averages) with export to sheet/markdown.
6. Checks dashboard (plan 03 results + history, DONE-log).
7. Set-Aside tracker (progress bars per item, DUE dates).

## Phase 3 / stretch

8. PWA install on Android (+ iPhone), LAN or tailscale access.
9. Discord bot posting charts/summaries from the app's API (plan 04).
10. Multi-provider abstraction, public release under upwithagents/walletup.

## Privacy

The SQLite DB, generated reports, and anything containing payees/amounts
are gitignored. Only code and schema go to the future GitHub repo.

## Definition of done (MVP)

User opens localhost, sees the 2026-07-10 categorization proposals with
evidence, approves/rejects each; an agent session applies approved ones to
Wallet, and each application is recorded as a learning note.
