# 02 — Monthly evaluation (Budgets tab + presentation notes)

Status: PLANNED

## Goal

Generate the monthly budget evaluation that today is manual work in the
gsheet **Budgets** tab (formerly MFA): actuals per category vs Aim, 0/1/2
scoring, season averages — plus a short "Presentations" summary when the
month's findings are worth sharing with the family.

## Current state

- Gsheet Budgets tab: categories grouped (Food 🍎, Shopping/Services 🪙,
  House 🏠, …), Aim per category, monthly actuals per 4-month season
  (Jul–Oct / Nov–Feb / Mar–Jun), score 0/1/2 per month, AVG/Month columns.
- Wallet already has 46 monthly budgets incl. rollups and OVERALL
  (140k CZK/month) — `get_budgets` returns pre-computed spent/limit/overspent
  per period (`spending: "current+N"` for history).
- The gsheet category rows map to Wallet custom categories (mapping in the
  Categories/Labels tab; emojis match).
- MFA tab is a frozen before/after-Nov-25 analysis — reference, not to
  automate.

## Approach

1. **Data pull** (read-only, works today): for a given month,
   `get_budgets(spending: current+N)` for budget-vs-limit, plus
   `get_records_aggregation` (groupBy month + category:id,
   baseAmount:absSum, transfersIncluded: false, recordType: expense) for
   category actuals not covered by budgets. Respect `excludeFromStats`
   accounts and the Vacation Correction 🌴 convention.
2. **Report**: markdown report per month mirroring the sheet's structure —
   per group: actual vs aim, score (2 = within aim, 1 = near, 0 = blown;
   confirm exact thresholds with user — infer from historical scores first),
   season-to-date averages, notable outliers, uncategorized total.
3. **Write-back**: start with markdown in `reports/` (or pasteable block);
   later optional Google Sheets API/MCP write to the Budgets tab. CSV
   snapshot folder is the fallback data source for reading the sheet.
4. **Presentation notes**: end each report with 1–5 plain-language tips in
   the style of the Presentations tab (e.g. "YT premium from mbank").

## Steps

1. [ ] Reverse-engineer the 0/1/2 scoring rule from existing sheet data;
   confirm with user.
2. [ ] Build the month report as a session procedure; validate June 2026
   output against the user's manual evaluation.
3. [ ] Turn into Python CLI (`wallet_tools eval --month 2026-06`) emitting
   markdown.
4. [ ] Decide write-back path (Google Sheets API vs keep markdown) with user.
5. [ ] Automate month-end run + reminder.

## Dependencies / blockers

- None for read/report. Google Sheets write access only if write-back wanted.

## Definition of done

At month end, one command/session produces an evaluation the user pastes (or
auto-writes) into the sheet in <5 min, replacing ~an evening of manual work.
