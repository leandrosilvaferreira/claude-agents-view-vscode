import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { LogParser } from '../logParser';

// Regression for a real bug: a session whose transcript opens with Claude Code's own
// auto-stamped `custom-title` entry as literally its FIRST line — before any `cwd` (and so
// before projectPathResolver.ts's detectWorktreeName, fallback included, has anything to derive
// a worktree name from) — used to latch that auto-stamp as a permanent "user rename"
// (nameExtractor's titleIsCustom), because extractRenamedTitle had no known worktree name yet to
// reject it with. The real prompt that follows a few lines later was then silently discarded:
// the tree showed the generic auto-stamp ("feat") forever instead of the actual task, and — since
// every session that ever entered that same worktree got the identical stamped title —
// sessionDedupe.getDedupeKey() collided this session with unrelated siblings sharing the same
// worktree, letting a stale sibling win the tree's dedupe slot over a live session.
//
// Real capture: session `9b771635-75d5-4d77-b7b2-afc77c38f25a`, branch
// `feat/787-saque-de-brl-via-pix-mvp-fluxo-3-fases-t`, cwd `.../swapo-app/.claude/worktrees/
// feat/787-saque-de-brl-via-pix-mvp-fluxo-3-fases-t`. Transcript order: `custom-title:"feat"` +
// `agent-name:"feat"` (lines 0-1, no cwd anywhere yet) -> bookkeeping -> the first `cwd`-bearing
// line (line 4) -> the real user prompt.
describe('LogParser — worktree auto-stamp title arriving before any cwd is known', () => {
  let claudeProjectsDir: string;

  beforeEach(() => {
    claudeProjectsDir = fs.mkdtempSync(path.join(os.tmpdir(), 'claude-projects-title-test-'));
  });

  afterEach(() => {
    fs.rmSync(claudeProjectsDir, { recursive: true, force: true });
  });

  function writeSessionFile(lines: unknown[]): string {
    const projectDir = path.join(claudeProjectsDir, '-some-encoded-worktree-dir');
    fs.mkdirSync(projectDir, { recursive: true });
    const filePath = path.join(projectDir, 'session.jsonl');
    fs.writeFileSync(filePath, lines.map((l) => JSON.stringify(l)).join('\n') + '\n');
    return filePath;
  }

  const cwd = '/Users/dev/swapo-app/.claude/worktrees/feat/787-saque-de-brl-via-pix-mvp-fluxo-3-fases-t';
  const branch = 'feat/787-saque-de-brl-via-pix-mvp-fluxo-3-fases-t';

  it('recovers the real prompt as the title instead of latching the auto-stamp seen before any cwd', () => {
    const filePath = writeSessionFile([
      { type: 'custom-title', customTitle: 'feat', sessionId: 'x' },
      { type: 'agent-name', agentName: 'feat', sessionId: 'x' },
      { type: 'queue-operation' },
      // First cwd-bearing line — this is where the worktree name becomes derivable.
      { type: 'attachment', cwd, gitBranch: branch, attachment: { type: 'hook_success' } },
      // The real first user prompt.
      {
        type: 'user',
        cwd,
        gitBranch: branch,
        message: { role: 'user', content: 'saque de brl via pix trava em processing' },
      },
    ]);
    const parser = new LogParser(claudeProjectsDir);

    const session = parser.parse(filePath, 'claude-code');

    expect(session.sessionTitle).toBe('saque de brl via pix trava em processing');
    expect(session.titleIsCustom).toBeFalsy();
  });

  it('still accepts a genuine early user rename that arrives before any cwd is known', () => {
    const filePath = writeSessionFile([
      { type: 'user', cwd, gitBranch: branch, message: { role: 'user', content: 'first prompt' } },
      { type: 'custom-title', customTitle: 'My real rename', sessionId: 'x' },
    ]);
    const parser = new LogParser(claudeProjectsDir);

    const session = parser.parse(filePath, 'claude-code');

    expect(session.sessionTitle).toBe('My real rename');
    expect(session.titleIsCustom).toBe(true);
  });

  it('repeated identical auto-stamp echoes later in the same transcript never re-latch once the worktree name is known', () => {
    const filePath = writeSessionFile([
      { type: 'custom-title', customTitle: 'feat', sessionId: 'x' },
      { type: 'attachment', cwd, gitBranch: branch, attachment: { type: 'hook_success' } },
      {
        type: 'user',
        cwd,
        gitBranch: branch,
        message: { role: 'user', content: 'saque de brl via pix trava em processing' },
      },
      // Claude Code re-stamps the identical auto-echo again later — observed in the real corpus.
      { type: 'custom-title', customTitle: 'feat', sessionId: 'x' },
    ]);
    const parser = new LogParser(claudeProjectsDir);

    const session = parser.parse(filePath, 'claude-code');

    expect(session.sessionTitle).toBe('saque de brl via pix trava em processing');
    expect(session.titleIsCustom).toBeFalsy();
  });
});
