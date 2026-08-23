---
paths:
  - 'src/logParser.ts'
  - 'src/subagentDetector.ts'
  - 'src/transcriptEntry.ts'
  - 'src/nameExtractor.ts'
  - 'src/sessionActivity.ts'
  - 'src/projectPathResolver.ts'
  - 'src/nestedSubagents.ts'
  - 'src/subagentMetadata.ts'
---

# Schema-drift verification — transcript parsers

These 8 files parse the undocumented, unversioned Claude Code / Antigravity transcript
JSONL format — a deliberate Tolerant Reader (see
`.claude/memory/architecture-tolerant-parser-pattern.md` and
`.claude/memory/architecture-no-public-transcript-schema.md`). After editing any of them:

1. **Run `npm run schema:generate`** (dev-time-only; walks the developer's real
   `~/.claude/projects` transcript corpus — never CI, never automatic). It rewrites
   `src/generated/transcriptShapes.ts`, `scripts/schema-gen/schema-observations.json`,
   and the redacted fixture corpus `src/test/fixtures/schema-corpus/**`, then prints a
   "LogEntry documentation-gap report" — every real top-level field the corpus has that
   `src/transcriptEntry.ts`'s `LogEntry` interface doesn't declare.

2. **Read the report, but judge each field — don't file all of them.** Most listed
   fields are expected noise. `LogEntry` is a narrow Tolerant-Reader ACL that only
   declares fields the parser actually uses, not a full mirror of the raw format (see
   `transcriptEntry.ts`'s own header comment). Only treat a field as a real gap if it
   plausibly affects the feature this edit just touched — title extraction,
   status/activity detection, subagent linking, project-path resolution, timestamps.

3. **If the edit changed what the parser reads or produces for any known
   `type`(:`subtype`) bucket, update the golden-master snapshot and review the diff by
   eye:** `npx vitest run src/test/schemaGoldenMaster.test.ts -u`. A snapshot that
   updates silently proves nothing — a human or agent must confirm the diff is the
   intended new shape, not a regression, before committing.

4. **Never let `src/generated/transcriptShapes.ts` become a runtime dependency.** It
   stays observational-only — not imported by anything reachable from
   `src/extension.ts`. This is a settled architecture decision (see
   `transcript-schema-gen.md`'s Non-Goals section in the repo root); don't re-litigate
   it.

5. **If `npm run schema:generate` found no _structural_ drift, bump the version pin.**
   "No structural drift" means the regenerated `src/generated/transcriptShapes.ts` differs
   from the committed one only in its `// present in N/M samples` sample-count comments —
   diff the file with those comments stripped and confirm no line differs, i.e. no field
   path was added or removed and no type changed. Only then update
   `KNOWN_COMPATIBLE_CLAUDE_VERSION` in `src/claudeCompat.ts` to the new Claude Code CLI
   version. If the diff shows real structural drift instead, do NOT bump the pin — that is
   exactly the case this procedure exists to catch, and it needs parser investigation
   (steps 1-3 above) before the pin is touched.

This procedure is a drift-detector and coverage-gap surfacer, not a schema validator.
Never turn it into a runtime contract the parser is bound to — that was deliberately
rejected (see `.claude/memory/architecture-tolerant-parser-pattern.md`).
