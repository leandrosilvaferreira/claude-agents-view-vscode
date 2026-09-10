import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { LogParser } from '../logParser';
import { scanSessionFiles } from '../sessionScanner';
import { assembleVisibleSessions } from '../sessionAssembly';
import { assembleCodexHierarchy } from '../codexHierarchy';

describe('Codex rollout discovery and visible session integration', () => {
  let root: string;
  let parser: LogParser;
  const now = Date.now();
  const timestamp = new Date(now).toISOString();

  beforeEach(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'codex-integration-'));
    parser = new LogParser(path.join(root, 'claude'));
  });

  afterEach(() => {
    fs.rmSync(root, { recursive: true, force: true });
  });

  function event(type: string, payload: Record<string, unknown>): string {
    return JSON.stringify({ timestamp, type, payload });
  }

  function rollout(id: string, parent?: string, completed = false): string {
    const dir = path.join(root, 'codex', '2026', '09', '09');
    fs.mkdirSync(dir, { recursive: true });
    const file = path.join(dir, `rollout-2026-09-09T12-00-00-${id}.jsonl`);
    const rows = [
      event('session_meta', {
        id,
        cwd: '/workspace/example',
        originator: 'codex_vscode',
        source: parent ? { subagent: { thread_spawn: { parent_thread_id: parent } } } : 'vscode',
        parent_thread_id: parent,
        agent_path: parent ? `/root/${id}` : undefined,
        git: { branch: 'main' },
      }),
      event('event_msg', { type: 'task_started', turn_id: `turn-${id}` }),
      event('turn_context', { turn_id: `turn-${id}`, cwd: '/workspace/example', model: 'test-model' }),
      event('event_msg', { type: 'user_message', message: 'Same visible task' }),
    ];
    if (completed) rows.push(event('event_msg', { type: 'task_complete', turn_id: `turn-${id}` }));
    fs.writeFileSync(file, rows.join('\n') + '\n');
    return file;
  }

  function visible() {
    const refs = scanSessionFiles(path.join(root, 'claude'), path.join(root, 'gemini'), path.join(root, 'codex'));
    const parsed = refs.map((ref) => parser.parse(ref.path, ref.type));
    return assembleVisibleSessions(assembleCodexHierarchy(parsed), ['/workspace/example'], now).topLevel;
  }

  it('keeps distinct VS Code sessions with identical project, branch and title', () => {
    rollout('root-one');
    rollout('root-two');
    expect(
      visible()
        .map((session) => session.id)
        .sort(),
    ).toEqual(['root-one', 'root-two']);
  });

  it('shows local Codex sessions outside the current VS Code workspace', () => {
    const file = rollout('other-workspace');
    const session = parser.parse(file, 'codex');
    expect(assembleVisibleSessions([session], ['/workspace/monitor-extension'], now).topLevel).toEqual([
      expect.objectContaining({ id: 'other-workspace', projectPath: '/workspace/example' }),
    ]);
  });

  it('attaches a child and grandchild once, preserving independently completed child status', () => {
    rollout('parent');
    rollout('child', 'parent');
    rollout('grandchild', 'child', true);
    const sessions = visible();
    expect(sessions).toHaveLength(1);
    expect(sessions[0].id).toBe('parent');
    expect(sessions[0].subagents).toHaveLength(1);
    expect(sessions[0].subagents[0].status).toBe('working');
    expect(sessions[0].subagents[0].children).toEqual([
      expect.objectContaining({ id: 'grandchild', status: 'stopped' }),
    ]);
  });

  it('refreshes completion and restart from appended events through the shared parser', () => {
    const file = rollout('live');
    expect(visible()[0].status).toBe('working');
    fs.appendFileSync(file, event('event_msg', { type: 'task_complete', turn_id: 'turn-live' }) + '\n');
    expect(visible()[0].status).toBe('stopped');
    fs.appendFileSync(file, event('event_msg', { type: 'task_started', turn_id: 'turn-next' }) + '\n');
    expect(visible()[0].status).toBe('working');
  });

  it('keeps a running orphan visible when its parent rollout is unavailable', () => {
    rollout('orphan', 'missing-parent');
    expect(visible()).toEqual([expect.objectContaining({ id: 'orphan', type: 'codex', status: 'working' })]);
  });

  it('uses the actual request instead of IDE scaffolding as the visible session title', () => {
    const file = rollout('ide-title');
    const lines = fs.readFileSync(file, 'utf8').trimEnd().split('\n');
    lines.pop();
    lines.push(
      event('response_item', {
        type: 'message',
        role: 'user',
        content: [
          {
            type: 'input_text',
            text: '# Context from my IDE setup:\n## Open tabs:\n- private.ts\n\n## My request for Codex:\nInvestigate the failing retry logic',
          },
        ],
      }),
    );
    fs.writeFileSync(file, lines.join('\n') + '\n');
    expect(visible()[0].sessionTitle).toBe('Investigate the failing retry logic');
  });

  it('does not promote an encrypted request token into a session title', () => {
    const file = rollout('encrypted-title');
    const lines = fs.readFileSync(file, 'utf8').trimEnd().split('\n');
    lines.pop();
    lines.push(event('event_msg', { type: 'user_message', message: `gAAAAAB${'A'.repeat(180)}==` }));
    fs.writeFileSync(file, lines.join('\n') + '\n');
    expect(visible()[0].sessionTitle ?? '').not.toContain('gAAAAA');
  });

  it('keeps a readable own update separate from unavailable task and ignores inherited updates', () => {
    rollout('parent-update');
    const child = rollout('child-update', 'parent-update');
    const ownHeader = fs.readFileSync(child, 'utf8').split('\n')[0];
    const rows = [
      ownHeader,
      event('session_meta', { id: 'parent-update', cwd: '/workspace/example' }),
      event('event_msg', { type: 'agent_message', message: 'Ancestor update must not leak.' }),
    ];
    fs.writeFileSync(child, rows.join('\n') + '\n');
    expect(visible()[0].subagents[0].latestUpdate).toBeUndefined();
    fs.appendFileSync(
      child,
      [
        event('event_msg', { type: 'thread_settings_applied', thread_id: 'child-update' }),
        event('event_msg', { type: 'agent_message', message: 'Verified cancellation behavior.' }),
      ].join('\n') + '\n',
    );
    const agent = visible()[0].subagents[0];
    expect(agent.task).toBe('');
    expect(agent.latestUpdate).toBe('Verified cancellation behavior.');
  });

  it('joins a confirmed parent spawn task to its child and preserves the child timestamp', () => {
    const parent = rollout('launcher');
    const child = rollout('reviewer', 'launcher');
    const task = 'Review retry logic.\n\nCheck cancellation and report the failing path.';
    fs.appendFileSync(
      parent,
      [
        event('response_item', {
          type: 'function_call',
          name: 'spawn_agent',
          namespace: 'collaboration',
          call_id: 'spawn-review',
          arguments: JSON.stringify({ task_name: 'reviewer', message: task }),
        }),
        event('response_item', {
          type: 'function_call_output',
          call_id: 'spawn-review',
          output: JSON.stringify({ task_name: '/root/reviewer' }),
        }),
      ].join('\n') + '\n',
    );
    const session = visible()[0];
    expect(session.subagents[0].task).toBe(task);
    expect(session.subagents[0].lastInteractionTime).toBe(fs.statSync(child).mtimeMs);
  });
});
