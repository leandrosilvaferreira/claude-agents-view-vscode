---
name: architecture-generated-file-breaks-eslint-projectservice
description: A large src/generated/*.ts file (~8000 lines) makes ESLint's parserOptions.projectService slow enough to time out the unrelated src/test/lintRules.test.ts.
metadata:
  type: architecture
---

Running `npm run schema:generate` for real against `~/.claude/projects` writes
`src/generated/transcriptShapes.ts` at ~8000 lines (one interface per observed transcript
`type`/`type:subtype` bucket). Because root `tsconfig.json` includes `src/**/*` and ESLint's
config sets `parserOptions.projectService: true`, this file joins the type-checked project
graph for every lint run. Its mere presence — regardless of whether its own content is
lint-clean — slows typed linting enough that `src/test/lintRules.test.ts` (which invokes
ESLint programmatically against a probe string with a 5000ms test timeout) starts failing on
`Test timed out in 5000ms`, on a test file that never mentions this feature. Verified by
isolation: removing the file makes the test pass reliably; restoring it reproduces the
timeout every time.

**Why:** none of T5–T10/T17's unit tests could catch this — they all use small synthetic
models. It only appears once the pipeline runs against a real, large corpus.

**How to apply:** before committing the real `transcriptShapes.ts` baseline (the plan's
T12/T14), re-run the full `npm run test` suite with the file actually present on disk, not
just `npm run schema:generate`'s own exit code. If `lintRules.test.ts` times out, this file
is why — the options are excluding `src/generated/**` from `projectService`, or raising that
test's timeout; T14 as currently scoped (`max-lines`/`sonarjs` only) does not cover this.
