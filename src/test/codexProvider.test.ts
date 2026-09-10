import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

const state = vi.hoisted(() => ({ home: '', deletions: [] as Array<(uri: { fsPath: string }) => void> }));

vi.mock('os', async (importOriginal) => ({
  ...(await importOriginal<typeof os>()),
  homedir: () => state.home,
}));

vi.mock('vscode', () => ({
  EventEmitter: class {
    event = vi.fn();
    fire = vi.fn();
    dispose = vi.fn();
  },
  TreeItem: class {
    constructor(public label: string) {}
  },
  ThemeIcon: class {
    readonly testMock = true;
  },
  ThemeColor: class {
    readonly testMock = true;
  },
  RelativePattern: class {
    readonly testMock = true;
  },
  Uri: { file: (fsPath: string) => ({ fsPath }) },
  TreeItemCollapsibleState: { None: 0, Expanded: 2 },
  workspace: {
    workspaceFolders: [],
    createFileSystemWatcher: () => ({
      onDidChange: vi.fn(),
      onDidCreate: vi.fn(),
      onDidDelete: (callback: (uri: { fsPath: string }) => void) => state.deletions.push(callback),
      dispose: vi.fn(),
    }),
  },
}));

vi.mock('../sessionActivity', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../sessionActivity')>()),
  getOpenLogFiles: () => Promise.resolve(new Set<string>()),
}));

import { SessionTreeDataProvider } from '../sessionTreeDataProvider';
import { BrandTreeItem, SubAgentTreeItem } from '../treeItems';

describe('Codex provider discovery and removal', () => {
  let provider: SessionTreeDataProvider;
  let file: string;

  beforeEach(() => {
    state.home = fs.mkdtempSync(path.join(os.tmpdir(), 'codex-provider-'));
    state.deletions = [];
    vi.stubEnv('CODEX_HOME', path.join(state.home, '.codex'));
    const directory = path.join(state.home, '.codex', 'sessions', '2026', '09', '09');
    fs.mkdirSync(directory, { recursive: true });
    file = path.join(directory, 'rollout-2026-09-09T12-00-00-provider-thread.jsonl');
    const timestamp = new Date().toISOString();
    fs.writeFileSync(
      file,
      [
        { timestamp, type: 'session_meta', payload: { id: 'provider-thread', cwd: '/sample', source: 'vscode' } },
        { timestamp, type: 'event_msg', payload: { type: 'task_started', turn_id: 'turn-one' } },
      ]
        .map((row) => JSON.stringify(row))
        .join('\n') + '\n',
    );
    provider = new SessionTreeDataProvider();
  });

  afterEach(() => {
    provider.dispose();
    vi.unstubAllEnvs();
    fs.rmSync(state.home, { recursive: true, force: true });
  });

  async function codexRoots(): Promise<BrandTreeItem[]> {
    const roots = await provider.getChildren();
    return (roots ?? []).filter(
      (item): item is BrandTreeItem => item instanceof BrandTreeItem && item.brand === 'codex',
    );
  }

  it('renders the Codex brand and removes a deleted rollout on its watcher event', async () => {
    await provider.activateMonitoring();
    expect(await codexRoots()).toHaveLength(1);
    fs.unlinkSync(file);
    for (const callback of state.deletions) callback({ fsPath: file });
    expect(await codexRoots()).toHaveLength(0);
  });

  it('removes a vanished rollout on full refresh even when a watcher event was missed', async () => {
    await provider.activateMonitoring();
    expect(await codexRoots()).toHaveLength(1);
    fs.unlinkSync(file);
    await provider.loadSessions();
    expect(await codexRoots()).toHaveLength(0);
  });

  it('replaces the provisional map entry when a partial metadata line completes', async () => {
    const contents = fs.readFileSync(file, 'utf8');
    const split = contents.indexOf('provider-thread') + 5;
    fs.writeFileSync(file, contents.slice(0, split));
    await provider.activateMonitoring();
    fs.appendFileSync(file, contents.slice(split));
    await provider.loadSessions();
    const brands = await codexRoots();
    expect(brands).toHaveLength(1);
    expect(brands[0].sessions.map((session) => session.id)).toEqual(['provider-thread']);
  });

  it.each([
    {
      scenario: 'readable',
      task: 'Inspect retry handling.\n\nReport cancellation failures.',
      readable: true,
      updateKind: 'event_msg',
    },
    {
      scenario: 'encrypted with event update',
      task: `gAAAAAB${'A'.repeat(180)}==`,
      readable: false,
      updateKind: 'event_msg',
    },
    {
      scenario: 'encrypted with assistant response update',
      task: `gAAAAAB${'A'.repeat(180)}==`,
      readable: false,
      updateKind: 'response_item',
    },
  ])('renders $scenario task information without exposing ciphertext', async ({ task, readable, updateKind }) => {
    const timestamp = new Date().toISOString();
    const rows = [
      {
        timestamp,
        type: 'response_item',
        payload: {
          type: 'function_call',
          name: 'spawn_agent',
          namespace: 'collaboration',
          call_id: 'review-task',
          arguments: JSON.stringify({ task_name: 'reviewer', message: task }),
        },
      },
      {
        timestamp,
        type: 'response_item',
        payload: {
          type: 'function_call_output',
          call_id: 'review-task',
          output: JSON.stringify({ task_name: '/root/reviewer' }),
        },
      },
    ];
    fs.appendFileSync(file, rows.map((row) => JSON.stringify(row)).join('\n') + '\n');
    const child = path.join(path.dirname(file), 'rollout-2026-09-09T12-01-00-child-thread.jsonl');
    fs.writeFileSync(
      child,
      JSON.stringify({
        timestamp,
        type: 'session_meta',
        payload: {
          id: 'child-thread',
          parent_thread_id: 'provider-thread',
          agent_path: '/root/reviewer',
          cwd: '/sample',
        },
      }) + '\n',
    );
    if (!readable) {
      fs.appendFileSync(
        child,
        JSON.stringify({
          timestamp,
          type: updateKind,
          payload:
            updateKind === 'event_msg'
              ? {
                  type: 'agent_message',
                  message: 'Checked retries; cancellation still needs investigation.',
                }
              : {
                  type: 'message',
                  role: 'assistant',
                  phase: 'commentary',
                  content: [{ type: 'output_text', text: 'Checked retries; cancellation still needs investigation.' }],
                },
        }) + '\n',
      );
    }
    await provider.activateMonitoring();
    const session = (await codexRoots())[0].sessions[0];
    const item = new SubAgentTreeItem(session.subagents[0], session);
    if (readable) {
      expect(item.description).toContain('Inspect retry handling. Report cancellation failures.');
      expect(item.tooltip).toContain(task);
    } else {
      expect(item.description).not.toContain('gAAAAA');
      expect(item.tooltip).not.toContain('gAAAAA');
      expect(session.sessionTitle ?? '').not.toContain('gAAAAA');
      expect(item.tooltip).toEqual(expect.stringMatching(/unavailable|not recorded|encrypted/i));
      expect(session.subagents[0].task).toBe('');
      expect(item.description).toContain('Checked retries; cancellation still needs investigation.');
      expect(item.tooltip).toContain('Latest update:');
    }
    expect(item.tooltip).toContain('Last Active:');
    expect(item.tooltip).toContain('child-thread');
  });
});
