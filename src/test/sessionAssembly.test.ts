import { describe, it, expect } from 'vitest';
import { assembleVisibleSessions } from '../sessionAssembly';
import { Session } from '../types';

const NOW = 1_000_000_000_000;

function makeSession(overrides: Partial<Session> = {}): Session {
  return {
    id: 'id',
    projectHash: 'hash',
    projectPath: '/Users/dev/repo',
    projectName: 'repo',
    gitBranch: 'main',
    status: 'working',
    lastInteractionTime: NOW,
    subagents: [],
    logFilePath: '/tmp/id.jsonl',
    type: 'claude-code',
    ...overrides,
  };
}

describe('assembleVisibleSessions', () => {
  it('keeps two concurrent same-branch sessions with distinct titles (the "only one shows" fix)', () => {
    const a = makeSession({ id: 'a', gitBranch: 'feat/x', projectPath: '/repo/wt/x', sessionTitle: 'first task' });
    const b = makeSession({ id: 'b', gitBranch: 'feat/x', projectPath: '/repo/wt/x', sessionTitle: 'second task' });
    const { topLevel } = assembleVisibleSessions([a, b], [], NOW);
    expect(topLevel).toHaveLength(2);
  });

  it('collapses two same-branch sessions that share a title into one slot', () => {
    const a = makeSession({
      id: 'a',
      gitBranch: 'feat/x',
      projectPath: '/repo/wt/x',
      sessionTitle: 'same title',
      subagents: [],
    });
    const b = makeSession({
      id: 'b',
      gitBranch: 'feat/x',
      projectPath: '/repo/wt/x',
      sessionTitle: 'same title',
      status: 'stopped',
    });
    const { topLevel } = assembleVisibleSessions([a, b], [], NOW);
    expect(topLevel).toHaveLength(1);
    expect(topLevel[0].id).toBe('a'); // the working one wins
  });

  it('excludes subagent sidechains', () => {
    const s = makeSession({ isSidechain: true });
    expect(assembleVisibleSessions([s], [], NOW).topLevel).toHaveLength(0);
  });

  it('ages out a stopped session older than an hour but keeps a running one', () => {
    const oldStopped = makeSession({ id: 'old', status: 'stopped', lastInteractionTime: NOW - 61 * 60 * 1000 });
    const oldRunning = makeSession({
      id: 'run',
      gitBranch: 'other',
      status: 'working',
      lastInteractionTime: NOW - 61 * 60 * 1000,
    });
    const { topLevel } = assembleVisibleSessions([oldStopped, oldRunning], [], NOW);
    expect(topLevel.map((s) => s.id)).toEqual(['run']);
  });

  it('scopes Claude Code sessions to the active workspace folders', () => {
    const inside = makeSession({ id: 'in', projectPath: '/Users/dev/repo/wt/a', gitBranch: 'a' });
    const outside = makeSession({ id: 'out', projectPath: '/Users/dev/other', gitBranch: 'b' });
    const { topLevel } = assembleVisibleSessions([inside, outside], ['/users/dev/repo'], NOW);
    expect(topLevel.map((s) => s.id)).toEqual(['in']);
  });

  it('nests an SDK-spawned agent under its human launcher instead of showing it top-level', () => {
    const human = makeSession({
      id: 'human',
      gitBranch: 'feat/y',
      projectPath: '/repo/wt/y',
      entrypoint: 'claude-vscode',
    });
    const agent = makeSession({
      id: 'agent',
      gitBranch: 'feat/y',
      projectPath: '/repo/wt/y',
      entrypoint: 'sdk-py',
      sessionTitle: 'security review',
    });
    const { topLevel, nestedAgents } = assembleVisibleSessions([human, agent], [], NOW);
    expect(topLevel.map((s) => s.id)).toEqual(['human']);
    expect(nestedAgents.get('human')?.map((a) => a.id)).toEqual(['agent']);
  });
});
