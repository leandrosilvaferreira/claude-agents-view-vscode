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
3. **In-process teammate** (agent teams) — a real `Agent` tool_use. Since CLI **2.1.258**
   (observed on a Fable 5.1 CLI session, 2026-09-02) the TOP-LEVEL session launches these
   directly, so the parent transcript DOES see the `tool_use` — but its ACK carries
   `toolUseResult.status:"teammate_spawned"` (not `"async_launched"`), and completion is a
   plain user turn `<teammate-message teammate_id="NAME">{"type":"idle_notification",…}`,
   never a `<task-notification>`. Missing both shapes marked every teammate stopped at
   launch, so a session running three of them showed zero Working Agents and read
   'stopped' itself. Older/nested launches still happen inside the _forked agent's own_
   transcript, invisible to the parent. Sidecar (filename `agent-<name>-<hash>`) has
   `parentAgentId` + `taskKind:"in_process_teammate"`, no `toolUseId`, plus fields
   `subagentDetector.ts` never reads: `name`, `teamName`, `color`, `permissionMode`,
   `planModeRequired`, and `customAgentType` — the REAL specialist type (`agentType`
   on a teammate sidecar is only the per-task label, e.g. `"angle-a-linebyline"`, not
   the specialist; `customAgentType` holds `"code-reviewer"` etc.). Confirmed on a real
   sidecar 2026-08-21 — see [[reference-transcript-subagent-layout]] for the full shape.

Sidecars for (2) and (3) have **no `toolUseId`**, so `subagentMetadata.readSidecarsById`
(which indexes only by `toolUseId`) silently ignores them — name/model must come from the
launch payload itself.

**Grandchildren** (a subagent's own subagents, incl. (3)) are joined from the sidecar's
`parentAgentId` — never from the launching transcript, which the parser does not read.
`parentAgentId` always holds the raw agentId, never a `toolUseId`, so the parent's
`sub.agentId` must be filled from its own sidecar or the join silently yields nothing.
`spawnDepth` is NOT a reliable depth: it is `1` even for teammates that are grandchildren.

**Why:** `<forked-skill-launch>` looks like plain bookkeeping text, so the launch reads as a
no-op line; the whole session showed as `working` with zero subagents and nothing in the code
hinted why. Cost three rounds of on-disk evidence to pin down.

**How to apply:** before touching subagent detection, ask which of the three mechanisms a log
came from. Never assume a subagent implies a `tool_use`. Gate any new
`<forked-skill-launch>` reading on `type === 'system'` + the **top-level** `content` string —
agent reports paste that tag verbatim into message text, and reading it via `getEntryText`
fabricates phantom subagents (this exact false-positive was caught live during the
2026-08-21 audit: a debugger subagent's own prompt/report, quoting this file, matched a
naive `<forked-skill-launch>` grep). A grandchild is silently invisible forever when its
sidecar's `parentAgentId` resolves to nothing known (deliberate, tested) — in an
audited 14-day corpus every real in-process-teammate sidecar's `parentAgentId` pointed at
an already-detected forked-skill parent, never at a top-level session directly, so this
gap is real but so far unobserved in practice. It WAS also silently invisible
_transiently_ whenever the parent hadn't yet had its own `agentId` sidecar-enriched,
because enrichment and grandchild-attachment ran on two different cadences — fixed
2026-08-21, see [[architecture-enrichment-runs-only-on-parse-not-tick]]. See
[[reference-transcript-subagent-layout]] and [[architecture-no-public-transcript-schema]].
