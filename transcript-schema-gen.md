# Transcript Schema Generation Tool — Implementation Plan

> Planning doc only — no code written. Created 2026-08-21. Written in English per this
> repo's own CLAUDE.md convention ("comments and documentation are English too"), which
> takes precedence over the developer's global Portuguese-docs default.

## Overview

Claude Code CLI's on-disk transcript format (`~/.claude/projects/**/*.jsonl`) has no
official schema — confirmed this session against primary sources (Anthropic's own docs,
the Agent SDK source, and an open, unanswered GitHub feature request). This project's
runtime parser (`src/logParser.ts`, `src/subagentDetector.ts`) already handles that
correctly via a version-agnostic Tolerant Reader pattern and must stay that way.

This plan builds a **dev-time-only, manually-run CLI tool** that scans the developer's own
local transcript corpus and regenerates two committed reference artifacts — a TypeScript
shape reference and a redacted real-fixture regression-test corpus — that inform humans and
tests. **It never runs at extension runtime, ships nothing in the `.vsix`, and must not
become a validation contract the parser is bound to.** The architecture (one cumulative
schema with per-field version provenance, not a version window; `/scripts` outside
`tsconfig.json`/`eslint.config.mjs`'s current scope; redact-then-commit fixtures) was
already decided in a prior research/Q&A pass and is not re-litigated here — this plan only
decomposes it into ordered, verifiable tasks.

**Recommended execution mode:** this touches 10+ new files across two domains (Node/TS
tooling + test fixtures) plus multiple config edits, which meets this repo's own bar for
`superpowers:subagent-driven-development` (CLAUDE.md → Workflow & Agents). Dispatch each
task below to the specialist named in its row — `backend-specialist` for pipeline/tooling
code, `test-engineer` for tests — never a generic implementer, per this repo's mandatory
specialist-routing table.

## Project Type

**BACKEND — Node.js CLI tooling, dev-time only.** Not part of the shipped VS Code
extension; no UI, no API, no database. Primary implementation agent: `backend-specialist`.
No `frontend-specialist`, no `mobile-developer`, no `devops-engineer` (no CI wiring — see
Non-Goals).

## Scope Guardrail

A different, concurrent session is actively working on `src/sessionTreeDataProvider.ts`.
**No task in this plan touches that file, or anything that imports it.** Every new/edited
path below is one of: `scripts/**`, `src/generated/**`, `src/test/fixtures/schema-corpus/**`,
`src/test/schemaGoldenMaster.test.ts`, plus additive edits to `eslint.config.mjs`,
`package.json`. If a future editor of this plan is tempted to also "fix up" the tree
provider while in the area — don't; it's out of scope and someone else owns it right now.

## Success Criteria

1. `npm run schema:generate` runs against the developer's real `~/.claude/projects/**`
   corpus to completion without crashing, even when some lines are malformed.
2. `src/generated/transcriptShapes.ts` exists, is headed with a generation date + observed
   CLI versions + an explicit "generated, non-authoritative reference — do not hand-edit,
   not a runtime contract" banner, and is not imported by any file reachable from
   `src/extension.ts` (confirmed absent from `dist/extension.js` after `npm run build`).
3. Running the generator a second time (simulating a later CLI version with a trimmed
   30-day local log window) preserves every field/type/version-provenance fact recorded by
   the first run — nothing already known is silently dropped, only new facts are unioned in.
4. `src/test/fixtures/schema-corpus/**` contains real sample lines with **zero** occurrences
   of the developer's OS username or home-directory path (grep-verified, see Phase X).
5. `npx tsc --noEmit`, `tsc -p scripts/tsconfig.json --noEmit`, `npm run lint`, and
   `npm run test` all pass.
6. Nothing under `scripts/**` appears in the packaged `.vsix` (already true today via
   `.vscodeignore` — verified, not newly built).
7. `src/logParser.ts`, `src/subagentDetector.ts`, and `src/sessionTreeDataProvider.ts` are
   byte-for-byte unmodified by this work.
8. No runtime schema-validation code (Zod or otherwise) is added to any file reachable from
   `src/extension.ts`.

## Tech Stack

| Choice                                                                                                                     | Where                                                            | Rationale                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| -------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| TypeScript, own `scripts/tsconfig.json`                                                                                    | `scripts/`                                                       | `tsconfig.json`'s `include` is `["src/**/*"]` only (verified) — a file under `scripts/` needs its own TS project to be typed at all.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| `node` (native type-stripping) **or** `tsx` — decided by a 30-second check at implementation start, not pre-committed here | running the tool                                                 | Ladder-first: this repo's `@types/node` devDependency range (`^24.13.3`) suggests a Node new enough to run `.ts` files natively without a new dependency. Implementer runs `node --version`; Node ≥ 24 → run `node scripts/schema-gen/generate.ts` directly, zero new dependency. Older/uncertain → add `tsx` as a devDependency (one line, no build-output directory to manage, simpler than a `tsc`-then-`node` two-step). Either way the code must already avoid non-erasable TS syntax (numeric `enum`, parameter properties) — which this repo's own `.claude/rules/typescript/coding-standards.md` bans anyway, so this isn't an extra constraint. |
| Zod, devDependency, `scripts/` only                                                                                        | corpus walker's raw-JSON boundary                                | Matches this repo's own `.claude/rules/typescript/coding-standards.md`: "Zod for runtime validation at external boundaries." Scope is a boundary check only — "is this line at least a JSON object" — not full schema validation (there is no schema to validate against; that's the point). Installed as a `devDependency`, and even if it weren't, esbuild only bundles what's transitively imported from `src/extension.ts`, so it physically cannot reach `dist/extension.js`.                                                                                                                                                                       |
| vitest (existing, no config change)                                                                                        | `scripts/**/*.test.ts` and `src/test/schemaGoldenMaster.test.ts` | `vitest.config.ts`'s `test.exclude` is only `node_modules`/`dist`/`out` (verified) — scripts tests are discovered automatically. `coverage.include` is `src/**/*.ts` only (verified) — scripts tests run but don't count toward the 80% gate; that's already the accepted status quo, no change requested.                                                                                                                                                                                                                                                                                                                                               |

**Lint limits apply to the new code too.** Once Task 3 lands, `scripts/**/*.ts` is subject
to the same global rules as `src/` — `max-lines: 355`, `max-lines-per-function: 100`,
`complexity: 10`, `max-statements: 20`, no `any`, etc. (verified: these rules in
`eslint.config.mjs` carry no `files` restriction, so they apply repo-wide once a path stops
being ignored). Design each pipeline stage as its own small, single-purpose file from the
start rather than one large script — cheaper than discovering the limit after the fact.

## File Structure

```
scripts/
  install-plugins.mjs              existing — untouched
  tsconfig.json                    new — own TS project, noEmit, types:["node"] pinned
  schema-gen/
    generate.ts                    new — CLI entry point (npm run schema:generate)
    schemaModel.ts                 new — observation types + JSON artifact read/merge/write
    corpusWalker.ts                new — tolerant per-line walk of ~/.claude/projects/**/*.jsonl
    schemaAggregator.ts            new — groups by type(+subtype), tracks fields/provenance/unknowns
    redact.ts                      new — allowlist-based redaction (reuses "Sample text N")
    redact.test.ts                 new — unit test for redact.ts
    generateTsReference.ts         new — renders src/generated/transcriptShapes.ts
    generateFixtures.ts            new — selects + redacts sample lines, writes fixture .jsonl
    diffLogEntry.ts                new — flags fields observed but undocumented in LogEntry (T17)
    schema-observations.json       new — committed cumulative artifact (the tool's own state)

src/
  generated/
    transcriptShapes.ts            new — generated reference, explicitly non-authoritative
  test/
    schemaGoldenMaster.test.ts     new — regression test against the new fixtures
    fixtures/
      schema-corpus/               new — one redacted .jsonl per known (type, subtype)

eslint.config.mjs                  edited — narrow one ignores entry (line 38)
package.json                       edited — 2 new devDependencies max, 2 new scripts
```

**Confirmed no-ops (verified this session, no task needed):**

- `.vscodeignore` already excludes `scripts/**` (line 13) _and_ all of `src/**` (line 24) —
  the new generated/fixture files ship nowhere near the `.vsix` without any edit.
- `esbuild.js` needs no change — it only bundles what `src/extension.ts` transitively
  imports, and nothing in this plan is imported from there.
- `vitest.config.ts` needs no change (see Tech Stack table above).
- `src/transcriptEntry.ts`'s hand-maintained `LogEntry` interface is a **separate,
  pre-existing** thing this parser already relies on — do not merge it with, generate it
  from, or replace it with `src/generated/transcriptShapes.ts`. See Decisions below.

**Do not gitignore the new `generated/` paths.** Unlike a typical build-output
`generated/` folder, `src/generated/transcriptShapes.ts` and
`scripts/schema-gen/schema-observations.json` must both be **committed** — cross-run
merging (Success Criterion 3) only works if the prior run's output is sitting in git for
the next run to read and union into.

## Data Shapes (illustrative — not literal code)

`scripts/schema-gen/schema-observations.json`, the tool's own cumulative state:

```
{
  generatedAt: "<ISO timestamp of most recent run>",
  cliVersionsObserved: ["2.1.210", "2.1.218", ...],   // union across every run ever
  types: {
    "<type>" | "<type>:<subtype>": {
      sampleCount, firstSeenVersion, lastSeenVersion,
      fields: {
        "<dotted.field.path>": { types: [...observed JS typeof values...], presentCount, firstSeenVersion, lastSeenVersion }
      }
    }
  },
  unknownTypes: { /* same shape, for lines whose `type` matched nothing recognized */ }
}
```

Cap field-path recursion depth (e.g. 4–5 levels) and collapse array contents to a single
`[]` path segment rather than per-index — an unbounded walk into a large `tool_use`
input/output could otherwise blow up the field-path space on a single pathological line.

## Task Breakdown

Dependency graph at a glance (→ = "depends on"):

```
T1 → T2, T3
T2 → T4
T1, T4 → T5 → T6 → T7 → T9
T4      → T6
T1      → T8 (independent of T5–T7; buildable in parallel)
T7      → T17 (independent of T8–T10; buildable in parallel)
T7, T8  → T10 → T11 (also needs T9, T17)
T11, T4 → T12 (first real run)
T12     → T13 (golden-master test)
T12, T3 → T14 (conditional lint fix)
T13, T14 → T15 (verification) → T16 (review)
```

T5–T8 and T2/T3 are each independently dispatchable in parallel once T1 lands; T17 joins
that parallel set once T7 lands.

---

**T1 — `scripts/` TS project scaffold**
Priority P0 · Agent `backend-specialist` · Skill: none needed (mechanical) · Deps: none

- INPUT: none.
- OUTPUT: `scripts/tsconfig.json` — `module`/`moduleResolution: NodeNext`, `target: ES2022`,
  `strict: true`, `rootDir: "scripts"`, `include: ["scripts/**/*.ts"]`, `noEmit: true`, and
  **`types: ["node"]`** pinned explicitly. That last one is not optional boilerplate: this
  repo's own memory (`architecture-types-node-pin-under-nodenext.md`) documents that vitest
  4's transitive `@types/chai` silently breaks NodeNext's automatic `@types` inclusion —
  the exact failure mode this new project would hit the moment its own `.test.ts` files run
  under vitest, if this pin is skipped.
- VERIFY: `tsc -p scripts/tsconfig.json --noEmit` exits 0 against an empty `scripts/schema-gen/`
  (or a one-line placeholder file), proving the project resolves before any real code exists.

**T2 — Decide & wire the TS execution method**
Priority P0 · Agent `backend-specialist` · Deps: T1

- INPUT: `node --version` on the developer's machine.
- OUTPUT: either (a) confirmation that plain `node scripts/schema-gen/generate.ts` runs a
  trivial erasable-syntax `.ts` file with no new dependency, or (b) `tsx` added to
  `devDependencies`. Record the one-line decision + why as a comment at the top of
  `scripts/schema-gen/generate.ts` once T11 creates it.
- VERIFY: the chosen runner executes a throwaway `console.log('ok')` script under
  `scripts/schema-gen/` successfully.

**T3 — ESLint: lint the new TS tree without newly linting the old one**
Priority P0 · Agent `backend-specialist` · Deps: T1

- INPUT: `eslint.config.mjs`'s top-level `ignores` array (line 38 is currently
  `'scripts/**'`, blanket-ignoring the whole directory — verified this session).
- OUTPUT: replace that one entry with the exact existing file it needs to keep ignoring —
  `'scripts/install-plugins.mjs'` — rather than removing the ignore wholesale. **Do not
  blanket-unignore `scripts/**`**: `install-plugins.mjs` has never been linted before (it
  was always covered by the old blanket ignore), and unignoring the whole directory would
  retroactively surface an unknown pile of pre-existing lint findings in an unrelated file
  as a side effect of this task — exactly the kind of scope creep this repo's own
  "surgical changes" rule warns against. This narrower swap lets `scripts/schema-gen/**/*.ts`
  become lintable while `install-plugins.mjs` stays exactly as ignored as it is today.
- VERIFY: `npm run lint` — `install-plugins.mjs` produces the same (zero) findings as before
  the edit; a deliberately-bad placeholder `.ts` file under `scripts/schema-gen/` (e.g. an
  unused variable) _does_ get flagged, proving the new tree is actually linted; then delete
  the placeholder. Also confirm typed linting resolves: if ESLint errors with something like
  "parserOptions.project has been set... but the file does not match your project" for the
  scripts tree, the existing global `parserOptions.projectService: true` (line ~46) isn't
  auto-discovering `scripts/tsconfig.json` — add a scoped
  `{ files: ['scripts/schema-gen/**/*.ts'], languageOptions: { parserOptions: { project: './scripts/tsconfig.json' } } }`
  block only if this fallback is actually needed.

**T4 — `package.json`: dependencies + scripts**
Priority P0 · Agent `backend-specialist` · Deps: T2

- INPUT: T2's runner decision.
- OUTPUT: add `zod` to `devDependencies` (latest stable at implementation time); add `tsx`
  too, only if T2 chose it. Add two scripts: `"schema:generate": "<node|tsx> scripts/schema-gen/generate.ts"`
  and `"compile:scripts": "tsc -p scripts/tsconfig.json --noEmit"` (mirrors the existing
  `"compile"` script's naming rather than inventing an unrelated `typecheck` verb this repo
  doesn't otherwise use).
- VERIFY: `npm run compile:scripts` and `npm run schema:generate` both resolve as valid
  scripts (`npm run` lists them); neither script is referenced from `vscode:prepublish`,
  `package`, or `package:ci`.

**T5 — Schema observation data model**
Priority P1 · Agent `backend-specialist` · Deps: T1

- INPUT: the illustrative shape above.
- OUTPUT: `scripts/schema-gen/schemaModel.ts` — the TS types for one type-bucket's
  observations, and three pure functions: load the existing `schema-observations.json` (or
  return an empty baseline if absent — this is the very first run), merge a new observation
  batch into it (union, never delete), and serialize it back to disk.
- VERIFY: a hand-written unit test (co-located, `schemaModel.test.ts`) proves merge is
  additive: merging batch B into a baseline that already has fields from batch A yields
  every field from both, with `firstSeenVersion` never regressing and `lastSeenVersion`
  never going backwards.

**T6 — Corpus walker**
Priority P1 · Agent `backend-specialist` · Deps: T1, T4, T5

- INPUT: `os.homedir()` + `~/.claude/projects/**/*.jsonl` (recursive glob — this naturally
  also sweeps in each session's `<sessionId>/subagents/agent-*.jsonl` sidechain transcripts,
  which is desirable: those carry `isSidechain: true` and are worth observing too. It also
  naturally excludes Antigravity logs, which live under a completely different root,
  `~/.gemini/...` — no extra brand-filtering code needed).
- OUTPUT: an async generator/iterator yielding one result per line: either a parsed JSON
  object (Zod-checked only for "is this a JSON object, not an array/string/null" — nothing
  deeper, there is no schema to validate against) or a captured parse-error record. A
  malformed line is recorded and skipped — it must never abort the walk (mirrors the
  `Event | ParseError` per-line isolation this session's prior-art research flagged in
  `coo-labs/tjsonl`).
- VERIFY: point it at a scratch directory containing one valid `.jsonl` file and one file
  with a deliberately corrupt line in the middle; confirm the walk yields results for every
  valid line on both sides of the corrupt one, plus exactly one error record.

**T7 — Schema aggregator**
Priority P1 · Agent `backend-specialist` · Deps: T5, T6

- INPUT: the walker's per-line stream.
- OUTPUT: `scripts/schema-gen/schemaAggregator.ts` — groups observations by `type`
  (+`subtype` where present, e.g. system messages), and for each bucket tracks the field
  set, per-field observed-type union, presence count, and first/last-seen CLI version
  (sourced from that line's own `version` field — no shelling out to `claude --version`).
  Lines whose `type` doesn't match anything already known land in an explicit
  `unknownTypes` bucket rather than being dropped. Feeds into T5's merge function so a
  second run unions into the committed artifact instead of overwriting it.
- VERIFY: aggregate a small fixture set with two lines sharing a `type` but differing in one
  field's presence; confirm the resulting presence count and type-union both reflect both
  lines, and that a line with an unrecognized `type` shows up under `unknownTypes`, not
  silently discarded.

**T8 — Redaction helper + unit test**
Priority P1 · Agent `test-engineer` (redaction is privacy-relevant branching logic — worth
a real test per this repo's own `.claude/rules/05-testing.md`) · Skill: `superpowers:test-driven-development`
· Deps: T1 (independent of T5–T7 — dispatch in parallel)

- INPUT: `src/transcriptEntry.ts`'s `LogEntry` interface — already enumerates and comments
  every currently-known free-text/path field (`message.content[].text`, `prompt`,
  `attachment.prompt`, `tool_calls[].arguments.*`, `Cwd`/`cwd`, `gitBranch`/`git.branch`,
  `customTitle`, `aiTitle`, `worktreeSession.worktreeName`, `TargetFile`). Use this as the
  reference for which field names are known free-text/path fields — as documentation only,
  not a type-level import (`scripts/` sits outside the root TS project on purpose; keep it
  that way rather than wiring a cross-project reference for one field list).
- OUTPUT: `scripts/schema-gen/redact.ts`, exporting a pure `redact(line)` function. Build it
  **allowlist-first, not denylist-first** — per this repo's own `.claude/rules/06-security.md`
  ("use allowlists where possible"): only structurally-safe values (known enum-like fields
  such as `type`, `role`, `status`, booleans, and value _shapes_/lengths) pass through
  unchanged; every other string leaf, anywhere in the object including inside
  `toolUseResult` and `tool_calls[].arguments` (both of which can carry arbitrary
  echoed tool output — file contents, env values, anything), is replaced with a placeholder.
  Reuse the existing convention from `src/test/fixtures/real-logs/` (see the header comment
  in `logParser.realLogs.test.ts`): `Sample text N`, counter stable per file, so redacted
  fixtures read consistently with the fixtures already in the repo.
- VERIFY (`redact.test.ts`): a fixture line with a real-looking prompt, absolute home-dir
  path, and branch name comes back with all three replaced; `type`/`role`/`status`-shaped
  fields survive unchanged; running redact twice on the same input yields the same
  placeholder numbering (deterministic, not random).

**T9 — TS reference generator**
Priority P2 · Agent `backend-specialist` · Deps: T7

- INPUT: the aggregated model.
- OUTPUT: `scripts/schema-gen/generateTsReference.ts`, rendering `src/generated/transcriptShapes.ts`.
  Header comment block: generation date, the full set of CLI versions represented in the
  corpus that produced it, and an explicit "AUTO-GENERATED — regenerate via
  `npm run schema:generate`; observational reference only, not a runtime contract, do not
  hand-edit, do not import from runtime parsing code" banner.
- VERIFY: run against a small synthetic aggregated model; confirm the header banner is
  present and the file is syntactically valid TS (`tsc -p scripts/tsconfig.json --noEmit`
  after a throwaway copy into a location it can typecheck, or just eyeball for T12's real run).

**T10 — Fixture corpus generator**
Priority P2 · Agent `backend-specialist` · Deps: T7, T8

- INPUT: the aggregated model + T8's `redact()`.
- OUTPUT: `scripts/schema-gen/generateFixtures.ts` — for each known `(type, subtype)`
  bucket, selects up to 3 real sample lines (fewer if the corpus has fewer), redacts each
  via T8, and writes them to `src/test/fixtures/schema-corpus/<type-or-type-subtype>.jsonl`
  — one file per bucket, mirroring the existing `real-logs/` convention of one file, one
  focused purpose (just re-keyed by observed type instead of by bug scenario).
- VERIFY: against a small synthetic corpus with 5 lines of the same type, confirms exactly
  3 land in the fixture file, and every line in the output file has passed through `redact()`
  (spot check: no raw-looking absolute path in the output).

**T17 — LogEntry documentation-gap report**
Priority P2 · Agent `backend-specialist` · Deps: T7

- INPUT: the aggregated model (T7) + `src/transcriptEntry.ts`'s `LogEntry` interface, read
  as text and parsed via the TypeScript Compiler API (`typescript` is already a root
  devDependency, resolvable from `scripts/` since `node_modules` is shared — this is AST
  parsing of one file, not a cross-project type import, so `scripts/` still doesn't need to
  join the root `tsconfig.json`).
- OUTPUT: `scripts/schema-gen/diffLogEntry.ts`, exporting a pure function that takes the
  aggregated model + the list of property names extracted from `LogEntry`'s AST, and returns
  every field the aggregator observed (above some minimal sample-count threshold, to skip
  one-off noise) that `LogEntry` does not declare. Printed as a console report by T11 — a
  human folds confirmed-real fields into `LogEntry` by hand; this task never writes to
  `transcriptEntry.ts` itself.
- VERIFY: unit test with a synthetic aggregated model containing one field name absent from
  a synthetic/fixture `LogEntry`-shaped interface source string; report lists exactly that
  field and no fields that are actually present in the interface.

**T11 — CLI orchestrator entry point**
Priority P2 · Agent `backend-specialist` · Deps: T9, T10, T17

- INPUT: all prior pieces.
- OUTPUT: `scripts/schema-gen/generate.ts` — walk (T6) → aggregate (T7) → load-existing +
  merge (T5) → write `schema-observations.json` → generate TS reference (T9) → generate
  fixtures (T10) → print T17's LogEntry-gap report to the console as the run's final step.
  Wired to `npm run schema:generate` from T4.
- VERIFY: `npm run schema:generate` runs end-to-end against a scratch corpus directory
  without throwing, and its console output includes T17's report section (even if empty).

**T12 — First real run (produces the actual committed baseline)**
Priority P2 · Agent `backend-specialist` (runs it) + developer review · Deps: T11, T4

- INPUT: the developer's real `~/.claude/projects/**` corpus.
- OUTPUT: the first real `schema-observations.json`, `src/generated/transcriptShapes.ts`,
  and `src/test/fixtures/schema-corpus/**` — this is the step that actually produces
  something T13 can test against; T9/T10's code being "done" doesn't mean these files exist
  yet. **Developer reviews `git diff` on the new fixture files before committing** — the
  human privacy spot-check, not something the tool automates away, same as any other
  generated-file workflow in this repo.
- VERIFY: `grep -rF "$(whoami)" src/test/fixtures/schema-corpus/` and
  `grep -rF "$HOME" src/test/fixtures/schema-corpus/` both return no matches.

**T13 — Golden-master regression test**
Priority P2 · Agent `test-engineer` · Skill: `superpowers:test-driven-development` · Deps: T12

- INPUT: `src/test/fixtures/schema-corpus/**` (real files on disk now).
- OUTPUT: `src/test/schemaGoldenMaster.test.ts` — runs the existing runtime `LogParser` /
  `detectSubagents` against each fixture file and snapshots the resulting shape per known
  type, so a future silent regression in the tolerant-reader parser (a field quietly stops
  being read) is caught. **Reads only the committed `.jsonl` fixture files via `fs`/`path`**
  (same pattern as `logParser.realLogs.test.ts`) — never imports anything from `scripts/`,
  which sits outside the `src/` TS project on purpose.
- VERIFY: `npm run test` — new suite passes; deliberately break one field read in a
  scratch copy of `logParser.ts` and confirm the new test (not just existing ones) fails,
  proving it actually exercises something.

**T14 — Conditional ESLint relaxation for `src/generated/**`**
Priority P2 · Agent `backend-specialist` · Deps: T12, T3

- INPUT: `npm run lint` output against the real `transcriptShapes.ts` from T12.
- OUTPUT: **only if** the real generated file trips `max-lines` or
  `sonarjs/no-duplicate-string` (plausible for a large declarative const structure driven by
  corpus size, not code quality) — add one scoped override block, mirroring the existing
  precedent at `eslint.config.mjs` lines 202–216 (`files: ['src/test/**/*.ts']`):
  `{ files: ['src/generated/**/*.ts'], rules: { 'max-lines': 'off', 'sonarjs/no-duplicate-string': 'off' } }`.
  If the real file stays under the limits, skip this task entirely and say so — don't add
  speculative config for a problem that didn't occur.
- VERIFY: `npm run lint` is clean either way.

**T15 — Full verification pass**
Priority P3 · Agent `backend-specialist` · Deps: T13, T14

- Run, in order, and report actual output (per this repo's own verification rule — don't
  assert success without running them):
  1. `npx tsc --noEmit`
  2. `tsc -p scripts/tsconfig.json --noEmit` (or `npm run compile:scripts`)
  3. `npm run lint`
  4. `npm run test`
  5. `npm run build`, then confirm `dist/extension.js` contains no reference to
     `transcriptShapes` (e.g. `grep -c transcriptShapes dist/extension.js` → 0).
  6. Confirm `git diff -- src/logParser.ts src/subagentDetector.ts src/sessionTreeDataProvider.ts`
     is empty.

**T16 — Code review**
Priority P3 · Agents `code-reviewer` + `typescript-reviewer` + `security-reviewer` (redaction/
privacy angle) · Deps: T15

- Per this repo's own mandatory code-review rule: all three, applying the `uncle-bob-craft`
  skill's criteria (Dependency Rule, SOLID in context, code smells) alongside their normal
  findings. `security-reviewer` focus: does `redact.ts`'s allowlist actually cover every
  string-bearing path in `LogEntry`, and does nothing reachable from `src/extension.ts`
  gain a new import.

## Decisions & Open Questions

Nothing below blocks starting T1 — these are judgment calls made to keep the plan concrete;
flip any of them freely, they're cheap to change before implementation and not free after.

1. **`schema-observations.json` lives under `scripts/schema-gen/`, not `src/generated/`.**
   Reasoning: it's the tool's own internal merge-state, not something extension code, tests,
   or a human reader ever needs to open — keeping `src/generated/` meaning "outputs meant to
   be read" stays cleaner if the raw database sits next to the tool that owns it. Easy to
   move later if you'd rather see both generated artifacts side by side.
2. **Fixture layout is one `.jsonl` file per `(type, subtype)`,** not one combined file.
   Mirrors the existing `real-logs/` convention (one file, one focused purpose) and makes a
   future golden-master failure easy to attribute to a specific type at a glance.
3. **"A handful" of fixture samples per type = up to 3.** Arbitrary but reasonable; trivial
   to change to a different constant, doesn't ripple anywhere else.
4. **Confirmed: building the "diff generated shapes against `LogEntry`" feature** (user
   sign-off 2026-08-21) — surfaces fields the generator observed that
   `src/transcriptEntry.ts`'s hand-maintained `LogEntry` interface doesn't yet document, for
   a human to manually fold in. See Task T17. It reads `transcriptEntry.ts` as text/AST via
   the TypeScript Compiler API (`typescript` is already a root devDependency, resolvable from
   `scripts/` since `node_modules` is shared) rather than a cross-project type import — keeps
   `scripts/` outside the root TS project, per the same reasoning T8 already applies to the
   same file.
5. **T2's runner choice (native `node` vs `tsx`) is deliberately left to a 30-second check at
   implementation time** rather than decided in this document, since it depends on the
   actual Node version on the developer's machine, which this plan has no way to know.

## Non-Goals (explicit — do not add these)

- No CI wiring, no scheduled/automated runs — manual, on-demand, dev-time-only, per explicit
  request.
- No runtime schema validation added to the shipped extension — `LogParser` /
  `subagentDetector.ts` stay exactly as tolerant and version-agnostic as they are today.
- No Antigravity transcript format support in this tool (Claude Code only; see T6 — the
  glob scope excludes it structurally, no filtering code needed).
- No changes to `src/sessionTreeDataProvider.ts` (see Scope Guardrail).
- No packaging/`.vscodeignore`/`esbuild.js` changes — both already cover this correctly.

## Phase X — Verification Checklist

Copy of T15/T16, restated as a flat checklist for the actual implementation session to tick
off — do not mark any box without having run the command:

- [ ] `npx tsc --noEmit` passes
- [ ] `tsc -p scripts/tsconfig.json --noEmit` passes
- [ ] `npm run lint` passes (including `scripts/schema-gen/**` and `install-plugins.mjs`
      showing zero _new_ findings)
- [ ] `npm run test` passes, including the new `schemaGoldenMaster.test.ts` and
      `redact.test.ts`
- [ ] `npm run build` succeeds; `dist/extension.js` contains no reference to
      `transcriptShapes`
- [ ] `grep -rF "$(whoami)"` and `grep -rF "$HOME"` over `src/test/fixtures/schema-corpus/`
      both return nothing
- [ ] `git diff` on `src/logParser.ts`, `src/subagentDetector.ts`,
      `src/sessionTreeDataProvider.ts` is empty
- [ ] `code-reviewer`, `typescript-reviewer`, `security-reviewer` all run, CRITICAL/HIGH
      findings resolved
