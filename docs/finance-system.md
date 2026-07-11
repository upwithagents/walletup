# Finance System — How the Wallet Data Is Organized

Source of truth: the "Finances - AI powered" Google Sheet
(`Finances - AI powered GSheet/CLAUDE.md` has the URL; CSV snapshots live in
`Snapshot_YYYY_MM_DD/`). This doc condenses it plus live Wallet data.

## Context

- Contractor (programming income via own business) + musician (several
  bands) + household. Finances moved to Wallet around
  Oct/Nov 2025 ("before/after" split used in the MFA analysis tab).
- Everything runs *inside* Wallet: bank sync imports, auto-categorization
  rules, planned payments, budgets. The gsheet is the manual analysis layer
  on top — that's what we're automating.

## Accounts (31 total)

**Real, bank-synced:** Air Bank, ČSOB (main, ~1300 records), ČSOB Savings,
Fio, Fio EUR, Fio Savings EUR - Iron Reserve, Fio Savings - Retirement, KB,
mBank, mBank Business, Raiffeisen, Raiffeisen CC, Revolut (+EUR/USD), plus
routing accounts **Monthly Standing Payments**, **Annual Standing
Payments-Goals** and **SAVINGS - Annual Standing Payments-Goals** (the last
three are `excludeFromStats`).

**Manual (no working bank connection):** Raiffeisen Savings - Repairs/Goals
(synced by hand from online banking — Check #2), Raiffeisen CC Manual
(mirror of the real, bank-synced Raiffeisen CC account, must balance to 0
monthly — Check #3), ČSOB Kontokorent, Hotovost (cash, archived).

**Virtual/technical accounts** (bookkeeping devices, not real money):
- **Manual Edits** — counterpart for manual corrections; must net to 0
  (Check #4).
- **Distributed Edit** — holds annual costs spread across months (see
  Distributions below); must net to 0 over the year.
- **La Familia Virtual Inverse** — offsets band cash flowing through
  personal accounts.

**Investments:** eToro (USD), Portu, Conseq, UNIQA (archived), Real Estate
(Mortgage-type account).

## Income streams (custom income categories)

- Programming Income 💻 — the main business income.
- Music 🪇 per band/gig: Bodeguita, Carisma, Cuatro Por Cinco, Atarés,
  La Familia (+Duo/Taxed), Latin Soul, Elinor Marsi, Millenix, Pragasón,
  plus "- Eli" variants (partner's share).
- Workshop Income 🔨, Bazaar 🏷️, Savings Interest 💰, Social Income 💵, etc.

## Set-Aside system (gsheet tab: Set-Aside)

Invoice income gets distributed to purpose accounts. Transfers are tagged
with Set-Aside labels: Payments 🔮, Goals 🐖, Mortgage 🔴, Living Expenses 🟡,
Data 🟢, Retirement 🔵, Return ⚪. Monthly set-asides (1st–3rd of month) cover
annual bills: electricity (~2000/mo), water (1750/mo), extra taxes (2304/mo),
income-tax downpayment (2120/mo), car insurance (1500/mo), etc. Each item in
the sheet tracks DUE date, monthly amount, and PROGRESS.

## Distributions (gsheet tab: Distributions)

Annual/irregular costs (extra health/social insurance, income tax
downpayments, property tax, …) are estimated (avg of last 2 years; income-tax
growth coefficient 1.185617978), divided by 12 (or 6), and spread as planned
monthly expenses on the **Distributed Edit** account with labels
Distributed ↔️ + Tax 💸. Re-confirmed each May after taxes. This keeps
monthly spending stats smooth.

## Labels (38)

Three families:
- **Transfer mechanics:** Transfer Between Accounts, Currency Exchange,
  Investment Withdrawal, Manual Edit, Distributed Edit, Excluded ✖️,
  Correction ❗, Review 🔍, Extra ➕.
- **Set-Aside** (see above).
- **Reimbursement pairs:** Payment/Fuel/Musician Reimbursement
  (Incoming/Outgoing), La Familia Room/Audio/Purchase/Account Income —
  tracking band money and shared costs through personal accounts.

**Review 🔍** marks records needing human attention — useful hook for the
categorization agent.

## Budgets

46 monthly budgets in Wallet, mirrored/evaluated in the gsheet Budgets tab.
Structure: per-topic budgets (⚡ ELECTRICITY/GAS/HEATING 8k, 🛞 FUEL 6k, …)
plus rollups (🍎 FOOD: OVERALL 23k, 🏠 HOUSE: OVERALL 50k, 🪙 SHOP: OVERALL
20k, 💵 FINANCIAL: OVERALL 23k, 👶🏻 CHILDREN: OVERALL 13k, ♫ BUSINESS:
OVERALL 2k, ✈️ TRAVEL: OVERALL 1k, ﹖UNCATEGORIZED 2k) and a global
**OVERALL 140,000 CZK/month**.

## Monthly workflows (what we automate)

1. **Categorization sweep** (Checks #1): walk recent records until all are
   correctly categorized; update automatic rules where possible. Wallet's
   pattern rules + own categorization still leave ~40% manual.
2. **Budgets evaluation** (gsheet Budgets tab): per category compare actuals
   vs "Aim" per month, grouped into 4-month seasons (SUMMER/AUTUMN 25 =
   Jul–Oct, AUTUMN/WINTER 26 = Nov–Feb, SPRING 26 = Mar–Jun); score each
   month 0/1/2 (2 = within aim); track season averages.
3. **Checks** (gsheet Checks tab): numbered procedures with steps + DONE log,
   e.g. #2 manual Raiffeisen Savings sync, #3 CC mirror reconciliation
   (BLUE transfer / GREY excluded / RED correction pattern), #4 balance
   checks (Manual Edit = 0, Distributed Edit sums to 0 over year, keyword
   sweep list in the sheet).
4. **Presentations** (gsheet tab): occasional summaries/tips for the family
   "broader team" (e.g. "YT premium from mbank", "don't pay large Alza
   purchases from CC").
5. **MFA** (gsheet tab): before/after Nov-2025 comparison (Urxova vs Libušín
   era), monthly averages per category — the analytical template monthly
   evaluations grew out of.
