---
name: tolerant-parser-pattern
description: Recommended parsing architecture for Claude Code's schema-less transcript — Tolerant Reader + the existing ACL boundary + Golden Master/VCR-style real-fixture testing, validated by convergent independent community prior art
metadata:
  type: architecture
---

At least 4 independent community projects parse this exact undocumented format
(`daaain/claude-code-log`, `ccusage/ccusage`, `coo-labs/tjsonl`,
`simonw/claude-code-transcripts`) and converge on the same two defenses regardless of
language or rigor: **(1) per-line isolation** — one bad/unrecognized line never aborts
the whole file — and **(2) an explicit "unknown" bucket** the moment any typed layer
exists (daaain's `PassthroughTranscriptEntry`, tjsonl's 6-way unknown/missing taxonomy,
ccusage's structural type-field-free selection). `coo-labs/tjsonl`'s own README claims
"half a dozen community parsers have converged independently on the same envelope."
This project already does both, via `logParser.ts`'s try/catch + `logDebug` convention
and permissive TypeScript shapes — this confirms the current approach, it doesn't call
for a rewrite.

External-literature names for what we already do (or should tighten): **Tolerant
Reader** (Fowler) = extract only the fields a caller needs, ignore/pass through the
rest, never bind to a schema-generated class. **Anti-Corruption Layer** (DDD) = the
existing `logParser.ts` / `subagentDetector.ts` boundary already _is_ this — `Session`
/ `SubAgent` in `types.ts` is the protected internal model; nothing downstream should
ever see raw JSON. **Golden Master / VCR-style testing** (Feathers) = the concrete fix
for `architecture-fixtures-hide-real-log-shapes.md` — snapshot real captured lines
(never hand-written), diff on change, recapture after a Claude Code CLI upgrade (no
cron needed: single machine, no live network target to poll).

**Why:** researched 2026-08-21 via 2 parallel subagents (prior art across ~25
Claude-Code-adjacent repos, 4 deep-dived + general resilient-parsing literature:
Postel's Law/RFC 9413, schema-on-read, yt-dlp/Wireshark/Fluentd) after the user asked
for external architecture precedent, following up on
`architecture-no-public-transcript-schema.md`. Full dossier with sources published as
a Claude Artifact in that session (not linked here — session artifacts aren't a stable
repo reference; re-run the research if the analysis needs revisiting).

**How to apply:** don't introduce a schema registry, fuzz harness, or contract-broker —
surveyed and judged overkill at this scale (one unversioned local producer, one
consumer, no network target). Do add explicit unit tests for "unrecognized `type`",
"missing field", "truncated JSON", "null where object expected" (currently only
covered implicitly), and consider a small real-fixture snapshot corpus refreshed after
CLI upgrades.
