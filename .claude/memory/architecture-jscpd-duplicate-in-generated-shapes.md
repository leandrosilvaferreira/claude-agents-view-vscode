---
name: architecture-jscpd-duplicate-in-generated-shapes
description: npm run lint's jscpd stage (separate from ESLint) fails on src/generated/transcriptShapes.ts even after ESLint ignores it — different tool, different config.
metadata:
  type: architecture
---

`npm run lint` runs `eslint . && jscpd`. Adding `src/generated/**` to `eslint.config.mjs`'s
`ignores` stops ESLint's typed pass from choking on the ~8000-line generated file (verified:
`eslint .` alone exits clean), but `jscpd` (`.jscpd.json`: `threshold: 0`,
`ignore: ["src/test/**"]` only) still scans it and fails the moment two observed transcript
`type:subtype` buckets happen to share an identical field list — verified with
`SystemInformational` vs `SystemLocalCommand`, both 14 identical fields, 21 duplicate lines.
Near-certain to recur as the corpus grows and more subtypes converge on the same base shape.

**Why:** the plan (`transcript-schema-gen.md` T14) only anticipated ESLint's own
`sonarjs/no-duplicate-string`; `jscpd` is a wholly separate CLI stage with its own config
file, invisible to any `eslint.config.mjs`-only fix.

**How to apply:** the symmetric fix is adding `"src/generated/**"` to `.jscpd.json`'s
`ignore` array (same reasoning as the ESLint fix: generated, not hand-written, not a real
duplication smell) — not applied as of this note; it needs editing `.jscpd.json`, a decision
left to whoever owns that scope.
