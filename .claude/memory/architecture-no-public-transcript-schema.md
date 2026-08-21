---
name: no-public-transcript-schema
description: Claude Code's on-disk JSONL transcript format has no official schema — confirmed via Anthropic's own docs, SDK source, and an open unanswered GitHub issue
metadata:
  type: architecture
---

Claude Code's `~/.claude/projects/<project>/<sessionId>.jsonl` transcript (+
`<sessionId>/subagents/agent-*.jsonl` / `.meta.json`) has no official schema — now confirmed from
primary sources, not just inference. Anthropic's docs (code.claude.com/docs/en/sessions) say
plainly: internal format, changes between releases, parsing it directly "can break on any
release" — use `/export` instead. `@anthropic-ai/claude-agent-sdk`'s `getSessionMessages()` /
`SessionMessage` does read the JSONL, but its own source (Python `types.py`) calls the on-disk
shape "a large discriminated union... internal": it only decodes `type: user|assistant|system`
(real files have 7+, e.g. `attachment`/`queue-operation`/`last-prompt`), payload is
`message: unknown`, never touches `toolUseResult`/`userType`/`leafUuid` — not a usable parsing
basis. Open feature request github.com/anthropics/claude-code#53516 (filed 2026-04-26, still open,
zero maintainer reply as of 2026-08-21) asks for exactly this schema. Hook I/O, unlike the
transcript, _is_ fully documented (code.claude.com/docs/en/hooks). Unofficial community schemas
exist: `daaain/claude-code-log`, `vade-app/tjsonl`.

**Why:** confirmed 2026-07-17 debugging a subagent-status bug (assumed top-level `tool_use_id`
that never exists; completions nest in `message.content[]`, sometimes a plain string not a block
array); deepened 2026-08-21 via 2 parallel subagents (local CLI/SDK forensics + GitHub/docs
primary-source research) after the user asked directly whether an official schema exists.

**How to apply:** no schema to consult in advance, official or SDK. Before touching
`logParser.ts` / `subagentDetector.ts` / `nameExtractor.ts`, pull a fresh real sample from
`~/.claude/projects/` (or `~/.gemini/antigravity-ide/brain` for Antigravity) and inspect it
directly. Don't trust `SessionMessage`, the public Messages API docs, or an older sample as a
stand-in.
