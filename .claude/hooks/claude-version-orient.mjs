#!/usr/bin/env node
/**
 * SessionStart hook: warn when the installed Claude Code CLI is newer than the
 * transcript parser's pinned KNOWN_COMPATIBLE_CLAUDE_VERSION (src/claudeCompat.ts).
 * A newer CLI can change the transcript JSONL shape the parser depends on (see
 * claudeCompat.ts's own header comment) — this only reminds a developer to
 * re-check, it never checks anything itself.
 *
 * Deliberately does NOT run `npm run schema:generate` itself: per
 * transcript-schema-gen.md's Non-Goals section ("No CI wiring, no scheduled/
 * automated runs — manual, on-demand, dev-time-only, per explicit request"),
 * that stays a deliberate, reviewed action. This hook only points at the
 * procedure in .claude/rules/schema-drift-verification.md — same philosophy as
 * schema-drift-orient.mjs, just triggered by CLI version drift instead of an
 * edit to a parsing file.
 *
 * Pure context injection — emits `additionalContext` only, never a permission
 * decision. Fails open on every error (missing `claude` binary, timeout,
 * unparsable version, missing/unreadable src/claudeCompat.ts): exit 0, no
 * output, never blocks a session.
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

/**
 * Silent success — never blocks the session.
 * @returns {never}
 */
function passThrough() {
  process.exit(0);
}

/** Compare two dotted numeric versions. Returns -1 if a < b, 1 if a > b, 0 if equal.
 * Non-numeric or missing segments compare as 0. Never throws. Intentionally duplicated
 * from src/claudeCompat.ts's compareVersions rather than imported — hook scripts here are
 * plain standalone .mjs with zero project imports (see check-deps-on-start.mjs,
 * schema-drift-orient.mjs). Keep in sync by eye if claudeCompat.ts's semantics change.
 * @param {string} a
 * @param {string} b
 * @returns {number}
 */
function compareVersions(a, b) {
  const pa = a.split('.');
  const pb = b.split('.');
  const len = Math.max(pa.length, pb.length);
  for (let i = 0; i < len; i++) {
    const na = parseInt(pa[i] ?? '0', 10) || 0;
    const nb = parseInt(pb[i] ?? '0', 10) || 0;
    if (na !== nb) return na < nb ? -1 : 1;
  }
  return 0;
}

/** @type {{ cwd?: string }} */
let event = {};
try {
  event = JSON.parse(
    await new Promise((res) => {
      let buf = '';
      process.stdin.setEncoding('utf8');
      process.stdin.on('data', (c) => {
        buf += c;
      });
      process.stdin.on('end', () => res(buf || '{}'));
    }),
  );
} catch {
  passThrough();
}

const cwd = event.cwd ?? process.cwd();

const versionResult = spawnSync('claude', ['--version'], {
  encoding: 'utf8',
  timeout: 15_000,
  windowsHide: true,
});

if (versionResult.error || versionResult.status !== 0 || !versionResult.stdout) {
  passThrough();
}

// Observed real shape: "2.1.241 (Claude Code)" — extract the leading dotted version.
const installedMatch = versionResult.stdout.trim().match(/^(\d+\.\d+\.\d+)/);
if (!installedMatch) {
  passThrough();
}
const installedVersion = installedMatch[1];

let compatSource = '';
try {
  compatSource = fs.readFileSync(path.join(cwd, 'src', 'claudeCompat.ts'), 'utf8');
} catch {
  passThrough();
}

const pinnedMatch = compatSource.match(/KNOWN_COMPATIBLE_CLAUDE_VERSION\s*=\s*['"](\d+\.\d+\.\d+)['"]/);
if (!pinnedMatch) {
  passThrough();
}
const pinnedVersion = pinnedMatch[1];

if (compareVersions(installedVersion, pinnedVersion) <= 0) {
  passThrough();
}

const CONTEXT =
  `Installed Claude Code CLI (${installedVersion}) is newer than the transcript parser's ` +
  `pinned KNOWN_COMPATIBLE_CLAUDE_VERSION ('${pinnedVersion}') in src/claudeCompat.ts. ` +
  `Run \`npm run schema:generate\`, then follow .claude/rules/schema-drift-verification.md; ` +
  `if it confirms no structural drift, bump KNOWN_COMPATIBLE_CLAUDE_VERSION in ` +
  `src/claudeCompat.ts to ${installedVersion}.`;

process.stdout.write(
  JSON.stringify({
    hookSpecificOutput: { hookEventName: 'SessionStart', additionalContext: CONTEXT },
  }),
);
process.exit(0);
