# Memory Index

- [Force-push não remove dados no GitHub](architecture-force-push-nao-remove-dados-no-github.md) — commits órfãos seguem legíveis por SHA via API REST; abrir repo sanitizado exige deletar/recriar ou GC do Support.

- [No public transcript schema](architecture-no-public-transcript-schema.md) — Claude Code's JSONL format is undocumented/unstable; always verify against real logs, never assume shape.

- [Bookkeeping entries carry no `message`](architecture-transcript-bookkeeping-entries.md) — `attachment`/`last-prompt`/`queue-operation`/`ai-title` trail every real turn; activity heuristics must gate on `message`, not `type`.

- [Why tsconfig pins `types: ["node"]`](architecture-types-node-pin-under-nodenext.md) — an ESM-flagged transitive `@types/chai` kills global `@types` inclusion under NodeNext; looks like a broken `@types/node` but isn't.

- [Green fixtures prove nothing here](architecture-fixtures-hide-real-log-shapes.md) — 153 tests + 2 reviews passed a parser bug that one run against real transcripts caught; validate against `~/.claude/projects/**`.

- [Three subagent dispatch mechanisms](architecture-subagent-dispatch-mechanisms.md) — classic `Agent` tool_use vs `<forked-skill-launch>` (`<task-id>` completion) vs in-process teammates (`teammate_spawned` ACK, `<teammate-message>` idle_notification).

- [Subagent transcript layout on disk](reference-transcript-subagent-layout.md) — subagents live in `<session-id>/subagents/agent-*.jsonl`; `scanClaudeSubSessions` looks in a `sessions/` dir that never exists; native worktree-entry leaves a same-id stub that can collide (fixed via `upsertIfMoreRelevant`); worktree-dir sidecar loss after cwd reverts to base — fixed on `fix/subagent-visibility-gaps`.

- [Enrichment runs on parse, nesting on the tick](architecture-enrichment-runs-only-on-parse-not-tick.md) — `enrichSubagentMetadata` (fills `agentId`) only ran when the parent transcript grew, leaving grandchildren unattached for a subagent's whole live run — fixed on `fix/subagent-visibility-gaps`.

- [Import-graph lint rules fail silent](architecture-import-graph-lint-rules-fail-silent.md) — `import-x/no-cycle` needs `import-x/extensions`+`parsers`; import-x v4 needs `resolver-next`; boundaries needs `checkAllOrigins`.

- [Worktree auto custom-title collides dedupe key](architecture-worktree-custom-title-collision.md) — Claude Code auto-stamps custom-title=worktree name (/→+); mistaken for a rename, collapses `getDedupeKey()`, drops sessions silently.

- [jscpd trips on generated schema file](architecture-jscpd-duplicate-in-generated-shapes.md) — `npm run lint`'s jscpd stage (separate from ESLint, own `.jscpd.json`) still fails on `src/generated/transcriptShapes.ts` after the ESLint ignore fix.

- [Tolerant parser pattern, convergent prior art](architecture-tolerant-parser-pattern.md) — 4 independent parsers of this format converge on per-line isolation + unknown-bucket; Tolerant Reader/ACL/Golden-Master naming + gaps.

- [scripts/package.json type:module breaks tsc NodeNext](architecture-scripts-package-json-breaks-tsc-nodenext.md) — flips scripts/ to ESM-ambient, forcing TS2835 on every extensionless import; unneeded once tsx is the runner.

- [Large generated file breaks lintRules.test.ts](architecture-generated-file-breaks-eslint-projectservice.md) — transcriptShapes.ts (~8000 lines) slows ESLint's parserOptions.projectService enough to time out an unrelated test; check before committing T12's real baseline.
