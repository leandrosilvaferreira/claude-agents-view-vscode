#!/usr/bin/env node
/**
 * PreToolUse reminder for the transcript-parsing modules. When an Edit/Write/
 * MultiEdit targets one of the files that parse the Claude Code / Antigravity
 * transcript JSONL format, inject a reminder to run the schema-drift
 * verification procedure before calling the edit done. Pure context
 * injection — emits `additionalContext` only, never a permission decision, so
 * it never blocks or auto-approves the write.
 *
 * Deliberately does NOT run `npm run schema:generate` itself: that walks the
 * developer's real `~/.claude/projects` corpus and rewrites committed files
 * (src/generated/transcriptShapes.ts, the fixture corpus, the golden-master
 * snapshot), so it must stay a deliberate, reviewed action — never automatic.
 * This hook only points to the procedure in
 * .claude/rules/schema-drift-verification.md.
 *
 * Mirrors graphify-orient.mjs's mechanics: same hook type (PreToolUse), same
 * stdout/exit-code contract, same fail-open behavior.
 *
 * Wire in .claude/settings.json under PreToolUse with matcher "Edit|Write|MultiEdit".
 * Non-invasive: fails open on any I/O or parse error (exit 0, no output).
 */
import fs from 'node:fs';
import path from 'node:path';

/** @returns {string} */
function readStdin() {
  try {
    return fs.readFileSync(0, 'utf8');
  } catch {
    return '';
  }
}

/** @type {any} */
let event = {};
try {
  event = JSON.parse(readStdin() || '{}');
} catch {
  process.exit(0);
}

// The 8 vscode-free transcript-parsing modules (see CLAUDE.md's Architecture map).
// All live directly under src/, so a basename check is sufficient and avoids any
// path-separator/OS ambiguity in tool_input.file_path.
const PARSING_FILES = new Set([
  'logParser.ts',
  'subagentDetector.ts',
  'transcriptEntry.ts',
  'nameExtractor.ts',
  'sessionActivity.ts',
  'projectPathResolver.ts',
  'nestedSubagents.ts',
  'subagentMetadata.ts',
]);

const filePath = String(event?.tool_input?.file_path ?? '');
if (!filePath || !PARSING_FILES.has(path.basename(filePath))) {
  process.exit(0);
}

const CONTEXT =
  'MANDATORY: this file parses the transcript log format. Before calling this edit ' +
  'done, follow the verification procedure in ' +
  '`.claude/rules/schema-drift-verification.md` — run `npm run schema:generate`, ' +
  'review the LogEntry doc-gap report, and update the golden-master snapshot if the ' +
  'parsed shape changed.';

process.stdout.write(
  JSON.stringify({
    hookSpecificOutput: { hookEventName: 'PreToolUse', additionalContext: CONTEXT },
  }),
);

process.exit(0);
