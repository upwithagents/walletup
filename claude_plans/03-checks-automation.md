# 03 — Checks automation (finance health checks + remedies)

Status: PLANNED

## Goal

Turn the gsheet **Checks** tab (numbered manual procedures with steps and a
DONE log) into agent-runnable health checks that detect issues, propose the
documented remedy, and — once write scopes exist — apply routine fixes.

## Current state (checks in the sheet)

1. **Expense tracking after inactivity** — uncategorized sweep. Overlaps
   with plan 01; the check here is *detection* (backlog size + oldest).
2. **Raiffeisen Savings manual sync** — manual account; compare Wallet
   records vs online banking. MCP can only detect staleness
   (`recordStats.lastUpdatedAt` / no records in >1 month); actual sync stays
   manual (or Playwright against Raiffeisen — out of scope for now).
3. **Raiffeisen CC Manual vs the real Raiffeisen CC account** — mirror
   reconciliation: BLUE transfer (Raiffeisen → CC Manual "Credit Card
   Repayment Raiffeisen"), GREY excluded mirror on the real account
   ("Splátka klienta"), RED correction ("Balancing to 0 - Unused CC"); CC
   Manual balance must be 0.
4. **Check balances** — Manual Edits account nets 0; Distributed Edit nets 0
   over the year (if not, keyword sweep: Set-Aside, Income Tax Downpayment,
   Extra Social/Health Insurance, Therapy, Dentist, … full list in sheet).
5+. (see sheet for the rest — snapshot CSV truncates; re-read the live sheet
   when implementing.)

All of these are **querying + arithmetic over records/accounts** → mostly
automatable read-only today.

## Approach

- One runner, N checks, each returning PASS / WARN / FAIL + evidence +
  suggested remedy (the sheet's own STEP text).
- Read-only detection first (works with current scopes). Remedies that
  create/edit records (balancing transfers, label fixes) gated behind write
  scopes and explicit user confirmation per remedy — money records are
  hard to un-mess.
- Output: `checks report` markdown, mirroring the sheet's NUM/NAME/STEP
  structure, with a DONE-log line the user can copy to the sheet.
- Implementation: same Python package as plan 01 (`wallet_tools checks`),
  prototyped as a session procedure first.

## Steps

1. [ ] Read the full live Checks tab (CSV truncated) and enumerate every
   check with its detection rule + remedy.
2. [ ] Implement detections for #1, #3, #4 (pure MCP queries).
3. [ ] Implement staleness detection for manual accounts (#2).
4. [ ] Validate a full run against the user's latest manual check
   (May 2026 end).
5. [ ] Add remedy execution (write scopes + per-action confirm).
6. [ ] Schedule monthly run before the month evaluation (plan 02).

## Dependencies / blockers

- Full Checks tab content (live sheet read or fresh CSV export).
- Write scopes for remedies only.

## Definition of done

Monthly "checks" run reports each check PASS/FAIL with evidence in <1 min;
routine remedies applied with one confirmation each.
