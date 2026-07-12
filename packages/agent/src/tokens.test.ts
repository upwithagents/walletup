import assert from "node:assert/strict";
import { test } from "node:test";
import { extractTokens, rankVotes } from "./tokens.ts";

test("extractTokens strips czech bank boilerplate", () => {
  const t = extractTokens("Částka: 300 CZK 26.06.2026 Místo: Pod hvezdickami Braskov");
  assert.deepEqual(t, ["hvezdickami", "braskov"]);
});

test("extractTokens handles card-terminal all-caps notes", () => {
  const t = extractTokens("JIRI KUCERA REZNIKUZ   KACICE      CZE");
  assert.ok(t.includes("reznikuz"));
  assert.ok(t.includes("kucera"));
  assert.ok(!t.includes("cze"));
});

test("extractTokens drops numbers and short words", () => {
  const t = extractTokens("DT Slovak Rail (€1.00) 123456");
  assert.deepEqual(t, ["slovak", "rail"]);
});

test("rankVotes: dominant repeated category is high confidence", () => {
  const r = rankVotes([
    { categoryId: "a", categoryName: "Transfer", count: 11, lastSeen: "2026-06-07" },
  ]);
  assert.equal(r.confidence, "high");
  assert.equal(r.best?.categoryName, "Transfer");
});

test("rankVotes: single match is medium", () => {
  const r = rankVotes([
    { categoryId: "a", categoryName: "Groceries", count: 1, lastSeen: "2026-01-19" },
  ]);
  assert.equal(r.confidence, "medium");
});

test("rankVotes: split vote is medium", () => {
  const r = rankVotes([
    { categoryId: "a", categoryName: "A", count: 2, lastSeen: "2026-06-01" },
    { categoryId: "b", categoryName: "B", count: 2, lastSeen: "2026-05-01" },
  ]);
  assert.equal(r.confidence, "medium");
  assert.equal(r.best?.categoryName, "A");
});

test("rankVotes: no matches asks the user", () => {
  const r = rankVotes([]);
  assert.equal(r.confidence, "needs_input");
  assert.equal(r.best, null);
});
