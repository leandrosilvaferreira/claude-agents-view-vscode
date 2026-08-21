---
name: architecture-enrichment-runs-only-on-parse-not-tick
description: subagentMetadata.enrichSubagentMetadata only runs when the parent transcript grows, while nestedSubagents.refreshNestedSubagents runs on the 15s tick — a subagent's grandchildren can stay invisible for its whole run.
metadata:
  type: architecture
---

**FIXED 2026-08-21** (`sessionStatusRefresh.ts`, branch `fix/subagent-visibility-gaps`) — kept
for the non-obvious timing reasoning, which is still worth knowing before touching either
function again. Before the fix: `subagentMetadata.enrichSubagentMetadata` (fills a subagent's
`agentId`/name/model from its sidecar) ran only from `LogParser.parseNewLines`, i.e. only when
the **parent** transcript grows. `nestedSubagents.refreshNestedSubagents` (attaches
grandchildren) ran on `sessionTreeDataProvider`'s 15s tick / file-change refresh instead — a
deliberately different cadence (see that file's own doc comment). Real sidecars are written
~61-92ms _after_ their launching `tool_use` line (measured, always after, never before).

**Why:** `nestedSubagents.ts` joins a grandchild via the _parent_ subagent's `sub.agentId`
(`attachNestedSubagents`, `sub.agentId ?? sub.id`). Until `enrichSubagentMetadata` fills
`sub.agentId`, that falls back to the raw tool_use id, which never matches a real child's
`parentAgentId` — so every 15s tick silently finds nothing, even though the child's
sidecar already exists on disk. For a subagent whose parent transcript doesn't grow again
until the subagent itself completes (the common case — foreground dispatch blocks the
parent turn; backgrounded dispatch writes only a launch ACK and, much later, its own
`<task-notification>` — see [[architecture-subagent-dispatch-mechanisms]]), `agentId`
isn't filled until that next parse, so grandchildren can stay unattached for the
subagent's **entire live run**, only appearing once it's already finished. Found via
code audit 2026-08-21, not caught red-handed live — plausible, not confirmed in a real
session.

**How to apply:** the fix, now shipped: `sessionStatusRefresh.ts`'s `refreshSessionStatuses`
calls `enrichSubagentMetadata(session)` immediately before `refreshNestedSubagents(session)`
on every tick, extracted out of `sessionTreeDataProvider.updateActiveStatuses`. Still relevant
going forward: don't assume "next refresh will pick it up" for anything gated on `sub.agentId`
without checking which cadence actually calls the enriching function — this asymmetry is why
it needed fixing in the first place, and a future refactor could reintroduce it by moving
either call without the other. See [[reference-transcript-subagent-layout]] for the companion
worktree-dir-loss bug this same audit found (also fixed on the same branch).
