# claude_plans — conventions

Implementation plans for the Wallet automation roadmap. Unlike other
projects, plans here are **tracked in git** — this local-only repo is the
project's single home and the plans are a core deliverable.

- One file per plan: `NN-short-name.md`, ordered by priority.
- Each plan: Goal, Current state, Approach, Steps, Dependencies/Blockers,
  Definition of done. Keep them executable — a fresh session should be able
  to pick one up cold after reading `../CLAUDE.md` + `../docs/`.
- Update the plan's Status line when work starts/finishes; don't delete
  completed plans, mark them DONE.
- No JIRA/GitHub issue pipeline here.

## Roadmap

| # | Plan | Status |
|---|------|--------|
| 01 | Auto-categorization of incoming transactions | Phase A DONE (proposals in agent_reviews/); apply blocked on 05 MVP |
| 02 | Monthly evaluation (Budgets tab + presentation notes) | PLANNED (UI moves to 05 phase 2) |
| 03 | Checks automation (finance health checks + remedies) | PLANNED (UI moves to 05 phase 2) |
| 04 | Discord "WalletUp" server (server created 2026-07-10) | PLANNED (bot after 05 MVP) |
| 05 | WalletUp app — review queue, evaluations, checks UI | PLANNED — centerpiece, next up |

## Cross-plan conventions

- Agent proposals are written to `agent_reviews/YYYY-MM-DD-<topic>.md`
  (gitignored — contains payees/amounts) with per-item status:
  proposal → approved/rejected → applied.
- No Wallet write operations until the WalletUp MVP review flow exists;
  every applied change must produce a learning note (memory + DB).
