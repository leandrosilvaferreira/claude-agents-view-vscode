# Claude Code 2.1.286 compatibility validation

Validated on 2026-09-30 (UTC). The CLI on PATH reports 2.1.286 and both the CLI and the IDE-bundled
Claude Code extension stamp live transcripts with it; the previous pin was 2.1.284. Versions in the
local corpus since then: 2.1.285 (first entry 2026-09-30 04:33 UTC) and 2.1.286 (first entry 2026-09-30
21:11 UTC); nothing newer exists. 2.1.286 was a little over two hours old when the schema run started, so
only 3 top-level and 11 subagent transcripts carried it at that point.

## What ran

- `npm run schema:generate` over the full local corpus — 7,080 files, about 2.6 million entries, 12 minutes
  (23:36–23:48 UTC), 0 parse errors, `unknownTypes` still empty. It merges into the committed observations
  (last run 2026-09-29): 2 new CLI versions (2.1.285, 2.1.286), no entry `type`/`subtype` bucket added or
  removed (30 before and after), 16 fields added, 1 removed and 2 widened — all tool-input keys, API-usage
  telemetry or attachment/queue metadata — and no field flipped between required and optional.
- An independent key comparison of the transcripts written since 2.1.280: 51,824 top-level entries (142
  transcripts) and 216,825 subagent entries (329 transcripts) stamped 2.1.285–2.1.286, against 214,402 (731)
  and 550,736 (1,456) stamped 2.1.280–2.1.284.
- A replay of the extension's own `LogParser` and `refreshSessionStatuses` over the 142 top-level sessions and
  330 subagent transcripts of 2.1.285–2.1.286 (52,487 lines), cross-checked against a separate re-derivation
  of the same signals from the raw JSON; ten of those sessions were also replayed line by line (up to
  12,250 lines) and compared with a cold parse of the same bytes.
- The full suite: `npx tsc --noEmit`, `npm run lint`, `npm run format:check`, `npm run test`,
  `npm run build`, `npm run compile:scripts`.

## Schema: additive, nothing the parser reads

No entry `type`/`subtype` bucket appeared or vanished. The 16 added field paths:

- `renderedRole` on `attachment` entries (`system` 32,176 times, `user` 1,189 in this window).
- `message.usage.fallback_credit` on `assistant` turns (always `null`) and `toolUseResult.usage.fallback_credit`.
- `queue-operation.commandUuid` (2.1.285, on `remove` operations) and `queue-operation.deliveryId` (2.1.286);
  `attachment.delivery_id` on `queued_command` attachments (2.1.286).
- `attachment.builtInTypes[]` on `agent_listing_delta`, `attachment.newlyDropped.reasonCounts.other` on
  `thinking_drop`, `toolUseResult.ghRateLimitHint` (3 entries).
- Tool-input keys of built-in tools: `character`, `filePath`, `line`, `operation` from the `LSP` tool
  (6 calls, all 2.1.285), plus one `describe` and one `destination` on `Bash` calls.

The one removed path, `message.content.[].input.context`, is the generator's baseline sanitizer
collapsing a legacy literal tool-input leaf this run did not re-observe; the two widened types are the
tool-input `persistent` (boolean | string — three `Monitor` calls pass a string) and the deferred-tool
`input_schema.additionalProperties` (boolean | object). None of the 19 paths is one the parser reads.

## Entry shapes the parser reads: unchanged

- Only `user` (3,997) and `assistant` (6,275) entries carry `message`; every other bucket (`attachment`,
  `queue-operation`, `last-prompt`, `ai-title`, `cost-state`, every `system:*`) carries none, so both turn gates
  (`message`-bearing turns, `isSidechain`) still hold.
- `Agent` tool_use inputs use no key outside the 2.1.280–2.1.284 set (`description`, `model`, `name`, `prompt`,
  `run_in_background`, `subagent_type`; `isolation` did not recur) and `SendMessage` inputs are the same six
  (`content`, `message`, `recipient`, `summary`, `to`, `type`). The first result of the 330 answered launches is
  an `async_launched` ACK 290 times (139 of them for calls that did not set `run_in_background`), a synchronous
  `completed` 34 times, or a plain string 6 times (2 rejected tool uses and 4 "Concurrent subagent limit
  reached" errors, which `markStopped` closes like a completion) — no new `toolUseResult.status`, no new ACK
  shape.
- `<task-notification>` carries the same child tags as in 2.1.280–2.1.284 (`task-id`, `summary`, `status`,
  `output-file`, `tool-use-id`, `note`, `result`, `usage`, `subagent_tokens`, `tool_uses`, `duration_ms`,
  `event`); the first-match regexes are unaffected.
- `cost-state` keeps its 12 keys; no new `system` subtype appeared (`stop_hook_summary`, `turn_duration`,
  `away_summary`, `local_command`, `informational`, `compact_boundary`). `api_error`, `agents_killed` and
  `model_refusal_fallback` simply did not occur in this smaller sample.
- Every one of the 330 sidecars beside a 2.1.285–2.1.286 subagent transcript carries `agentType`,
  `description`, `toolUseId`, `spawnDepth`, `requestShape`, `requestNonInteractive` and `model` (plus `name`
  on 12); `entrypoint` stays `claude-vscode`, `cli`, `sdk-cli` or `sdk-py`.

## Behavior on real transcripts

The 142 top-level sessions are 15 `claude-vscode`, 3 `cli`, 120 `sdk-cli` and 4 `sdk-py`, with 0 malformed
lines. Against the independent re-derivation the parser agrees on every session for `shutdownRecorded`,
`lastEntryType`, `lastEntryIsThinking`, `lastEntryIsInterruption`, `lastEntryIsApiError`, the project path (the
last `cwd`), the subagent count (334 launches in 14 sessions) and the working-subagent count (296 launches
with no SendMessage addressed to them; the other 38 are excluded from that count). 141 sessions have a
title (20 carry an `ai-title`); the one untitled session ran only the `/plugin` slash command. 136 `cost-state`
markers end 129 sessions: all 129 read `stopped` after the refresh, none with a working subagent, while the 13
unlatched sessions read 4 `working` and 9 `stopped`. The CLI's own
`turn_duration.pendingBackgroundAgentCount` (10 samples) equals the number of open background launches the
independent pass derives in all 10. The status refresh flipped no subagent and the 330 subagent transcripts all
parse as sidechains with a model and a project path. Cold and line-by-line parses of the ten replayed sessions
are identical at every one of ten checkpoints and at the end (one live session differs only in property
insertion order inside its subagent objects).

## Automated verification and limits

`npx tsc --noEmit`, `npm run compile:scripts`, `npm run lint` (ESLint and jscpd: 0 clones),
`npm run format:check` and `npm run build` pass. `npm run test` ran 845 tests across 60 files (844 passed, 1
skipped — a Windows-only case), including the committed schema golden master, which also passes unchanged
against the regenerated fixtures. The regenerated schema artifacts were reviewed and not committed: nothing
depends on them, and about 5,600 changed lines of sample-count churn would bury the 19 structural lines.

One machine, macOS only, no interactive VS Code Extension Host/UI test. No `<forked-skill-launch>` entry, no
in-process teammate `idle_notification`, no `system:agents_killed` and no grandchild subagent
(`parentAgentId` sidecar) occurs in the 2.1.285–2.1.286 top-level transcripts, so those paths were not
re-validated on these versions. 2.1.286 was a few hours old when validated.
