# Claude Code 2.1.306 compatibility validation

Validated on 2026-10-21 (UTC). The CLI on PATH reports 2.1.306; the previous pin was 2.1.286, and
`KNOWN_COMPATIBLE_CLAUDE_VERSION` (`src/claudeCompat.ts`) now moves to 2.1.306. The local corpus has versions 2.1.287
through 2.1.306. Unlike the [2.1.286 bump](claude-code-2.1.286-validation.md), this one is not purely additive: Claude
Code 2.1.301 started writing four new entry `type` values into transcripts, and the parser misread one of them,
`api-request-blob`, as real conversation turns. The parser is fixed in the same change, and the pin moves only together
with that fix.

## What ran

- `npm run schema:generate` over the full local corpus (`~/.claude/projects`) — 7,679 files, 3,724,014 entries, about
  250 seconds, 0 parse errors, `unknownTypes` still empty. It merges into the committed observations (last run
  2026-09-29, up to 2.1.284): 4 entry `type` buckets added (30 before, 34 after), all first seen on 2.1.301, plus
  additive fields on existing entries, none of them read by the parser.
- A scan of the same corpus for `api-request-blob` lines, the one new bucket that carries a `message`: which files have
  them, and whether any id they carry is missing from the entries of the same file.
- The extension's own `LogParser` run over every file that carries blobs, as written and again with its blob lines
  removed, comparing the resulting `Session` fields.
- A comparison with an independent source of truth, the `finished: true` flag that subagent sidecars carry from 2.1.301,
  over 69 recent transcripts.
- Line-by-line replays: one real 2.1.306 session in which the bug showed, and 5 large transcripts (61,184 lines).
- A scan of the Antigravity and Codex logs for the same lines.
- The full suite: `npx tsc --noEmit`, `npm run lint`, `npm run format:check`, `npm run test`, `npm run build`,
  `npm run compile:scripts`.

## Schema: what changed

Four entry `type` buckets appeared. `agent-color` dates from 2.1.288; the other three, first seen on 2.1.301, are how
Claude Code logs every API request in the session transcript from that version on:

- `api-request` — a per-request log line: `params` (model, betas, max_tokens, thinking, context_management,
  output_config), `base` / `keep` / `tail` (a delta encoding of the messages sent), `cacheControl`, `requestDigest`,
  `shapeHash`, `querySource`, `version` and `timestamp`. No `message`.
- `api-request-shape` — `shape` (system, tools), `shapeHash`, `version` and `timestamp`. No `message`.
- `api-request-blob` — `{type, sessionId, hash, message: {role, content}}`, plus `agentId` in subagent transcripts. One
  content-addressed blob per message not logged before, written just before the `api-request` line of the next request.
  A `user` or `assistant` blob is a copy of a turn that already has its own entry, without that entry's `timestamp`,
  `uuid`, `isSidechain` or `toolUseResult`. A `system` blob carries the request's system prompt and tool list and copies
  no turn.
- `agent-color` — `{type, agentColor, sessionId}`. No `message`.

