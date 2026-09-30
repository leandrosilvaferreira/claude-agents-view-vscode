import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { refreshSessionStatuses } from '../sessionStatusRefresh';
import { Session, SubAgent } from '../types';

// Mirrors the real on-disk layout used by nestedSubagents.test.ts / subagentMetadata.test.ts:
// <claudeProjectsDir>/<encoded-project-dir>/<sessionId>/subagents/agent-<id>.meta.json.
describe('refreshSessionStatuses', () => {
  let claudeProjectsDir: string;
  const sessionId = 'test-session-id';
  const baseDirName = '-Users-dev-Projetos-demo';

  beforeEach(() => {
    claudeProjectsDir = fs.mkdtempSync(path.join(os.tmpdir(), 'session-status-refresh-test-'));
  });

  afterEach(() => {
    fs.rmSync(claudeProjectsDir, { recursive: true, force: true });
  });

  function writeSidecar(fileId: string, meta: Record<string, unknown>): void {
    const subagentsDir = path.join(claudeProjectsDir, baseDirName, sessionId, 'subagents');
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

  // name+model already set at launch — the common case (subagentMetadata.ts's doc comment: 113 of
  // 113 real classic-dispatch subagents measured across 3 sessions) — so agentId is the ONLY field
  // still missing: exactly the state a subagent is in between its launch tool_use line and the
  // parent transcript's NEXT growth, which per the bug may not happen until the subagent finishes.
  function makeFreshSubagent(overrides: Partial<SubAgent> = {}): SubAgent {
    return {
      id: 'toolu_parent_fresh',
      name: 'backend-specialist',
      task: 'Delegate task',
      status: 'working',
      model: 'sonnet',
      ...overrides,
    };
  }

  it('fills a freshly-launched subagent agentId and attaches its grandchild in a single refresh pass (regression)', () => {
    // Before this fix, updateActiveStatuses()'s tick called refreshNestedSubagents alone, with no
    // enrichSubagentMetadata call anywhere on that cadence — so sub.agentId here would stay
    // undefined and this grandchild's sidecar (parentAgentId keyed to the REAL agentId, never the
    // raw tool_use id) would never attach until the parent transcript happened to grow again.
    // Both sidecars already exist on disk before this call, matching reality: real sidecars are
    // written ~61-92ms after their launching tool_use line, always before the next tick.
    writeSidecar('real-agent-id', {
      agentType: 'backend-specialist',
      toolUseId: 'toolu_parent_fresh',
      model: 'sonnet',
    });
    writeSidecar('child-of-fresh', {
      agentType: 'general-purpose',
      parentAgentId: 'real-agent-id',
      toolUseId: 'toolu_child',
    });
    const sub = makeFreshSubagent();
    const session = makeSession({ subagents: [sub] });

    refreshSessionStatuses([session]);

    expect(sub.agentId).toBe('real-agent-id');
    expect(sub.children).toHaveLength(1);
    expect(sub.children?.[0].name).toBe('general-purpose');
  });

  it('forwards the activity window to computeSessionStatus, falling back to the 60s default', () => {
    // 45s idle after an answered assistant turn, with no subagents: no mid-turn or running-agent
    // heuristic applies, so the window is the only thing that can decide. That isolates the
    // assertion to what refreshSessionStatuses itself is responsible for — forwarding the window.
    // Every step below flips the status, so none of them can pass on a stale value.
    const session = makeSession({ lastEntryType: 'assistant', lastInteractionTime: Date.now() - 45_000 });

    refreshSessionStatuses([session]);
    expect(session.status).toBe('working');

    refreshSessionStatuses([session], 30_000);
    expect(session.status).toBe('stopped');

    refreshSessionStatuses([session], 60_000);
    expect(session.status).toBe('working');
  });
});
