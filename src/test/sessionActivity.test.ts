import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { computeSessionStatus, IDLE_CEILING } from '../sessionActivity';
import { Session } from '../types';

const FIVE_MINUTES = 5 * 60 * 1000;
const THIRTY_ONE_MINUTES = 31 * 60 * 1000;

function session(overrides: Partial<Session> = {}): Session {
  return {
    id: 'session-1',
    projectHash: '-Users-dev-Projects-acme',
    projectPath: '/Users/dev/Projects/acme',
    projectName: 'acme',
    gitBranch: 'main',
    status: 'stopped',
    lastInteractionTime: Date.now() - FIVE_MINUTES,
    subagents: [],
    logFilePath: '/Users/dev/.claude/projects/acme/session-1.jsonl',
    type: 'claude-code',
    ...overrides,
  };
}

describe('computeSessionStatus', () => {
  it.each(['stopped', 'error'] as const)('honors explicit Codex %s despite recent writes', (codexTurnStatus) => {
    const codex = session({ type: 'codex', codexTurnStatus, lastInteractionTime: Date.now() });
    expect(computeSessionStatus(codex)).toBe(codexTurnStatus);
  });

  it('keeps Codex active during a quiet in-progress turn but expires abandoned turns', () => {
    expect(computeSessionStatus(session({ type: 'codex', codexTurnStatus: 'working' }))).toBe('working');
    expect(
      computeSessionStatus(
        session({ type: 'codex', codexTurnStatus: 'working', lastInteractionTime: Date.now() - THIRTY_ONE_MINUTES }),
      ),
    ).toBe('stopped');
  });

  it('keeps a session working while its last turn is a thinking block', () => {
    // Claude Code streams reasoning as its own thinking-only entry, so the transcript can sit
    // untouched for minutes mid-reply. Without this the sidebar showed the session as stopped
    // exactly while the user was watching it think.
    const status = computeSessionStatus(session({ lastEntryIsThinking: true }));

    expect(status).toBe('working');
  });

  it('stops a quiet session whose last turn already produced its answer', () => {
    const status = computeSessionStatus(session({ lastEntryIsThinking: false }));

    expect(status).toBe('stopped');
  });

  it('stops a session left thinking past the idle ceiling', () => {
    // A session abandoned mid-turn must not spin forever.
    const stale = session({
      lastEntryIsThinking: true,
      lastInteractionTime: Date.now() - THIRTY_ONE_MINUTES,
    });

    expect(computeSessionStatus(stale)).toBe('stopped');
  });

  it('reports working right after a write, before any heuristic is consulted', () => {
    const status = computeSessionStatus(session({ lastInteractionTime: Date.now() - 5_000 }));

    expect(status).toBe('working');
  });

  it('reports working while a subagent never reported completion', () => {
    const withAgent = session({
      subagents: [{ id: 'toolu_1', name: 'explorer', task: 'map the codebase', status: 'working' }],
    });

    expect(computeSessionStatus(withAgent)).toBe('working');
  });

  it('still reports working for a user turn awaiting a reply', () => {
    const status = computeSessionStatus(session({ lastEntryType: 'user' }));

    expect(status).toBe('working');
  });

  it('stops a session whose last turn was the user interrupting Claude', () => {
    // Claude Code writes an Esc-interruption as a `type: 'user'` turn, so lastEntryType alone
    // can't tell it apart from a real prompt still awaiting a reply — that's what
    // lastEntryIsInterruption is for. Without it, an interrupted session read as 'working' for
    // up to IDLE_CEILING (30 min) after the user killed it.
    const status = computeSessionStatus(session({ lastEntryType: 'user', lastEntryIsInterruption: true }));

    expect(status).toBe('stopped');
  });

  it('reports working for an interrupted session that still has a subagent running', () => {
    // hasRunningAgents sits in the same OR as awaitingReply, independent of it — a background
    // agent survives the Esc that killed the main turn and must keep the session visible.
    const status = computeSessionStatus(
      session({
        lastEntryType: 'user',
        lastEntryIsInterruption: true,
        subagents: [{ id: 'toolu_1', name: 'explorer', task: 'map the codebase', status: 'working' }],
      }),
    );

    expect(status).toBe('working');
  });

  it('stops a session left awaiting a reply past the idle ceiling', () => {
    // Mirrors 'stops a session left thinking past the idle ceiling' above: a genuine unanswered
    // user turn must not spin forever either.
    const stale = session({
      lastEntryType: 'user',
      lastInteractionTime: Date.now() - THIRTY_ONE_MINUTES,
    });

    expect(computeSessionStatus(stale)).toBe('stopped');
  });

  it('reports an error status for an idle-but-not-abandoned session whose last signal was an api error', () => {
    // The core new case: distinguishes "finished cleanly" from "broke" for a session that sits
    // in the ambiguous window between RECENT_WRITE and IDLE_CEILING.
    const status = computeSessionStatus(session({ lastEntryIsApiError: true }));

    expect(status).toBe('error');
  });

  it('stays working right after a write, even with the api-error flag set', () => {
    // The RECENT_WRITE short-circuit must win over the error reading: an error immediately
    // followed by an active retry should still read 'working', not 'error'.
    const status = computeSessionStatus(
      session({ lastEntryIsApiError: true, lastInteractionTime: Date.now() - 5_000 }),
    );

    expect(status).toBe('working');
  });

  it('falls back to stopped past the idle ceiling, even with the api-error flag set', () => {
    // 'error' must not bypass IDLE_CEILING — an old, long-abandoned errored session reads
    // 'stopped' like every other abandoned session, not a permanent alarm.
    const stale = session({
      lastEntryIsApiError: true,
      lastInteractionTime: Date.now() - THIRTY_ONE_MINUTES,
    });

    expect(computeSessionStatus(stale)).toBe('stopped');
  });

  it('lets a still-running subagent outrank a stale api-error reading on the parent', () => {
    // Precedence choice: hasRunningAgents is real, concurrent, currently-happening work, so it
    // outranks even a known error on the parent's own last turn — same precedent as the
    // interruption carve-out above (subagent liveness already outranks that).
    const status = computeSessionStatus(
      session({
        lastEntryIsApiError: true,
        subagents: [{ id: 'toolu_1', name: 'explorer', task: 'map the codebase', status: 'working' }],
      }),
    );

    expect(status).toBe('working');
  });
});

