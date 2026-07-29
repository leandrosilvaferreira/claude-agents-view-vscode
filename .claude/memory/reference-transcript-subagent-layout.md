---
name: reference-transcript-subagent-layout
description: Where Claude Code actually writes subagent transcripts and where a session's log lands after it enters a worktree.
metadata:
  type: reference
---

Real on-disk layout under `~/.claude/projects/<encoded-project>/`:

- Session transcript: `<session-id>.jsonl`
- Subagent transcripts: `<session-id>/subagents/agent-<id>.jsonl` — same
  `entrypoint` as the parent (e.g. `claude-vscode`), NOT `sdk*`.
- Background agents launched by `/security-review` and similar: their own
  top-level `<uuid>.jsonl` with `entrypoint: sdk-py`.
- A session that enters a git worktree leaves its main transcript in the **base**
  project directory while its subagent transcripts land in the **worktree's**
  project directory.

**Why:** `sessionScanner.scanClaudeSubSessions` looks for `<project>/sessions/*.jsonl`,
a path that does not exist in any observed install — so `<id>/subagents/*.jsonl` is
never scanned (76 such files found in one worktree). Benign today, because
`subagentDetector` derives subagents from the parent's own transcript; reading them
as sessions would instead produce dozens of phantom top-level rows, since their
`entrypoint` is not `sdk*` and `isAgentSession` would call them human.

**How to apply:** before changing scanning or nesting, check this layout against a
real install rather than the code's assumption. Relevant to `sessionScanner`,
`sessionAssembly` and `sessionDedupe.findParentSession`.
See [[architecture-transcript-bookkeeping-entries]].
