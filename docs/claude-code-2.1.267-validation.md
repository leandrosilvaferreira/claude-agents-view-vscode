# Claude Code 2.1.267 compatibility validation

Validated on 2026-09-10 (UTC), using the installed Claude Code 2.1.267 CLI and this
extension's source parser. The npm registry's
[`latest` endpoint](https://registry.npmjs.org/@anthropic-ai/claude-code/latest)
reported 2.1.267 at validation time. No CLI upgrade was needed.

## Live transcript checks

A read-only scan of 6,879 local JSONL files found four transcripts containing
2.1.267 events: three parent sessions and one subagent sidechain. Two parent
sessions already existed; a short CLI smoke test created the third parent and its
subagent in a temporary working directory. The smoke test exposed only the Agent
tool, disabled hooks, and requested fixed text responses without file operations.
The child returned `CHILD_OK` and the parent returned `PARENT_OK`.

Across those four transcripts, 591 entries explicitly reported version 2.1.267.
There were no malformed JSON lines in the selected transcripts and no exceptions
from calling `detectSubagents` directly on the version-matched entries.

All four transcripts passed checks for the last recorded CLI version, presence of
a title, model and project path, and stable results when parsed again without new
writes. The subagent transcript was marked as a sidechain. The smoke-test parent
contained one detected `general-purpose` subagent with the correct recorded agent
ID and `stopped` status after its completed tool result.

## Structural differences

The existing schema aggregator compared the version-matched entries with the
committed schema observations, whose latest recorded version is 2.1.241. No new
event buckets appeared. There were 76 added field paths or observed field types:

- Attachment rendering, environment snapshots, model identity, context, tool
  definitions and related attachment metadata.
- MCP failure diagnostics and harness metadata in user tool results.
- Assistant `apiBlockIndex`, `perTurnEffort`, and tool-specific input arguments.

These are observation differences, not proof that every field was introduced in
2.1.267. Investigation found no required change to the fields consumed for session
titles, model/path extraction, turn signals or Agent result pairing. The actual
parent/subagent smoke test exercised the current Agent completion format. The
compatibility marker was updated after this investigation, not on an assumption
that the schema was unchanged. Generated historical schema artifacts were retained.

## Follow-up with live background agents

At 04:02 UTC on 2026-09-10, the active project session had four background agents:
`codex-review-quality`, `codex-review-security`, `codex-review-ts` and
`codex-review-tests`. All four Agent calls were present in the parser output, with
matching agent IDs and existing child transcripts. Their `async_launched` results
correctly left them `working`, and their parent remained `working` while its own
transcript was unchanged.

Two observations 20 seconds apart exercised `LogParser` and
`refreshSessionStatuses`. The TypeScript and test agents' logs grew during that
interval. Cached incremental parsing matched a fresh full parse of the parent and
all four children at both observations. All child transcripts reported 2.1.267,
were recognized as sidechains, and yielded model `claude-sonnet-5`. No missing
agents or parse/state discrepancies were observed. No grandchildren were present.
Background-agent completion was not observed during this interval.

## Automated verification and limits

`npx tsc --noEmit`, `npm run lint`, `npm run test` and `npm run build` passed.
The test suite passed 456 tests across 37 files, including the committed schema
golden-master and session/subagent regressions.

This validates the observed macOS transcript paths, a synchronous Agent lifecycle
and four running background agents. It is not an interactive VS Code Extension
Host/UI test, nor a new live test of background completion, teammates, remote
sessions or other operating systems. This small live corpus does not establish
compatibility for every possible Claude Code event.
