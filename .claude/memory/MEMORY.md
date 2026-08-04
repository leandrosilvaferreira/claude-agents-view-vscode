# Memory Index

- [Force-push não remove dados no GitHub](architecture-force-push-nao-remove-dados-no-github.md) — commits órfãos seguem legíveis por SHA via API REST; abrir repo sanitizado exige deletar/recriar ou GC do Support.

- [No public transcript schema](architecture-no-public-transcript-schema.md) — Claude Code's JSONL format is undocumented/unstable; always verify against real logs, never assume shape.

- [Bookkeeping entries carry no `message`](architecture-transcript-bookkeeping-entries.md) — `attachment`/`last-prompt`/`queue-operation`/`ai-title` trail every real turn; activity heuristics must gate on `message`, not `type`.

- [Why tsconfig pins `types: ["node"]`](architecture-types-node-pin-under-nodenext.md) — an ESM-flagged transitive `@types/chai` kills global `@types` inclusion under NodeNext; looks like a broken `@types/node` but isn't.

- [Subagent transcript layout on disk](reference-transcript-subagent-layout.md) — subagents live in `<session-id>/subagents/agent-*.jsonl`; `scanClaudeSubSessions` looks in a `sessions/` dir that never exists; native worktree-entry leaves a same-id stub that can collide (fixed via `upsertIfMoreRelevant`).
