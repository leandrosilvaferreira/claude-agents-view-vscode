---
name: reference-transcript-subagent-layout
description: Where Claude Code actually writes subagent transcripts, where a session's log lands after it enters a worktree, and the same-id stub collision that can cause.
metadata:
  type: reference
---

Real on-disk layout under `~/.claude/projects/<encoded-project>/`:

- Session transcript: `<session-id>.jsonl`
- Subagent transcripts: `<session-id>/subagents/agent-<id>.jsonl` — same
  `entrypoint` as the parent (e.g. `claude-vscode`), NOT `sdk*`.
- Next to each one, a `agent-<id>.meta.json` sidecar (1:1, ~200 bytes) holding
  at least `agentType`, `description`, `toolUseId`, `spawnDepth`, `model`.
  `toolUseId` joins to `SubAgent.id` (both are the launching `tool_use` block's
  id). `subagentMetadata.ts` uses this to fill in the real agent name and model.
  CORRECTION (2026-08-21): an earlier version of this note called the filename's
  `<id>` "an unrelated internal one, so never join on the filename" — that was
  wrong. It IS the real agentId Claude Code assigns the subagent;
  `sidecarReader.extractAgentIdFromFilename` reads it into `SidecarMetadata.agentId`,
  and `nestedSubagents.ts` joins grandchildren on it via `parentAgentId`. Only 2 of
  4 launches sampled passed an explicit `name`; the filename id is the only handle
  for the rest (SendMessage's `to` addresses them by it too).
- A real in-process-teammate sidecar (`taskKind:"in_process_teammate"`) carries far
  more than the 5-key baseline above — confirmed on disk: `name`, `teamName`,
  `color`, `permissionMode`, `planModeRequired`, and critically `customAgentType`.
  `agentType` on a teammate sidecar is the per-task label (e.g.
  `"angle-a-linebyline"`), NOT the specialist — `customAgentType` (e.g.
  `"code-reviewer"`) is. **UPDATE 2026-08-21**: `name` is now read (fix shipped same
  branch, same day as this note was first written — this line was wrong on arrival)
  — `SidecarMetadata.name` + `readSidecarFile` (`sidecarReader.ts`), preferred over
  `agentType` by `nestedSubagents.ts`'s `toChildSubAgent` for a grandchild's display
  label. `taskKind`/`teamName`/`color`/`permissionMode`/`planModeRequired`/
  `customAgentType` are still NOT read by `SidecarMetadata`/`readSidecarFile` — see
  [[architecture-subagent-dispatch-mechanisms]].
- Background agents launched by `/security-review` and similar: their own
  top-level `<uuid>.jsonl` with `entrypoint: sdk-py`.
- A session that enters a git worktree leaves its main transcript in the **base**
  project directory while its subagent transcripts land in the **worktree's**
  project directory.
- Claude Code's _native_ worktree-entry (`type: 'relocated'` / `type:
'worktree-state'` entries) is different: it relocates the **entire** transcript
  under the worktree's project dir and leaves a same-filename **stub** in the base
  dir (observed: one `custom-title` line, ~138 bytes, vs. 4.25 MB real). Both files
  produce the identical bare `session.id` (`logParser.ts` keys on basename only).

**Why:** `sessionScanner.scanClaudeSubSessions` looks for `<project>/sessions/*.jsonl`,
a path that does not exist in any observed install — so `<id>/subagents/*.jsonl` is
never scanned (76 such files found in one worktree). Benign today, because
`subagentDetector` derives subagents from the parent's own transcript; reading them
as sessions would instead produce dozens of phantom top-level rows, since their
`entrypoint` is not `sdk*` and `isAgentSession` would call them human.
The stub/real same-id pair was worse: `sessionTreeDataProvider`'s `sessions` Map used
to keep whichever file `fs.readdirSync` scanned last (filesystem-dependent order), so
an active session with running subagents could silently vanish, replaced by the
stopped-looking stub. Fixed 2026-08-03 via `sessionDedupe.upsertIfMoreRelevant`,
which tie-breaks any same-id overwrite through the existing `isMoreRelevant`
comparator instead of a blind `Map.set` — with two refinements adversarial review
forced: a same-`logFilePath` candidate always wins unconditionally (it's a fresher
parse of the identical file, not a rival — `isMoreRelevant`'s status-based tiers
would otherwise let a stale cached `'working'` entry block a legitimate re-parse
after e.g. `/clear` or compaction), and a genuine tie across every `isMoreRelevant`
tier (plausible when two files land in the same mtime tick) falls back to comparing
`logFilePath` itself, since `isMoreRelevant`'s own final `id` tiebreak is a no-op
here (`existing.id` always equals `candidate.id` — both equal the map key).

**CURRENTLY FAILING (found 2026-08-21, real-log audit widened to 14 days):**
`sidecarReader.candidateMetadataDirs` computes candidate dirs from
`session.projectPath` **as of the current parse only** — it keeps no memory of a
worktree dir the session visited earlier, even though its own doc comment already
notes `projectPath` "can flip over a session's lifetime." Of 34 worktree-split
sessions in the audited corpus, 27 ended with `projectPath` back at the base cwd;
for those, any sidecar that exists ONLY under the worktree-encoded dir becomes
permanently unreachable (`readAllSidecars` → `[]`), so those subagents never get
`agentId` (blocks grandchild attachment) and never get real name/model — they
degrade to whatever was already rendered, never erased, just frozen. Not yet fixed.
Companion timing gap: [[architecture-enrichment-runs-only-on-parse-not-tick]].

**How to apply:** before changing scanning or nesting, check this layout against a
real install rather than the code's assumption. Relevant to `sessionScanner`,
`sessionAssembly` and `sessionDedupe.findParentSession`. Any new code path that
writes a session into an id-keyed map must go through `upsertIfMoreRelevant`, or the
stub-collision bug reopens. A fix for the worktree-dir-loss bug above must accumulate
every `projectPath` a session has ever encoded to, not just the latest one. See
[[architecture-transcript-bookkeeping-entries]].