describe('computeSessionStatus activity window', () => {
  // A pinned clock: the cases below sit close to the window edge, which a real clock would make
  // flaky on a loaded machine.
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-30T12:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // An answered assistant turn with no subagents: no mid-turn or running-agent heuristic applies,
  // so the window is the only thing that can read this session as 'working'.
  function idleFor(idleMs: number, overrides: Partial<Session> = {}): Session {
    return session({ lastEntryType: 'assistant', lastInteractionTime: Date.now() - idleMs, ...overrides });
  }

  it('defaults to the 60s RECENT_WRITE window: 59s idle is working, 61s idle is stopped', () => {
    expect(computeSessionStatus(idleFor(59_000))).toBe('working');
    expect(computeSessionStatus(idleFor(61_000))).toBe('stopped');
  });

  it('honors a shorter window: 45s idle is stopped under a 30s window', () => {
    expect(computeSessionStatus(idleFor(45_000), 30_000)).toBe('stopped');
  });

  it('honors a longer window: 200s idle is working under a 300s window', () => {
    expect(computeSessionStatus(idleFor(200_000), 300_000)).toBe('working');
  });

  it('treats a write exactly one window ago as idle: the window edge is exclusive', () => {
    expect(computeSessionStatus(idleFor(29_999), 30_000)).toBe('working');
    expect(computeSessionStatus(idleFor(30_000), 30_000)).toBe('stopped');
  });

  it('lets shutdownRecorded beat even the largest window the setting allows', () => {
    // The shutdown snapshot is itself a fresh write, so any window wide enough to cover it would
    // read the just-exited session as working were it not for the latch outranking the window.
    expect(computeSessionStatus(idleFor(5_000, { shutdownRecorded: true }), IDLE_CEILING)).toBe('stopped');
  });
});
