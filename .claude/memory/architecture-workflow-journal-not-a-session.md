---
name: architecture-workflow-journal-not-a-session
description: Workflow runs write `<session>/subagents/workflows/wf_*/journal.jsonl` (launched/started/result, no isSidechain) — the recursive watcher registered it as a phantom session named "journal".
metadata:
  type: architecture
---

Claude Code's `Workflow` tool (2.1.280+) keeps a per-run journal at `<project>/<sessionId>/subagents/workflows/wf_<id>/journal.jsonl`, next to that run's `agent-*.jsonl` sidechains. Its lines are only `{"type":"launched"}`, `started` (key/agentId/label/phase) and `result` (key/agentId/`result`), with no `isSidechain`, `cwd`, `timestamp` or prompt.
**Why:** `LogParser` names a session after the file basename, so every journal became a title-less session `journal` (branch `unknown`), 'working' while the workflow kept writing. Only sidechains excuse themselves, through `isSidechain`, and the watcher is deliberately recursive (`**/*.jsonl`) because subagent writes drive the status refresh. Found 2026-09-28 while validating 2.1.284 against the real corpus.
**How to apply:** session registration is decided by layout, not content — `isClaudeSessionFile` (`<project>/<id>.jsonl` or `<project>/sessions/<id>.jsonl`) in `handleFileChange`; a change to any other jsonl still triggers the status refresh but never registers a session. A new kind of jsonl under `~/.claude/projects` is a new phantom-session risk: list the path shapes (`find … | sed` the ids away) after a Claude Code update. See [[architecture-schema-gen-freeform-payloads-leak-vocabulary]] for the same journal's other trap.
