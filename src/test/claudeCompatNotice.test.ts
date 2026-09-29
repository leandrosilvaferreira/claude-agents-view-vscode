import { describe, it, expect, vi } from 'vitest';
import { createClaudeCompatNotifier } from '../claudeCompatNotice';
import { KNOWN_COMPATIBLE_CLAUDE_VERSION } from '../claudeCompat';
import { Session } from '../types';

function makeSession(overrides: Partial<Session> = {}): Session {
  return {
    id: 'session-a',
    projectHash: 'hash',
    projectPath: '/Users/dev/repo',
    projectName: 'repo',
    gitBranch: 'main',
    status: 'working',
    lastInteractionTime: 1000,
    subagents: [],
    logFilePath: '/tmp/session-a.jsonl',
    type: 'claude-code',
    ...overrides,
  };
}

describe('createClaudeCompatNotifier', () => {
  it('stays silent when no session is newer than the validated version', () => {
    const notify = vi.fn();
    createClaudeCompatNotifier(notify)([
      makeSession({ claudeVersion: KNOWN_COMPATIBLE_CLAUDE_VERSION }),
      makeSession({ claudeVersion: '2.0.1' }),
      makeSession(), // no version stamped (e.g. Antigravity) — ignored
    ]);
    expect(notify).not.toHaveBeenCalled();
  });

  it('warns with the newest version seen, compared numerically', () => {
    const notify = vi.fn();
    createClaudeCompatNotifier(notify)([
      makeSession({ claudeVersion: '2.1.999' }),
      makeSession({ claudeVersion: '3.0.0' }),
      makeSession({ claudeVersion: '2.10.0' }),
    ]);
    expect(notify).toHaveBeenCalledTimes(1);
    expect(notify).toHaveBeenCalledWith(expect.stringContaining('Claude Code 3.0.0 detected'));
    expect(notify).toHaveBeenCalledWith(expect.stringContaining(KNOWN_COMPATIBLE_CLAUDE_VERSION));
  });

  it('warns at most once, even when a still-newer version shows up later', () => {
    const notify = vi.fn();
    const check = createClaudeCompatNotifier(notify);
    check([makeSession({ claudeVersion: '2.1.999' })]);
    check([makeSession({ claudeVersion: '9.9.9' })]);
    expect(notify).toHaveBeenCalledTimes(1);
  });

  it('is not spent by a silent pass — a newer version appearing later still warns', () => {
    const notify = vi.fn();
    const check = createClaudeCompatNotifier(notify);
    check([makeSession({ claudeVersion: '2.0.1' })]);
    expect(notify).not.toHaveBeenCalled();
    check([makeSession({ claudeVersion: '2.1.999' })]);
    expect(notify).toHaveBeenCalledTimes(1);
  });
});
