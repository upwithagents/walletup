# WalletUp — Agentic Personal/Business Finance

Working name **WalletUp**: agentic automation + management UI on top of
**Wallet by BudgetBakers** (web.budgetbakers.com) for the owner's personal +
business finances (contractor business, music bands, household). Long-term
it may be distributed publicly (Wallet "extension" for others,
possibly multi-provider one day).

## Ground rules

- **Independence from any employer.** This project and its data must stay
  fully separate from any employer's accounts, infra, or tooling. If
  anything employer-related leaks into settings or tooling here, flag it to
  the user. Private specifics (which employer, which accounts/connectors to
  avoid) live in `CLAUDE.local.md` (gitignored, not in this repo) — see
  `CLAUDE.local.md.example` for the shape of that file.
- **PRIVACY (strict):** anything disclosing Wallet details — payees,
  payers, merchants, amounts, record IDs — must be gitignored
  (`agent_reviews/`, `reports/`, gsheet snapshots, app SQLite DB). Only
  code, schema, docs, and plans without personal data get committed.
- **GitHub:** `github.com/upwithagents/walletup`. Contributions push under
  an identity scoped to this project (repo-local git config + its own SSH
  key/credentials), never a contributor's personal or employer GitHub
  identity — see `CLAUDE.local.md` for how the current maintainer set
  theirs up.
- **Secrets** live in `.env` (`MCP_TOKEN`). Never print or commit them.
- Base currency is **CZK** (EUR/USD also in use). Budget month starts on the 1st.

## Architecture (end picture)

1. **Wallet** — source of truth for transactions/budgets (MCP + REST).
2. **WalletUp app** (plan 05) — localhost Next.js+Prisma UI for what Wallet
   can't do: agent-proposal review queue, month evaluation, checks. PWA →
   mobile later.
3. **Discord "WalletUp" server** (plan 04, created) — finance chat +
   agent-posted visuals.
4. **Google Sheet** "Finances - AI powered" — legacy manual layer, now
   secondary visualization/export; may retire eventually. No direct MCP
   access to it today (the available Drive connector isn't usable for this
   project's data — see `CLAUDE.local.md`) — use CSV snapshots in
   `Finances - AI powered GSheet/Snapshot_YYYY_MM_DD/`.

## Session start

1. Call `mcp__wallet__get_client_profile` — check `syncState` (wait if
   `syncing`) and `grantedScopes`.
2. Scopes are currently **read-only**, deliberately: NO Wallet writes until
   the WalletUp MVP review flow exists and the user has reviewed proposals.
   Every applied change must produce a learning note.

## Agent proposals workflow

Agent findings that need user sign-off go to
`agent_reviews/YYYY-MM-DD-<topic>.md` (gitignored): per-item status
`proposal → approved/rejected → applied`. The WalletUp app will absorb this
queue (plan 05 MVP).

## Key docs (read before non-trivial work)

- `docs/wallet-mcp.md` — Wallet MCP: tools, filters, rate limits, gotchas,
  key entity IDs.
- `docs/finance-system.md` — accounts, virtual accounts, Set-Aside system,
  labels, budgets, monthly workflows.
- `claude_plans/` — roadmap + plans; check its `CLAUDE.md` first.

## Conventions

- Branches: `up/<max-3-word-kebab>` (project convention — not the owner's
  personal `lm/` prefix, since this repo may have other contributors one
  day). Large implementation work goes through branches even though this
  repo allows direct commits to `main`.
- App stack: Next.js + TypeScript + Prisma + SQLite (see plan 05). Python
  acceptable for standalone agent CLIs.

## Local/private context

This repo is public (or may become so). Anything identifying (real name,
employer, specific account nicknames) belongs in `CLAUDE.local.md` — a
gitignored file in the repo root, loaded automatically alongside this file.
See `CLAUDE.local.md.example` for its shape; copy it to `CLAUDE.local.md`
and fill it in locally. Never move that content back into a tracked file.

@CLAUDE.local.md
