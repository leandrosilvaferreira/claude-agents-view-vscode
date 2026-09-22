---
name: architecture-transcript-lines-reappended-after-resume
description: Claude Code re-appends old history lines (same uuid/tool ids/timestamps) after a session is relocated or resumed — every detector must be idempotent per id.
metadata:
  type: architecture
---

After a session is relocated (native worktree entry) or resumed, Claude Code re-appends earlier history lines to the transcript with the SAME `uuid`, tool_use ids and timestamps (only cwd/branch and a few payload fields differ): 56,063 such lines in 21 real transcripts, CLI 2.1.239–2.1.276. A detector that reacts to a line every time it sees it re-runs history: a re-appended `Agent` launch recreated a finished subagent as 'working', and a re-appended `SendMessage` "resumed" an agent that had since finished (21 subagents stuck 'working', sessions held 'working').
**Why:** looks exactly like the old "rewind" symptom and like a live launch; nothing in a single line says it is a copy. Found only by auditing duplicate ids across the corpus (2026-09-21).
**How to apply:** any new detector keyed on a tool_use id must skip ids already processed in the same file (`isReplay` / per-file `seenToolUseIds` in `LogParser`'s incremental cache). De-duplicating every line by `uuid` also works but costs ~530k ids in memory on a large corpus. See [[architecture-parent-completion-not-final]].
