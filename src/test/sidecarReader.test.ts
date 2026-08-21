import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { candidateMetadataDirs, readAllSidecars } from '../sidecarReader';
import { Session } from '../types';

// Mirrors the real on-disk layout: <claudeProjectsDir>/<encoded-project-dir>/<sessionId>/subagents/agent-<id>.meta.json.
// Encoding verified against real ~/.claude/projects directory names (see sidecarReader.ts's
// encodeProjectDir comment) — kept as literal strings here rather than calling the encoder, to
// keep these tests independent of that implementation detail.
describe('sidecarReader', () => {
  let claudeProjectsDir: string;
  const sessionId = 'test-session-id';
  const baseDirName = '-Users-dev-Projetos-demo';
  const worktreeDirName = '-Users-dev-Projetos-demo--claude-worktrees-fix-thing';

  beforeEach(() => {
    claudeProjectsDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sidecar-reader-test-'));
  });

  afterEach(() => {
    fs.rmSync(claudeProjectsDir, { recursive: true, force: true });
  });

  function writeSidecar(projectDirName: string, fileId: string, meta: Record<string, unknown>): void {
    const subagentsDir = path.join(claudeProjectsDir, projectDirName, sessionId, 'subagents');
    fs.mkdirSync(subagentsDir, { recursive: true });
    fs.writeFileSync(path.join(subagentsDir, `agent-${fileId}.meta.json`), JSON.stringify(meta));
  }

  function makeSession(overrides: Partial<Session> = {}): Session {
    return {
      id: sessionId,
      projectHash: 'hash',
      projectPath: '/Users/dev/Projetos/demo',
      projectName: 'demo',
      gitBranch: 'main',
      status: 'stopped',
      lastInteractionTime: Date.now(),
      subagents: [],
      logFilePath: path.join(claudeProjectsDir, baseDirName, `${sessionId}.jsonl`),
      type: 'claude-code',
      ...overrides,
    };
  }

  describe('candidateMetadataDirs', () => {
    it('returns just the base dir when the session has no projectPath', () => {
      const session = makeSession({ projectPath: '' });

      expect(candidateMetadataDirs(session)).toEqual([path.join(claudeProjectsDir, baseDirName)]);
    });

    it('returns just the base dir when projectPath encodes to the same directory the transcript already lives in', () => {
      const session = makeSession(); // projectPath === base cwd, no worktree ever entered

      expect(candidateMetadataDirs(session)).toEqual([path.join(claudeProjectsDir, baseDirName)]);
    });

    it('falls back to encoding the current projectPath when knownProjectDirs was never populated', () => {
      // A Session built directly (e.g. by a test, or by code that predates knownProjectDirs)
      // still gets the old single-dir behavior instead of losing the worktree dir outright.
      const session = makeSession({ projectPath: '/Users/dev/Projetos/demo/.claude/worktrees/fix-thing' });

      expect(candidateMetadataDirs(session)).toEqual([
        path.join(claudeProjectsDir, baseDirName),
        path.join(claudeProjectsDir, worktreeDirName),
      ]);
    });

    it('returns every historical dir in knownProjectDirs, not just the current projectPath (regression: worktree left)', () => {
      // The real bug: projectPath has already reverted to the base cwd, so encoding it alone
      // would silently lose the worktree directory forever. knownProjectDirs is what keeps a
      // session's full history of encoded dirs searchable after that reversion.
      const session = makeSession({
        projectPath: '/Users/dev/Projetos/demo', // reverted back to base
        knownProjectDirs: [worktreeDirName, baseDirName],
      });

      expect(candidateMetadataDirs(session)).toEqual([
        path.join(claudeProjectsDir, baseDirName),
        path.join(claudeProjectsDir, worktreeDirName),
      ]);
    });

    it('always puts the transcript-own base dir first, regardless of knownProjectDirs order', () => {
      // Preserves readAllSidecars' "later dir wins" contract: base dir must anchor position 0.
      const session = makeSession({
        projectPath: '/Users/dev/Projetos/demo/.claude/worktrees/fix-thing',
        knownProjectDirs: [baseDirName, worktreeDirName],
      });

      expect(candidateMetadataDirs(session)[0]).toBe(path.join(claudeProjectsDir, baseDirName));
    });
  });

  describe('readAllSidecars', () => {
    it('reads the name field from a sidecar', () => {
      writeSidecar(baseDirName, 'a1', { agentType: 'code-reviewer', name: 'F3-vitest', toolUseId: 'toolu_1' });

      const sidecars = readAllSidecars([path.join(claudeProjectsDir, baseDirName)], sessionId);

      expect(sidecars).toHaveLength(1);
      expect(sidecars[0].name).toBe('F3-vitest');
    });

    it('drops a non-string name instead of surfacing it as [object Object]', () => {
      // Same defensive policy as every other sidecar field: the format is undocumented and
      // unversioned, so a wrong-typed value must never reach a TreeItem label.
      writeSidecar(baseDirName, 'a1', { agentType: 'code-reviewer', name: { nested: 'oops' }, toolUseId: 'toolu_1' });

      const sidecars = readAllSidecars([path.join(claudeProjectsDir, baseDirName)], sessionId);

      expect(sidecars).toHaveLength(1);
      expect(sidecars[0].name).toBeUndefined();
    });

    it('leaves name undefined when the sidecar never set one', () => {
      writeSidecar(baseDirName, 'a1', { agentType: 'code-reviewer', toolUseId: 'toolu_1' });

      const sidecars = readAllSidecars([path.join(claudeProjectsDir, baseDirName)], sessionId);

      expect(sidecars[0].name).toBeUndefined();
    });

    it('dedupes the same toolUseId identity found in two candidate dirs, later dir winning', () => {
      writeSidecar(baseDirName, 'a1', { agentType: 'from-base', toolUseId: 'toolu_dup' });
      writeSidecar(worktreeDirName, 'a2', { agentType: 'from-worktree', toolUseId: 'toolu_dup' });
      const dirs = [path.join(claudeProjectsDir, baseDirName), path.join(claudeProjectsDir, worktreeDirName)];

      const sidecars = readAllSidecars(dirs, sessionId);

      expect(sidecars).toHaveLength(1);
      expect(sidecars[0].agentType).toBe('from-worktree');
    });

    it('dedupes by filename-derived agentId when neither sidecar carries a toolUseId (forked-skill teammate shape)', () => {
      writeSidecar(baseDirName, 'dup-child', { agentType: 'from-base' });
      writeSidecar(worktreeDirName, 'dup-child', { agentType: 'from-worktree' });
      const dirs = [path.join(claudeProjectsDir, baseDirName), path.join(claudeProjectsDir, worktreeDirName)];

      const sidecars = readAllSidecars(dirs, sessionId);

      expect(sidecars).toHaveLength(1);
      expect(sidecars[0].agentType).toBe('from-worktree');
    });

    it('keeps two sidecars with genuinely different identities separate', () => {
      writeSidecar(baseDirName, 'a1', { agentType: 'one', toolUseId: 'toolu_1' });
      writeSidecar(baseDirName, 'a2', { agentType: 'two', toolUseId: 'toolu_2' });

      const sidecars = readAllSidecars([path.join(claudeProjectsDir, baseDirName)], sessionId);

      expect(sidecars).toHaveLength(2);
    });

    it('returns an empty array when no candidate directory has a subagents folder', () => {
      const sidecars = readAllSidecars([path.join(claudeProjectsDir, baseDirName)], sessionId);

      expect(sidecars).toEqual([]);
    });
  });
});
