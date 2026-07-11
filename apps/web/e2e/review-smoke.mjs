// Smoke test for the review desk: approve a proposal with a note, verify the
// stamp + counters, then undo and verify the row returns to the open state.
// Run with the dev server up:  node apps/web/e2e/review-smoke.mjs [baseUrl]
import { chromium } from "playwright";

const BASE = process.argv[2] ?? "http://localhost:3311";
const failures = [];

function check(name, ok, extra = "") {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${extra ? ` — ${extra}` : ""}`);
  if (!ok) failures.push(name);
}

const browser = await chromium.launch({ channel: "chrome", headless: true });
const page = await browser.newPage({ viewport: { width: 1100, height: 900 } });

await page.goto(`${BASE}/review`, { waitUntil: "networkidle" });
check("page loads", (await page.title()) === "WalletUp");

const counters = page.locator('[data-testid="counters"]');
const before = await counters.innerText();
const waitingBefore = Number(before.match(/(\d+) waiting/)?.[1] ?? NaN);
check("counter line present", Number.isFinite(waitingBefore), before.trim());

await page.screenshot({ path: "/tmp/walletup-review-initial.png", fullPage: true });

// Pick the first undecided row (no stamp in its summary line).
const row = page
  .locator("details.proposal")
  .filter({ hasNot: page.locator(".stamp") })
  .first();
const rowTitle = await row.locator("summary span.block").first().innerText();
console.log(`… exercising row: ${rowTitle}`);

await row.locator("summary").click();
await row.locator('textarea[name="note"]').fill("smoke-test note (will be undone)");
await row.getByRole("button", { name: /^(Approve|Answer & approve)$/ }).click();

await page.waitForFunction(
  (want) => document.querySelector('[data-testid="counters"]')?.textContent?.includes(`${want} waiting`),
  waitingBefore - 1,
);
await page.waitForLoadState("networkidle");
const stamped = page.locator("details.proposal").filter({ hasText: rowTitle }).first();
check(
  "stamp appears after approve",
  /approved/i.test(await stamped.locator(".stamp").innerText()),
);
check(
  "review note shown on row",
  (await stamped.innerText()).includes("smoke-test note (will be undone)"),
);
await page.screenshot({ path: "/tmp/walletup-review-approved.png", fullPage: true });

// Undo — the row may still be expanded from before the re-render
const isOpen = await stamped.evaluate((el) => el.hasAttribute("open"));
if (!isOpen) await stamped.locator("summary").click();
await stamped.getByRole("button", { name: "Undo decision" }).click();
await page.waitForFunction(
  (want) => document.querySelector('[data-testid="counters"]')?.textContent?.includes(`${want} waiting`),
  waitingBefore,
);
await page.waitForLoadState("networkidle");
const restored = page.locator("details.proposal").filter({ hasText: rowTitle }).first();
check("undo removes stamp", (await restored.locator(".stamp").count()) === 0);

// Open questions must not submit without an answer (HTML required).
const question = page
  .locator("details.proposal")
  .filter({ has: page.locator('textarea[required]') })
  .first();
if ((await question.count()) > 0) {
  await question.locator("summary").click();
  await question.getByRole("button", { name: "Answer & approve" }).click();
  const invalid = await question
    .locator('textarea[name="note"]')
    .evaluate((el) => !el.checkValidity());
  check("open question requires an answer", invalid);
} else {
  console.log("…  no open questions in queue, skipping required-note check");
}

await browser.close();

if (failures.length > 0) {
  console.error(`\n${failures.length} check(s) failed`);
  process.exit(1);
}
console.log("\nAll smoke checks passed. Screenshots: /tmp/walletup-review-*.png");
