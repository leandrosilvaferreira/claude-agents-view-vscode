import { describe, it, expect } from 'vitest';
import {
  normalizeForKey,
  getDedupeKey,
  isMoreRelevant,
  isAgentSession,
  findParentSession,
  sessionAsSubagent,
  applyNestedAgentLiveness,
} from '../sessionDedupe';
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

describe('normalizeForKey', () => {
  it('strips accents', () => {
    expect(normalizeForKey('entra na sessão não')).toBe('entra-na-sessao-nao');
  });

  it('strips emojis and symbols', () => {
    expect(normalizeForKey('🚀 deploy! (prod) #1')).toBe('deploy-prod-1');
  });

  it('collapses whitespace and casing so near-identical text still merges', () => {
    expect(normalizeForKey('  Fix   Bug  ')).toBe(normalizeForKey('fix bug'));
  });

  it('produces different keys for genuinely different text', () => {
    expect(normalizeForKey('enter the obsidian-mcp worktree')).not.toBe(normalizeForKey('review the dashboard PR'));
  });
});

describe('getDedupeKey', () => {
  it('separates two concurrent sessions on the same project+branch by title', () => {
    const a = makeSession({ id: 'a', sessionTitle: 'enter the obsidian-mcp worktree' });
    const b = makeSession({ id: 'b', sessionTitle: 'review the dashboard PR' });
    expect(getDedupeKey(a)).not.toBe(getDedupeKey(b));
  });

  it('falls back to session id when no title captured yet, so fresh sessions never collide', () => {
    const a = makeSession({ id: 'a', sessionTitle: undefined });
    const b = makeSession({ id: 'b', sessionTitle: undefined });
    expect(getDedupeKey(a)).not.toBe(getDedupeKey(b));
  });

  it('merges the same logical session (same project, branch, title) into one key', () => {
    const a = makeSession({ id: 'a', sessionTitle: 'implement OAuth' });
    const b = makeSession({ id: 'b', sessionTitle: 'implement OAuth' });
    expect(getDedupeKey(a)).toBe(getDedupeKey(b));
  });

  it('is unaffected by project path casing/trailing separators', () => {
    const a = makeSession({ projectPath: '/Users/dev/repo', sessionTitle: 'x' });
    const b = makeSession({ projectPath: '/USERS/DEV/repo', sessionTitle: 'x' });
    expect(getDedupeKey(a)).toBe(getDedupeKey(b));
  });
});

describe('isMoreRelevant', () => {
  it('prefers a working session over a stopped one', () => {
    const working = makeSession({ status: 'working' });
    const stopped = makeSession({ status: 'stopped' });
    expect(isMoreRelevant(working, stopped)).toBe(true);
    expect(isMoreRelevant(stopped, working)).toBe(false);
  });

  it('prefers the session with more active subagents', () => {
    const busy = makeSession({ subagents: [{ id: '1', name: 'x', task: 't', status: 'working' }] });
    const idle = makeSession({ subagents: [] });
    expect(isMoreRelevant(busy, idle)).toBe(true);
  });

  it('does not let a stale sibling with many FINISHED subagents mask the recent live continuation', () => {
    // Regression: two stopped same-branch sessions (a compacted predecessor + its continuation).
    // Counting total subagents let the predecessor's dozens of finished agents win the slot,
    // hiding the session the user is actually on. Only working subagents should break the tie;
    // with none, the most recent wins.
    const stalePredecessor = makeSession({
      id: 'old',
      status: 'stopped',
      lastInteractionTime: 1000,
      subagents: Array.from({ length: 20 }, (_, i) => ({
        id: `${i}`,
        name: 'x',
        task: 't',
        status: 'stopped' as const,
      })),
    });
    const liveContinuation = makeSession({
      id: 'new',
      status: 'stopped',
      lastInteractionTime: 5000,
      subagents: [{ id: 'a', name: 'x', task: 't', status: 'stopped' }],
    });
    expect(isMoreRelevant(liveContinuation, stalePredecessor)).toBe(true);
    expect(isMoreRelevant(stalePredecessor, liveContinuation)).toBe(false);
  });

  it('prefers the most recently active session as a tiebreak', () => {
    const recent = makeSession({ id: 'a', lastInteractionTime: 2000 });
    const older = makeSession({ id: 'b', lastInteractionTime: 1000 });
    expect(isMoreRelevant(recent, older)).toBe(true);
  });

  it('falls back to a stable id comparison so the winner never oscillates', () => {
    const a = makeSession({ id: 'a' });
    const b = makeSession({ id: 'b' });
    expect(isMoreRelevant(b, a)).toBe(true);
    expect(isMoreRelevant(a, b)).toBe(false);
  });
});

describe('isAgentSession', () => {
  it('flags sdk-launched sessions and spares human ones', () => {
    expect(isAgentSession(makeSession({ entrypoint: 'sdk-py' }))).toBe(true);
    expect(isAgentSession(makeSession({ entrypoint: 'sdk' }))).toBe(true);
    expect(isAgentSession(makeSession({ entrypoint: 'claude-vscode' }))).toBe(false);
    expect(isAgentSession(makeSession({ entrypoint: undefined }))).toBe(false);
  });
});

