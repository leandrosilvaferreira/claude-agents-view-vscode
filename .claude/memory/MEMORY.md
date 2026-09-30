# Memory Index

- [Force-push não remove dados no GitHub](architecture-force-push-nao-remove-dados-no-github.md) — commits órfãos seguem legíveis por SHA via API REST; abrir repo sanitizado exige deletar/recriar ou GC do Support.

- [No public transcript schema](architecture-no-public-transcript-schema.md) — Claude Code's JSONL format is undocumented/unstable; always verify against real logs, never assume shape.

- [Bookkeeping entries carry no `message`](architecture-transcript-bookkeeping-entries.md) — `attachment`/`last-prompt`/`queue-operation`/`ai-title` trail every real turn; activity heuristics must gate on `message`, not `type`.

- [Why tsconfig pins `types: ["node"]`](architecture-types-node-pin-under-nodenext.md) — an ESM-flagged transitive `@types/chai` kills global `@types` inclusion under NodeNext; looks like a broken `@types/node` but isn't.

- [Green fixtures prove nothing here](architecture-fixtures-hide-real-log-shapes.md) — 153 tests + 2 reviews passed a parser bug that one run against real transcripts caught; validate against `~/.claude/projects/**`.

- [Three subagent dispatch mechanisms](architecture-subagent-dispatch-mechanisms.md) — classic `Agent` tool_use vs `<forked-skill-launch>` (`<task-id>` completion) vs in-process teammates (`teammate_spawned` ACK, `<teammate-message>` idle_notification).

- [Parent-side completion is not final](architecture-parent-completion-not-final.md) — queued-SendMessage ACK `{success,pin}` (no `resumedAgentId`) + post-`<task-notification>` re-wake; test cold parse AND line-by-line replay.

- [Old lines re-appended after resume](architecture-transcript-lines-reappended-after-resume.md) — same uuid/tool ids re-written after relocate/resume; detectors must skip already-seen ids (`isReplay`).

- [CLI binary holds transcript writers](reference-claude-cli-binary-has-transcript-writers.md) — `~/.local/share/claude/versions/<v>`; grep it to decode a new entry subtype (e.g. `agents_killed`).

- [Subagent transcript layout on disk](reference-transcript-subagent-layout.md) — subagents live in `<session-id>/subagents/agent-*.jsonl`; `scanClaudeSubSessions` looks in a `sessions/` dir that never exists; native worktree-entry leaves a same-id stub that can collide (fixed via `upsertIfMoreRelevant`); worktree-dir sidecar loss after cwd reverts to base — fixed on `fix/subagent-visibility-gaps`.

- [Enrichment runs on parse, nesting on the tick](architecture-enrichment-runs-only-on-parse-not-tick.md) — `enrichSubagentMetadata` (fills `agentId`) only ran when the parent transcript grew, leaving grandchildren unattached for a subagent's whole live run — fixed on `fix/subagent-visibility-gaps`.

- [Import-graph lint rules fail silent](architecture-import-graph-lint-rules-fail-silent.md) — `import-x/no-cycle` needs `import-x/extensions`+`parsers`; import-x v4 needs `resolver-next`; boundaries needs `checkAllOrigins`.

- [Worktree auto custom-title collides dedupe key](architecture-worktree-custom-title-collision.md) — Claude Code auto-stamps custom-title=worktree name (/→+); mistaken for a rename, collapses `getDedupeKey()`, drops sessions silently.

- [jscpd trips on generated schema file](architecture-jscpd-duplicate-in-generated-shapes.md) — `npm run lint`'s jscpd stage (separate from ESLint, own `.jscpd.json`) still fails on `src/generated/transcriptShapes.ts` after the ESLint ignore fix.

- [Tolerant parser pattern, convergent prior art](architecture-tolerant-parser-pattern.md) — 4 independent parsers of this format converge on per-line isolation + unknown-bucket; Tolerant Reader/ACL/Golden-Master naming + gaps.

- [scripts/package.json type:module breaks tsc NodeNext](architecture-scripts-package-json-breaks-tsc-nodenext.md) — flips scripts/ to ESM-ambient, forcing TS2835 on every extensionless import; unneeded once tsx is the runner.

- [Large generated file breaks lintRules.test.ts](architecture-generated-file-breaks-eslint-projectservice.md) — transcriptShapes.ts (~8000 lines) slows ESLint's parserOptions.projectService enough to time out an unrelated test; check before committing T12's real baseline.

- [CLI shutdown marker `cost-state`](architecture-cli-shutdown-marker-cost-state.md) — last line a process/conversation writes on exit; without it a killed session + its background subagents stay 'working' 30+ min (ghost rows beside the successor session).

- [Workflow journal is not a session](architecture-workflow-journal-not-a-session.md) — `subagents/workflows/wf_*/journal.jsonl` has no isSidechain, so the recursive watcher registered a phantom session "journal"; session registration is layout-based (`isClaudeSessionFile`).

- [schema:generate leaks free-form payload vocabulary](architecture-schema-gen-freeform-payloads-leak-vocabulary.md) — StructuredOutput input / structured_output data / journal result field names reach the committed schema (redactor scrubs values only); grep the diff before committing; readline splits U+2028.

- [Detecção de atividade sem processo externo](architecture-activity-detection-no-external-process.md) — lsof nunca achou arquivo (251 mil execuções, 0 acertos), removido na 0.6.0; watcher VS Code + mtime + tick, sem fs.watch recursivo.

- [RTK reescreve npm run lint e pula jscpd](architecture-rtk-rewrites-npm-lint-skips-jscpd.md) — `rtk lint` roda só ESLint (falso verde); use `rtk proxy npm run lint` para pegar clones do jscpd.

- [vi.spyOn(fs) não vê `import * as fs`](architecture-vitest-spyon-default-fs-misses-namespace-import.md) — spy de `import fs` grava 0 chamadas de `import * as fs` e `not.toHaveBeenCalled` passa vazio; use `vi.mock('fs', importOriginal)`.
