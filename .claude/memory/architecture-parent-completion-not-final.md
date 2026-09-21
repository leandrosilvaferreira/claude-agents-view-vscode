---
name: architecture-parent-completion-not-final
description: A parent-transcript "completion" does not mean the subagent stopped — queued-SendMessage ACK and post-notification re-wake both fooled the parser; only a live line-by-line replay reproduces it.
metadata:
  type: architecture
---

Two real shapes (Claude Code 2.1.241 → 2.1.278) made running subagents render under "Completed Agents":
(1) `SendMessage` to a **still-running** subagent is ACKed `toolUseResult: {success:true, message:"Message queued for delivery to <id> at its next tool round.", pin:{id,name,ref}}` — no `resumedAgentId`; it is a mid-run message, not a resume, and the agent's real completion still carries its ORIGINAL launch `<tool-use-id>`.
(2) A subagent can **re-wake after its `<task-notification>`** (its own background task's notification or a peer message lands in ITS transcript); the parent sees nothing until a later `<task-id>`-only notification, minutes later. Only the subagent's own `agent-<id>.jsonl` mtime reveals it (`subagentRewake.ts`).
**Why:** bug (1) only fires once `agentId` is sidecar-enriched, which happens after each incremental chunk — a cold full parse of the same file looks correct. The reverse also bit: the first fix's rewake showed finished SYNC subagents 'working' on a cold parse only (agentId unknown mid-chunk), invisible to a live replay — caught by review on 4 real sessions. Cost a ~40-min replay investigation plus a review round (2026-09-21) to pin down.
**How to apply:** never treat a parent-side stop signal as final for a subagent that has an `agentId`; reproduce liveness bugs BOTH ways against real transcripts — one cold parse AND a line-by-line replay through `LogParser` + `refreshSessionStatuses` — they fail on different bugs. See [[architecture-subagent-dispatch-mechanisms]] and [[architecture-fixtures-hide-real-log-shapes]].
