---
name: architecture-transcript-bookkeeping-entries
description: Bookkeeping entries carry no `message`, so turn signals gate on `message` — but since CLI 2.1.301 `api-request-blob` carries `message` and is NOT a turn (dropped in parseLogLine).
metadata:
  type: architecture
---

Claude Code writes non-conversational bookkeeping entries between real turns: `attachment` (by far
the most frequent), `last-prompt`, `queue-operation`, `ai-title`, `file-history-snapshot`,
`api-request`, `api-request-shape`, `agent-color`, `atis-latch`, `mode`. None carries `message`.
Antigravity entries never carry `message` either (`type` is UPPER_SNAKE_CASE). EXCEPTION (CLI
2.1.301+): `api-request-blob` `{type, sessionId, hash, message:{role, content}}` — a copy of a
user/assistant turn already written as its own entry (no timestamp/toolUseResult), or the request's
system prompt (role `system`). Read as a turn it stopped every running background subagent (the ACK
copy lacks `status:'async_launched'`), wiped `stoppedAt` and hid an awaited reply.

**Why:** a "last entry type" tracked from `type` alone is overwritten by the bookkeeping line after
a real turn, erasing "Claude owes a reply" (real 116s gap between a `tool_result` and the next
`thinking`). The blob exception broke the opposite way and cost a live-session investigation
(2026-10-21): `message` present no longer means "a turn".

**How to apply:** turn-level signals gate on `json.message` (brand-agnostic), and any new
`message`-bearing request-log type must be dropped in `LogParser.parseLogLine` next to
`isApiRequestBlob` (transcriptEntry.ts). See [[architecture-no-public-transcript-schema]] and
[[reference-transcript-subagent-layout]].