describe('findParentSession', () => {
  const agent = makeSession({
    id: 'agent',
    entrypoint: 'sdk-py',
    gitBranch: 'vault-pipeline-v2',
    projectPath: '/Users/dev/repo',
    lastInteractionTime: 10_000,
    model: 'claude-opus-4-7',
    sessionTitle: 'Review for security',
  });

  it('nests under the human session on the same project + branch within the time window', () => {
    const parent = makeSession({
      id: 'human',
      entrypoint: 'claude-vscode',
      gitBranch: 'vault-pipeline-v2',
      lastInteractionTime: 10_000 + 60_000, // 1 min apart
      status: 'stopped',
    });
    expect(findParentSession(agent, [parent])?.id).toBe('human');
  });

  it('does not match a different branch', () => {
    const other = makeSession({ id: 'human', entrypoint: 'claude-vscode', gitBranch: 'main' });
    expect(findParentSession(agent, [other])).toBeNull();
  });

  it('does not match a stopped human outside the window', () => {
    const stale = makeSession({
      id: 'human',
      entrypoint: 'claude-vscode',
      gitBranch: 'vault-pipeline-v2',
      status: 'stopped',
      lastInteractionTime: 10_000 + 60 * 60 * 1000, // 1h apart
    });
    expect(findParentSession(agent, [stale])).toBeNull();
  });

  it('still matches a working human even when far outside the window', () => {
    const working = makeSession({
      id: 'human',
      entrypoint: 'claude-vscode',
      gitBranch: 'vault-pipeline-v2',
      status: 'working',
      lastInteractionTime: 10_000 + 60 * 60 * 1000,
    });
    expect(findParentSession(agent, [working])?.id).toBe('human');
  });

  it('picks the most relevant human when several match', () => {
    const idle = makeSession({
      id: 'idle',
      entrypoint: 'claude-vscode',
      gitBranch: 'vault-pipeline-v2',
      status: 'stopped',
      lastInteractionTime: 10_000,
    });
    const active = makeSession({
      id: 'active',
      entrypoint: 'claude-vscode',
      gitBranch: 'vault-pipeline-v2',
      status: 'working',
      lastInteractionTime: 10_000,
    });
    expect(findParentSession(agent, [idle, active])?.id).toBe('active');
  });
});

describe('sessionAsSubagent', () => {
  it('carries the agent session status and its own model', () => {
    const agent = makeSession({
      id: 'agent',
      status: 'working',
      model: 'claude-opus-4-7',
      sessionTitle: 'Review for security',
    });
    const sub = sessionAsSubagent(agent);
    expect(sub).toMatchObject({
      id: 'agent',
      status: 'working',
      model: 'claude-opus-4-7',
      name: 'Review for security',
    });
  });
});

describe('applyNestedAgentLiveness', () => {
  // computeSessionStatus only sees same-file subagents (session.subagents); a background agent
  // in its own transcript is invisible to it. Without this, a launcher session can render
  // 'stopped' while its own "Working Agents" group (fed from the separate nestedAgents match)
  // shows that same agent still working — a visibly contradictory tree row.
  it('promotes a stopped parent to working when its matched background agent is still working', () => {
    const parent = makeSession({ id: 'parent', status: 'stopped', entrypoint: 'claude-vscode' });
    const agent = makeSession({
      id: 'agent',
      status: 'working',
      entrypoint: 'sdk-py',
      projectPath: parent.projectPath,
      gitBranch: parent.gitBranch,
      lastInteractionTime: parent.lastInteractionTime,
    });

    applyNestedAgentLiveness([parent, agent]);

    expect(parent.status).toBe('working');
  });

  it('leaves the parent stopped when its matched agent already finished', () => {
    const parent = makeSession({ id: 'parent', status: 'stopped', entrypoint: 'claude-vscode' });
    const agent = makeSession({
      id: 'agent',
      status: 'stopped',
      entrypoint: 'sdk-py',
      projectPath: parent.projectPath,
      gitBranch: parent.gitBranch,
      lastInteractionTime: parent.lastInteractionTime,
    });

    applyNestedAgentLiveness([parent, agent]);

    expect(parent.status).toBe('stopped');
  });

  it('does not let a sidechain pseudo-session steal the parent promotion from the real human session', () => {
    // Regression: subagent transcripts share the parent's entrypoint ('claude-vscode'), so
    // isAgentSession alone doesn't filter them out of the candidate-parent list. A sidechain
    // pseudo-session that out-ranks the real human via isMoreRelevant (e.g. more recent
    // lastInteractionTime) could get chosen as the working agent's "parent" instead.
    const human = makeSession({
      id: 'human',
      status: 'stopped',
      entrypoint: 'claude-vscode',
      lastInteractionTime: 10_000,
    });
    const sidechain = makeSession({
      id: 'sidechain',
      status: 'stopped',
      entrypoint: 'claude-vscode',
      isSidechain: true,
      lastInteractionTime: 20_000, // more recent than human -> would out-rank it via isMoreRelevant
    });
    const agent = makeSession({
      id: 'agent',
      status: 'working',
      entrypoint: 'sdk-py',
      projectPath: human.projectPath,
      gitBranch: human.gitBranch,
      lastInteractionTime: 10_000,
    });

    applyNestedAgentLiveness([human, sidechain, agent]);

    expect(human.status).toBe('working');
    expect(sidechain.status).toBe('stopped');
  });
});
