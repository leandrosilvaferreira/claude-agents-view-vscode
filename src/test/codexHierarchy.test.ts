import { describe, expect, it } from 'vitest';
import { assembleCodexHierarchy } from '../codexHierarchy';
import { Session } from '../types';

function session(id: string, parent?: string, status: Session['status'] = 'stopped'): Session {
  return {
    id,
    type: 'codex',
    projectHash: '',
    projectPath: '/demo',
    projectName: 'demo',
    gitBranch: 'main',
    status,
    lastInteractionTime: 1,
    logFilePath: id + '.jsonl',
    subagents: [],
    codexParentThreadId: parent,
    codexAgentName: id,
  };
}

describe('assembleCodexHierarchy', () => {
  it('attaches descendants by thread ID and promotes liveness through ancestors', () => {
    const parent = session('root');
    const rows = assembleCodexHierarchy([session('leaf', 'child', 'working'), parent, session('child', 'root')]);
    expect(rows).toHaveLength(1);
    expect(rows[0].status).toBe('working');
    expect(rows[0].subagents[0]).toMatchObject({
      id: 'child',
      status: 'working',
      children: [{ id: 'leaf', status: 'working' }],
    });
    expect(parent.subagents).toEqual([]);
  });

  it('keeps orphaned agents visible and breaks corrupt cycles', () => {
    const result = assembleCodexHierarchy([
      session('orphan', 'missing'),
      session('a', 'b'),
      session('b', 'a'),
      session('self', 'self'),
    ]);
    expect(result.map((s) => s.id)).toContain('orphan');
    expect(result.map((s) => s.id)).toContain('self');
    expect(() => JSON.stringify(result)).not.toThrow();
    expect(result.length).toBeGreaterThanOrEqual(3);
  });

  it('does not attach Codex agents to a different provider with the same ID', () => {
    const claude = { ...session('root'), type: 'claude-code' as const };
    expect(assembleCodexHierarchy([claude, session('child', 'root')])).toHaveLength(2);
  });
});
