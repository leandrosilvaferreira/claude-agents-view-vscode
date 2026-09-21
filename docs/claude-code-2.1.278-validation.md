# Claude Code 2.1.278 compatibility validation

Validated on 2026-09-21 (UTC). The IDE-bundled Claude Code extension
(`anthropic.claude-code` 2.1.278) stamps live transcripts with version
2.1.278; the CLI on PATH remained at 2.1.276. Agent Monitor's own
compatibility warning surfaced this gap first: "2.1.278 detected; validated
against 2.1.267". The npm registry's [`latest` endpoint](https://registry.npmjs.org/@anthropic-ai/claude-code/latest)
also reported 2.1.278 at validation time, matching the IDE-bundled extension.

## Live transcript checks

A script over the local corpus at `~/.claude/projects/**` (414 transcripts,
3,962 subagents, versions 2.1.239–2.1.278) checked the shapes the subagent
detector depends on: the `async_launched` acknowledgement (2,995/2,995 carry
`agentId`), synchronous Agent completions (1,730/1,730 carry
`toolUseResult.agentId`), and `<task-notification>` tags were all unchanged.
The sidecar's `spawnDepth`, `requestShape` and `requestNonInteractive` fields
are additive.

The same investigation found three real behaviours the existing parser
mishandled, all fixed alongside this validation:

- A `SendMessage` to a still-running subagent is acknowledged with
  `{success:true, message:"Message queued for delivery…", pin}` — no
  `resumedAgentId` — and was previously read as that subagent's completion.
  Seen since 2.1.241.
- An in-process teammate `SendMessage` ACK
  (`{success:true, message:"Message sent to <name>'s inbox", msg_id, routing}`)
  had the same effect.
- A subagent can re-wake after its own completion `<task-notification>` (its
  own background task, or a peer message, lands in its transcript), leaving
  the parent to see only a later `<task-id>`-only notification — now detected
  from the subagent's own transcript mtime (30s slack, 24h horizon, 30-minute
  idle ceiling).

## Structural differences

A read-only key-comparison script scanned `~/.claude/projects/**` files
modified since 2026-08-15: a 2.1.200–2.1.267 baseline against ~400k entries
stamped 2.1.269–2.1.278 from the same corpus (2.1.269: 1,809; 2.1.270:
141,420; 2.1.272: 149,567; 2.1.275: 17; 2.1.276: 54,468; 2.1.278: 52,234). No
new entry type or subtype buckets appeared. Added fields: assistant
`message.input_transformations`, `advisorModel`, `wireToolInputs`,
`wireIngestContext`, text-block `citations`; `system:local_command`'s
`commandRun`; `system:turn_duration`'s `pendingBackgroundAgentCount`; user
`imagePasteIds`, `turnOrigin`, `toolUseResult.bashEditDiff`. Fields in the
baseline but absent here are tool-specific result fields of unused tools
(e.g. teammate-spawn fields) plus rare assistant flags (`supersedesUuids`,
`isAbortedMidStream`, `truncatedAfterOutput`, `quotaLimits`) — absence is not
evidence of removal. None of the added or unobserved fields is read by the
parser, confirmed by searching `src/`.

A second, independent check compared 94 transcripts stamped 2.1.276 against
the committed `scripts/schema-gen/schema-observations.json` (latest recorded
version 2.1.241) and found the same kind of additive drift — wire/telemetry
fields, richer `attachment.*` environment snapshots — with no drift in the
subagent launch/completion markers.

## Follow-up with live background agents

A live project session on Claude Code 2.1.278 accumulated 57 subagents during
this check (52 at first inspection). Its parent transcript was replayed line
by line through `LogParser` and `refreshSessionStatuses`, the way the file
watcher feeds them. Before the fix, two subagents that were still running were
shown under "Completed Agents" — one after a mid-run `SendMessage`, one
re-woken after its own completion notice. Replaying the fix's logic (with an
earlier 5 s re-wake slack, now 30 s) cut the running-but-shown-completed
moments from 952 subagent/refresh pairs to 16, all inside the slack window
right after a re-wake. A cold parse plus a refresh tick of the final code,
taken while no subagent was running, reported none as working, matching each
subagent's own transcript activity.

## Automated verification and limits

`npx tsc --noEmit`, `npm run lint`, `npm run test` and `npm run build`
passed. The suite ran 473 tests across 40 files, including the committed
schema golden-master and the session/subagent regressions added with this
validation. An isolated mutation check of the fix (11 mutants covering the
three behaviours above) killed all 11.

`npm run schema:generate` did not finish within two hours against the full
local corpus (4.6 GB, ~5,860 files) and wrote nothing — likely because
`wireToolInputs` and `wireIngestContext` are keyed by tool-use IDs, which the
schema aggregator's key-safety check does not collapse, so every tool call
mints new field paths. Generated schema artifacts
(`src/generated/transcriptShapes.ts`, `scripts/schema-gen/schema-observations.json`,
`src/test/fixtures/schema-corpus/**`) were retained unchanged, as in the
2.1.267 validation.

`<forked-skill-launch>` entries and in-process teammates were not observed in
any 2.1.269+ transcript, so those paths were not re-validated on the newer
versions. This is not an interactive VS Code Extension Host/UI test, and it
covers macOS only.