`api-request-blob` is the only one of the four with a `message`. That breaks the invariant recorded in the 2.1.286
notes, that only `user` and `assistant` entries carry one, and every reader gated on `message` took a blob for a real
turn (see [The parser change](#the-parser-change)).

Additive fields on existing entries — none is read by the parser:

- `assistant`: `requestRef`, `requestedModel`, `thinkingDurationMs`, `thinkingDisplay`, `apiErrorParams`,
  `healsDistinctCarrier`, `serverClassifierRequest`.
- `user`: `queueOrigin`, `permissionDecision`, `toolDenialUnanswered`, `refusedMessageId`, `usageLimitNote`,
  `summarizedTurnPromptUuids`, `repeatsCompactSummary`, `joinedNoticeLengths`, `joinedNoticeOwn`, `joinedNoticeRunIds`,
  `classifierBoundary`, `queueSkipSlashCommands`.
- `attachment`: `renderedBesideToolResult`, `renderedRole` and other attachment metadata.
- `queue-operation`: `commandUuid`, `deliveryId`.
- Six legacy tool-input leaves were collapsed by the generator's baseline sanitizer, which folds a literal tool-input
  leaf that a run did not re-observe.
- Subagent sidecars (`agent-<id>.meta.json`) carry `finished: true` from 2.1.301, written when the agent completes, next
  to `requestShape` (`"background"` for a background agent) and `requestNonInteractive`. The extension reads none of
  them.

The comparison is against the committed observations, which stop at 2.1.284, so `renderedRole`, `commandUuid` and
`deliveryId` show up again here although the 2.1.286 notes already described them.

## The parser change

`LogParser.parseLogLine` drops `api-request-blob` lines before any reader sees them (`isApiRequestBlob` in
`src/transcriptEntry.ts`). `api-request`, `api-request-shape` and `agent-color` carry no `message` and need nothing.

From 2.1.301 on, the parser read blobs as real turns, because they carry `message`:

- The blob copy of a background agent's launch acknowledgement lacks `toolUseResult.status: "async_launched"`, so it
  read as the agent's completion. A still-running background subagent moved to "Completed Agents", and once the
  transcript went quiet the session itself read idle instead of working. In a real 2.1.306 session, an agent launched at
  22:21:56 UTC was marked completed by the blob copy at the next API request, while its real completion notification only
  arrived at 22:31:54 UTC.
- The blob copy of a `<task-notification>` overwrote a finished agent's real completion time with nothing, which
  disabled re-wake detection (`subagentRewake.ts` works from that time).
- A trailing blob hid a user turn still waiting for the model's reply, and cleared the error and shutdown flags.
- A `user` blob could be picked as the session title, which then read `<system-reminder> …` instead of the user's
  prompt.

A blob can also repeat old history: after an auto-compaction or a resume it can sit up to about 5,400 lines after the
real entry it copies, which is one more reason never to read a blob as a turn.

Antigravity and Codex never write this type, so the gate is a no-op for both.

### Model-invoked forked skills (2.1.288+)

A second, older gap surfaced in the same review. When the model calls a `context: fork` skill (such as code-review)
through the built-in `Skill` tool, the skill runs as a background subagent, but the launch is a plain `Skill` tool call,
identical to an inline skill call, and no `<forked-skill-launch>` entry is written. Only the tool result says it forked:
`toolUseResult {success, commandName, status: "forked", background: true, agentId, result}`. An inline call gets
`{success, commandName}`. The completion is an ordinary `<task-notification>` that always carries the agentId
(`<task-id>`) and usually the Skill call's id (`<tool-use-id>`); 2 of the 11 first completions carried the agentId
only. The parser never created a subagent for it. The local corpus holds 11 such launches, each running from about 45
minutes to over three hours.

`detectForkedSkillResult` (`src/forkedSkillDetector.ts`) now creates a working background subagent from that result. It
is keyed by the Skill call's id and named after the skill. `status: "forked"` joined the launch acknowledgements in
`src/subagentLaunchAck.ts`, so the result is never read as the completion. The re-appended-history guard covers it too.
All 11 real launches now appear and are stopped by their own notification, with its timestamp. No other subagent row
changed in those transcripts.

### Other shapes the parser reads

They are unchanged from 2.1.287 to 2.1.306:

- Agent results only ever carry `async_launched` or `completed`.
- The SendMessage acknowledgements keep their known shapes. Since 2.1.301 a resume also carries `revivedAgentId` next to
  `resumedAgentId`, which still matches.
- `agents_killed` and `cost-state` have identical key sets.
- `<task-notification>` keeps its tags and carriers (queue-operation, user turn, `queued_command` attachment). Its new
  variants match no subagent: MCP-task notifications with a `<task-id>` only, and summary-only lines with no id.
- No new `system` subtype appeared.

## Evidence on real transcripts

- Of the 7,679 real transcripts, 1,429 carry blobs: 84 parent sessions and 1,345 subagent transcripts.
- Nothing is lost by dropping them. Every id a blob carries also appears in a non-blob entry of the same file: 25,955
  `tool_use`, 15,239 `tool_result` and 3,172 notification ids, with 0 found only in a blob. A blob was never the first
  or only record of any launch, result or notification id either (1,072 `Agent` launches, 80 `SendMessage` calls, 5,148
  `tool_result` ids, 1,950 notification `<tool-use-id>` and 1,908 `<task-id>` values checked).
- With the fix, the parser yields identical `Session` fields with and without the blob lines in all 1,429 files. The
  pre-fix parser diverged on 22 of the 84 parent sessions (subagent status, titles).
- Against an independent source of truth: from 2.1.301, a subagent's sidecar carries `finished: true` once the agent
  completes. Over 69 recent transcripts (2.1.301–2.1.306; 1,139 top-level subagents, 1,086 of them matched to a sidecar)
  the pre-fix parser showed 2 still-running agents as stopped, wiped 10 completion times and took the title of 11 of the
  69 sessions from a blob, so those read `<system-reminder> …` instead of the user's prompt. The fixed parser: 0, 0 and 0.
- A line-by-line replay of 5 large transcripts (61,184 lines). With the pre-fix parser, 365 of the 463 working-to-stopped
  flips came from blob lines, and every one of those agents really finished later: the window in which it was wrongly
  shown as completed had a median of 90 s, a 90th percentile of 424 s and a maximum of about 33 minutes. 13 subagents
  were also wrongly re-activated as `SendMessage` resumes, because a blob had stopped them first. With the fix, 0 flips
  came from blobs and the incremental and cold parses agree.
- A line-by-line replay of the real 2.1.306 session above keeps the agent working from its launch to its real
  completion notification, with the real completion time.
- Antigravity and Codex logs contain no such lines: none among the 22,978 Antigravity and 12,199 Codex lines scanned.

## Automated verification and limits

`src/test/logParser.apiRequestBlob.test.ts` is new: 4 tests on a sanitized capture of a real 2.1.306 transcript — a cold
parse, a line-by-line replay, the completion time kept, and a user turn still awaiting a reply. All four fail without
the fix. The golden-master snapshot was updated for the four new buckets, and an `api-request-blob` sample now parses to
an empty session. `src/test/logParser.forkedSkill.test.ts` is new too: 8 tests on a sanitized capture of a real forked
Skill launch, covering detection, completion, inline calls and the replay guard. Six of them fail without the change.

`npx tsc --noEmit`, `npm run lint`, `npm run format:check`, `npm run test` (866 passed, 1 skipped), `npm run build` and
`npm run compile:scripts` pass.

Known limit: the fix assumes a blob only ever copies a turn that has its own entry. If a future Claude Code logged a
turn only as a blob, the parser would miss that turn. No current transcript does: a blob was never the first or only
record of any id checked (see Evidence). Repeating that id check on a new CLI version is how this would be caught.

Known limit, forked skills: once a session holds two forks of the same skill, Claude Code addresses them in
`SendMessage` as `code-review [ref]`. The parser matches a `SendMessage` target by exact name or agentId only, so a
resume sent in that form is not shown as working again until re-wake detection or the fork's next notification catches
it (1 of 8 real sends, for under two minutes). This is not a regression: these forks were not shown at all before.

One machine, macOS only, and the evidence is parser- and test-level: no interactive VS Code Extension Host/UI test.
