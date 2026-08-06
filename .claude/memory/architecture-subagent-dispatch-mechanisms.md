---
name: architecture-subagent-dispatch-mechanisms
description: Three different Claude Code mechanisms write into <session>/subagents/, and only one of them is a tool_use the parser can see.
metadata:
  type: architecture
---

Claude Code has **three** dispatch mechanisms writing to `<sessionId>/subagents/`, and they
do NOT share a launch shape:

1. **Classic `Agent` tool** — a `tool_use` block; sidecar has `toolUseId`. The only one
   `detectClaudeCalls` ever saw.
2. **Forked skill** (`context: fork`; `/code-review` since 2.1.218) — **no `tool_use` at
   all**. Launch is a `type:"system"`, `subtype:"local_command"` entry whose top-level
   `content` embeds `<forked-skill-launch>{"agentId","skillName","description"}</…>`.
   Completion carries only `<task-id>` (the agentId); `<tool-use-id>` is absent.
3. **In-process teammate** (agent teams) — a real `Agent` tool_use, but inside the _forked
   agent's own_ transcript, so the parent transcript never sees it. Sidecar has
   `parentAgentId` + `taskKind:"in_process_teammate"`, no `toolUseId`.

Sidecars for (2) and (3) have **no `toolUseId`**, so `subagentMetadata.readSidecarsById`
(which indexes only by `toolUseId`) silently ignores them — name/model must come from the
launch payload itself.

**Still unhandled by design:** (3) is invisible in the tree — those teammates are
grandchildren, launched inside the forked agent's transcript, which the parser never reads.
Observed real case: 11 `angle-*` reviewers under one `/code-review`.

**Why:** `<forked-skill-launch>` looks like plain bookkeeping text, so the launch reads as a
no-op line; the whole session showed as `working` with zero subagents and nothing in the code
hinted why. Cost three rounds of on-disk evidence to pin down.

**How to apply:** before touching subagent detection, ask which of the three mechanisms a log
came from. Never assume a subagent implies a `tool_use`. Gate any new
`<forked-skill-launch>` reading on `type === 'system'` + the **top-level** `content` string —
agent reports paste that tag verbatim into message text, and reading it via `getEntryText`
fabricates phantom subagents. See [[reference-transcript-subagent-layout]] and
[[architecture-no-public-transcript-schema]].
