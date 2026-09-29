# Claude Code 2.1.284 compatibility validation

Validated on 2026-09-28 (UTC). The CLI on PATH and the IDE-bundled Claude Code extension both stamp
live transcripts with 2.1.284; the previous pin was 2.1.278. Versions in the local corpus since then:
2.1.280–2.1.284 (2.1.279 never occurs). Agent Monitor's own compatibility warning surfaced the gap:
"2.1.284 detected; validated against 2.1.278".

## What ran

- `npm run schema:generate` over the full local corpus — 6,167 files, 2,065,641 entries, about
  11 minutes (the run that never finished in the 2.1.278 validation now completes since the
  linear-time aggregator). It merges into the committed observations (last run 2026-09-22): 5 new CLI
  versions (2.1.280–2.1.284), 89 fields added (telemetry — nothing the parser reads), 5 removed and 3
  widened (all tool-input keys), no type added or removed, `unknownTypes` still empty.
- An independent key comparison of 1,703 top-level transcripts: 480,334 entries stamped 2.1.227–2.1.278
  against 122,426 stamped 2.1.280–2.1.284, plus the subagent launch/completion shapes and sidecars on
  the newer versions.
- A census of end-of-session signals over the same corpus (610 transcripts carry a `cost-state`
  line) and a read of the CLI binary (2.1.282–2.1.284) for the writers of `cost-state` and of the
  `~/.claude/sessions/<pid>.json` registry.
- The full suite: `npx tsc --noEmit`, `npm run lint`, `npm run format:check`, `npm run test`,
  `npm run build`, `npm run compile:scripts`.

## Schema: additive only

No entry `type`/`subtype` bucket appeared or vanished in top-level transcripts. Every field the parser
reads kept its type and name:

- `entrypoint` gained `sdk-ts` — covered by the `startsWith('sdk')` checks.
- `toolUseResult.status: 'async_launched'` is now also emitted by the `Workflow` tool, without an
  `agentId` (3 entries) — harmless to the status-only check.
- A cross-session `SendMessage` ACK, `{success, message, msg_id, display}` (first seen 2.1.261, 12 in
  the newer range), matches none of the recognized ACK shapes, so it falls to a no-op `markStopped` on
  the SendMessage id.
- `<task-notification>` gained the child tags `<diagnostics>` and `<worktree>`; the first-match
  regexes are unaffected.
- Sidecars gained `spawnedWithWorktree`/`worktreeBranch`/`worktreePath` and `stoppedByUser` — not read.
- New fields elsewhere are telemetry (`slug`, `turnPosition`, `interruptedMessageId`,
  `queueTranscriptOnly`, `attachment.*`) — not read.

`cost-state`, `atis-latch`, `relocated`, `worktree-state`, `ai-title`, `last-prompt`, `custom-title`,
`queue-operation` and `file-history-delta` are not new: all were already in the committed observations.

## Two defects the new version exposed (fixed alongside)

1. **Ghost sessions after a process exit.** Claude Code's auto-update restart exited three live
   sessions within the same second while background subagents were running. Nothing in a parent
   transcript says its subagents died, so each dead session stayed `working` — the marker write itself
   refreshes the file's mtime, restarting the 30-minute clock — and then `stopped` with a full
   "Working Agents" group until the one-hour cutoff, beside the successor session the user had started
   in the same worktree (new session id and title, so the dedupe key rightly differs). The CLI's
   `cost-state` line, written as the process (or a conversation) ends, is now a latch
   (`Session.shutdownRecorded`) that stops the session and every subagent — a finished one's re-wake
   evidence included, since its own transcript is still recent — and their grandchildren, which stay
   stopped even after a same-id resume.
   Census: 606 of the 637 markers followed only by bookkeeping to EOF are the literal last line; 15
   markers are followed by real turns of a fresh process resuming the same session id (the latch
   self-clears); every interactive session on 2.1.278+ that ended cleanly has one (88/88); a dead
   process's subagent transcripts never grew more than 3.3 s past it. Replayed against the three real
   sessions, cold and line by line: all three read `stopped` with no working agent, the two live
   successors unchanged. No marker exists for hard kills, VS Code/SDK sessions before 2.1.278 or
   headless runs that never called the API — those keep the mtime heuristics.
2. **Workflow journals registered as sessions.** `subagents/workflows/wf_*/journal.jsonl` carries no
   `isSidechain`, so the recursive watcher turned it into a title-less session named `journal`
   (`working` while the workflow wrote). Session registration in the watcher path now follows the
   scanner's layout (`isClaudeSessionFile`).

## Generator findings (fixed)

- Its `readline` walk cut a record at every raw U+2028/U+2029 inside a JSON string (valid JSON, written
  raw by Claude Code): about 50 records in 15 files came back as 125 parse-error fragments. The walker
  now splits on `\n` only, like `LogParser`; the same corpus reports 0 errors.
- A caller-defined JSON schema reaches the transcripts three ways — the built-in `StructuredOutput`
  tool's `input`, the `structured_output` attachment's `data` (both predate 2.1.280), and a Workflow
  journal's `result` — and the generator kept their field names literally in the committed observations
  and TypeScript reference (about 25 business-domain names of a private project in this run; the
  committed baseline already held a few generic ones such as `survived`/`refuted`; every value was
  redacted, keys were not). `keySafety` gained `isStructuredOutputPayloadKey`, a sibling-based rule
  beside the MCP one, and journals are no longer walked. Read a regenerated diff for project
  vocabulary before committing it, and revert leaky generated files before re-running — the merge is
  additive.

## Automated verification and limits

`npx tsc --noEmit`, `npm run compile:scripts`, `npm run lint` (ESLint and jscpd: 0 clones),
`npm run format:check` and `npm run build` pass. `npm run test` ran 615 tests across 47 files (614 passed, 1 skipped — a Windows-only case),
including the regenerated schema golden master and the regressions added with this validation. The
golden master was re-recorded because the fixtures were regenerated and `Session` gained
`shutdownRecorded`; HEAD's parser and the working tree's parse every regenerated fixture identically
apart from that one key.

Each new test was checked against its own fix by mutation while it was written (about 30 mutants
across the shutdown handling, the watcher guard, the status rules, the key-safety rule and the walker's
splitter). An independent judge then ran 43 mutants against the final code; its four survivors — the
Codex watcher path, a non-`sessions` file one folder deep, a `StructuredOutput` check that looked only
at the tool name, and the cross-drive guard (Windows only) — are pinned by tests added afterwards.
Replaying the real transcripts touched in the last 8 hours through the old and the new pipeline at
three instants around the restart changes only the rows of the dead sessions: from `working` (or
`stopped` with a full Working Agents group) to `stopped` with no working agent. A dead session's row
does not disappear: like any concluded session it stays visible, as `stopped`, until the existing
one-hour cutoff, next to its successor.

One machine, macOS only, no interactive VS Code Extension Host/UI test. `<forked-skill-launch>`
entries and in-process teammates were not observed in 2.1.280+ transcripts, so those paths were not
re-validated. 2.1.279 does not occur in the corpus and 2.1.284 was a few hours old when validated.
A `/background` fork that keeps its parent alive also writes `cost-state` mid-session (seen in the CLI
binary, never in the corpus); there the parent's live subagents would be stopped early.
