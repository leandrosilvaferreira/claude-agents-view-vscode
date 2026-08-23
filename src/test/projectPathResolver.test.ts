import { describe, it, expect, vi } from 'vitest';
import * as path from 'path';
import { ProjectPathResolver } from '../projectPathResolver';
import { extractRenamedTitle } from '../nameExtractor';
import { Session } from '../types';

// Full-module mock (not vi.spyOn): Node's fs ESM namespace exports aren't configurable here, so
// spyOn can't redefine existsSync. Mocking the whole module is what actually works, and it's safe
// — detectProjectPath's Antigravity branches touch only fs.existsSync.
vi.mock('fs', () => ({
  existsSync: vi.fn(() => false),
}));

function makeSession(overrides: Partial<Session> = {}): Session {
  return {
    id: 'id',
    projectHash: 'hash',
    projectPath: '',
    projectName: '',
    gitBranch: 'main',
    status: 'working',
    lastInteractionTime: Date.now(),
    subagents: [],
    logFilePath: '/tmp/id.jsonl',
    type: 'antigravity',
    ...overrides,
  };
}

describe('ProjectPathResolver.detectProjectPath', () => {
  // Regression test for a real hang: on Windows, path.dirname('C:\\') === 'C:\\' (dirname of the
  // drive root returns itself), so the old findProjectRoot loop compared against a hardcoded '/'
  // and never reached its exit condition there — it spun forever on the synchronous extension-host
  // thread. The fix compares against path.parse(current).root instead. This suite runs on POSIX,
  // where `path` resolves to path.posix, so the literal Windows 'C:\\' case can't be reproduced
  // without mocking node's `path` module — deliberately avoided as a brittle implementation-detail
  // test. Instead, fs.existsSync is stubbed to report no marker anywhere, forcing the real walk
  // (real, untouched path.dirname/path.parse arithmetic) all the way up to the filesystem root —
  // proving the general contract the fix guarantees on any platform: the walk terminates and falls
  // back rather than hanging when it finds nothing.
  it('findProjectRoot terminates and falls back to the containing directory when no ancestor has a project marker', () => {
    const filePath = '/a/b/c/d/e/file.txt';
    const resolver = new ProjectPathResolver();
    // Only the Antigravity TargetFile branch reaches the private findProjectRoot here; Claude
    // Code sessions early-return before it, and the prose-metadata branch (Active Document /
    // Other open documents) reaches the same helper for the same reason, so this one path is
    // representative of both.
    const session = makeSession();

    resolver.detectProjectPath({ TargetFile: filePath }, session);

    expect(session.projectPath).toBe(path.dirname(filePath));
  }, 2000); // explicit timeout: a reintroduced infinite loop must fail fast, not hang CI
});

describe('ProjectPathResolver.knownProjectDirs (worktree history)', () => {
  // Regression coverage for the bug this field exists to fix: a session that enters a git
  // worktree, dispatches subagents there, then leaves it again has `projectPath` revert to the
  // base cwd — sidecarReader.ts's candidateMetadataDirs needs every historical encoded dir, not
  // just the latest, to still find those subagents' sidecars (see that field's doc comment in
  // types.ts).
  it('accumulates a distinct encoded dir for each distinct cwd seen, deduping repeats and re-visits', () => {
    const resolver = new ProjectPathResolver();
    const session = makeSession({ type: 'claude-code' });

    resolver.detectProjectPath({ cwd: '/Users/dev/demo' }, session);
    resolver.detectProjectPath({ cwd: '/Users/dev/demo/.claude/worktrees/fix-thing' }, session);
    resolver.detectProjectPath({ cwd: '/Users/dev/demo' }, session); // left the worktree, back to base
    resolver.detectProjectPath({ cwd: '/Users/dev/demo/.claude/worktrees/fix-thing' }, session); // re-entered it

    expect(session.knownProjectDirs).toEqual(['-Users-dev-demo', '-Users-dev-demo--claude-worktrees-fix-thing']);
  });

  it('never touches knownProjectDirs when the entry reveals no cwd', () => {
    const resolver = new ProjectPathResolver();
    const session = makeSession({ type: 'claude-code' });

    resolver.detectProjectPath({}, session);

    expect(session.knownProjectDirs).toBeUndefined();
  });
});

