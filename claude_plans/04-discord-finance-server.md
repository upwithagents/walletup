# 04 — Discord "WalletUp" server (stretch)

Status: PLANNED — server created by user 2026-07-10; bot work starts after
plan 05 MVP. Discord complements (does NOT replace) the WalletUp app: chat
about finances + agents posting visuals from the app/sheet.

## Goal

A Discord server (modeled on `../../web/disco-factory`) where finances are
discussed/handled with the "broader team" (family): monthly evaluation posts,
budget alerts, presentation tips, and an ask-the-agent channel.

## Sketch

- Reuse the disco-factory pattern (server provisioning, bot, channels) —
  study that repo before designing; keep this project's bot/token fully
  separate from any employer/work Discord assets.
- Channels: #monthly-evaluation (plan 02 output), #alerts (budget overspend
  from `get_budgets` progress, uncategorized backlog from plan 01/03),
  #tips (Presentations tab content), #ask (bot answers finance questions via
  Wallet MCP read-only).
- Bot: Python (discord.py) + Claude API + Wallet REST/MCP token. Read-only
  Wallet access for the bot; any write flows stay in Claude Code sessions.
- Privacy: family-only server; no real account numbers in messages; amounts
  OK per user's judgment — confirm with user before first post.

## Prerequisites

- Plans 01–03 producing stable outputs worth publishing.
- User decision on hosting (local cron vs small VPS) and on what family
  members should see.

## Definition of done

Monthly evaluation and overspend alerts arrive in Discord automatically;
family can ask simple questions and get answers grounded in Wallet data.
