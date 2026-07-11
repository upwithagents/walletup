# 01 — Auto-categorization of incoming transactions

Status: PLANNED

## Goal

Cut manual categorization (~40% of incoming records today) to near zero.
An agent proposes a category + labels for every new uncategorized record,
applies high-confidence ones automatically, and queues the rest for one-tap
review.

## Current state

- Bank sync imports land as `source: backend`; Wallet's own rules +
  auto-categorization catch ~60%.
- Uncategorized = category in the "unknown" trio (query with
  `categoryId: ["unknown"]`). On 2026-07-09 the backlog since June 1 was only
  12 records / ~9.9k CZK, but it grows whenever mobile categorization lapses
  (gsheet Checks #1).
- MCP scopes are read-only. `patch_records` exists but needs `records.update`
  enabled at web.budgetbakers.com/settings/mcp-server.
- Wallet's automatic rules (pattern matching) are NOT exposed via MCP —
  improving them stays manual/web (or Playwright, later, if ever needed).

## Approach

Two phases, both runnable as a Claude Code skill/session first, Python CLI
second:

**Phase A — propose (read-only, works today)**
1. Fetch uncategorized records (`get_records`, `categoryId: ["unknown"]`,
   sensible date window) + records labeled Review 🔍.
2. Build a matching corpus: for each uncategorized record, search history by
   `counterParty` / `note` substrings (`contains-i.`) for previously
   categorized records; rank candidate categories by frequency + recency.
3. LLM fallback for no-history merchants: classify against the 120-category
   list (docs/finance-system.md gives the semantics; amounts/account/payment
   type are features — e.g. mBank ≈ Eli's spending, mBank Business ≈ business).
4. Output a proposal table: record → category, confidence, evidence.

**Phase B — review & apply (via WalletUp app, plan 05)**
5. Proposals go to `agent_reviews/YYYY-MM-DD-categorization.md` (gitignored)
   and, once the app exists, into its SQLite review queue.
6. User approves/rejects in the WalletUp app (until then: in the markdown).
   NO auto-apply, even high-confidence — user decision per record for now;
   revisit thresholds once accuracy is proven.
7. Agent applies approved items via `patch_records` (needs `records.update`,
   deletions need `records.delete`), marks them `applied`, tags with an
   audit label, and records a learning note per item (memory + app DB) —
   every categorization is a learning lesson.

## Steps

1. [x] Build the propose flow as a repeatable session procedure — run
   2026-07-10, 12 records + 4 bonus fixes → `agent_reviews/2026-07-10-categorization.md`.
2. [ ] WalletUp MVP review queue (plan 05) — blocker for apply.
3. [ ] User reviews proposals; enables `records.update` (+ `records.delete`).
4. [ ] Apply flow + learning notes.
5. [ ] Wrap propose as Python CLI or app-triggered job; schedule
   daily/weekly runs.

## Dependencies / blockers

- Plan 05 MVP (review flow) — user decision: no writes before that.
- Write scopes (user action in web settings) at apply time.

## Definition of done

A daily/weekly run leaves ≤ a handful of genuinely ambiguous records for
manual review, each pre-tagged Review 🔍 with a proposed category in a report.