describe('ProjectPathResolver.detectWorktreeName — cwd fallback', () => {
  // Regression for a real bug: a session whose `cwd` starts already inside a worktree (no
  // in-session relocate) never gets a `worktree-state` entry at all, so worktreeName stayed
  // permanently undefined and extractRenamedTitle's carve-out could never reject Claude Code's
  // own auto-stamped custom-title — it latched as a real rename and collapsed sessionDedupe's key
  // across unrelated sibling sessions in the same worktree (see this method's own doc comment for
  // the real capture that surfaced it: branch `feat/787-saque-de-brl-via-pix-mvp-fluxo-3-fases-t`,
  // auto-stamp `"feat"`).
  it('derives worktreeName from the full path remaining after "worktrees" in cwd', () => {
    const resolver = new ProjectPathResolver();
    const session = makeSession({ type: 'claude-code' });

    resolver.detectWorktreeName(
      { cwd: '/Users/dev/swapo-app/.claude/worktrees/feat/787-saque-de-brl-via-pix-mvp-fluxo-3-fases-t' },
      session,
    );

    expect(session.worktreeName).toBe('feat/787-saque-de-brl-via-pix-mvp-fluxo-3-fases-t');
  });

  it('closes the original bug end-to-end: the derived name makes extractRenamedTitle reject the matching auto-stamp', () => {
    const resolver = new ProjectPathResolver();
    const session = makeSession({ type: 'claude-code' });

    resolver.detectWorktreeName({ cwd: '/Users/dev/swapo-app/.claude/worktrees/feat/787-saque' }, session);

    expect(extractRenamedTitle({ type: 'custom-title', customTitle: 'feat' }, session.worktreeName)).toBeNull();
  });

  it('leaves worktreeName undefined when cwd has no "worktrees" path segment', () => {
    const resolver = new ProjectPathResolver();
    const session = makeSession({ type: 'claude-code' });

    resolver.detectWorktreeName({ cwd: '/Users/dev/swapo-app' }, session);

    expect(session.worktreeName).toBeUndefined();
  });

  it('leaves worktreeName undefined when "worktrees" is the last cwd segment (nothing names the worktree)', () => {
    const resolver = new ProjectPathResolver();
    const session = makeSession({ type: 'claude-code' });

    resolver.detectWorktreeName({ cwd: '/Users/dev/swapo-app/.claude/worktrees' }, session);

    expect(session.worktreeName).toBeUndefined();
  });

  it('never overrides an explicit worktree-state entry with the cwd-derived guess', () => {
    const resolver = new ProjectPathResolver();
    const session = makeSession({ type: 'claude-code' });

    resolver.detectWorktreeName(
      { worktreeSession: { worktreeName: 'feat/787-saque-de-brl-via-pix-mvp-fluxo-3-fases-t' } },
      session,
    );
    resolver.detectWorktreeName({ cwd: '/Users/dev/swapo-app/.claude/worktrees/feat/787-saque' }, session);

    expect(session.worktreeName).toBe('feat/787-saque-de-brl-via-pix-mvp-fluxo-3-fases-t');
  });

  it('lets a later explicit worktree-state entry override an earlier cwd-derived guess', () => {
    const resolver = new ProjectPathResolver();
    const session = makeSession({ type: 'claude-code' });

    resolver.detectWorktreeName({ cwd: '/Users/dev/swapo-app/.claude/worktrees/feat/787-saque' }, session);
    resolver.detectWorktreeName(
      { worktreeSession: { worktreeName: 'feat/787-saque-de-brl-via-pix-mvp-fluxo-3-fases-t' } },
      session,
    );

    expect(session.worktreeName).toBe('feat/787-saque-de-brl-via-pix-mvp-fluxo-3-fases-t');
  });

  // Regression for a real bug: a `worktree-state` entry's bare `worktreeSession.worktreeName`
  // field can hold only the leaf slug ("787-saque-de-brl-via-pix-mvp-fluxo-3-fases-t"), not the
  // full "<type>/<slug>" name — real capture, session `9a282de8-...`, worktreePath
  // `.../worktrees/feat/787-saque-de-brl-via-pix-mvp-fluxo-3-fases-t`. Claude Code's own
  // custom-title auto-stamp on that same transcript was `"feat"`, which the bare worktreeName
  // field alone (no "feat/" prefix at all) could never recognize — so it slipped through as a
  // "real rename" even though a worktree-state entry WAS present. worktreePath must win.
  it('prefers the path-derived name over a bare worktreeSession.worktreeName leaf slug that omits the type prefix', () => {
    const resolver = new ProjectPathResolver();
    const session = makeSession({ type: 'claude-code' });

    resolver.detectWorktreeName(
      {
        worktreeSession: {
          worktreeName: '787-saque-de-brl-via-pix-mvp-fluxo-3-fases-t',
          worktreePath: '/Users/dev/swapo-app/.claude/worktrees/feat/787-saque-de-brl-via-pix-mvp-fluxo-3-fases-t',
        },
      },
      session,
    );

    expect(session.worktreeName).toBe('feat/787-saque-de-brl-via-pix-mvp-fluxo-3-fases-t');
    expect(extractRenamedTitle({ type: 'custom-title', customTitle: 'feat' }, session.worktreeName)).toBeNull();
  });

  it('falls back to the bare worktreeSession.worktreeName field when the entry carries no worktreePath', () => {
    const resolver = new ProjectPathResolver();
    const session = makeSession({ type: 'claude-code' });

    resolver.detectWorktreeName({ worktreeSession: { worktreeName: 'structured-logging' } }, session);

    expect(session.worktreeName).toBe('structured-logging');
  });

  it('leaves worktreeName untouched on a worktree-state entry with worktreeSession: null (exit signal)', () => {
    const resolver = new ProjectPathResolver();
    const session = makeSession({ type: 'claude-code' });

    resolver.detectWorktreeName(
      {
        worktreeSession: {
          worktreeName: '787-saque-de-brl-via-pix-mvp-fluxo-3-fases-t',
          worktreePath: '/Users/dev/swapo-app/.claude/worktrees/feat/787-saque-de-brl-via-pix-mvp-fluxo-3-fases-t',
        },
      },
      session,
    );
    resolver.detectWorktreeName({ worktreeSession: null }, session);

    expect(session.worktreeName).toBe('feat/787-saque-de-brl-via-pix-mvp-fluxo-3-fases-t');
  });
});
