import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

const state = vi.hoisted(() => ({
  home: '',
  changes: [] as Array<(uri: { fsPath: string }) => void>,
  openFilesCalls: 0,
}));

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
      onDidChange: (callback: (uri: { fsPath: string }) => void) => state.changes.push(callback),
      onDidCreate: vi.fn(),
      onDidDelete: vi.fn(),
      dispose: vi.fn(),
    }),
  },
}));

vi.mock('../sessionActivity', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../sessionActivity')>()),
  getOpenLogFiles: () => {
    state.openFilesCalls += 1; // one call per status refresh (updateActiveStatuses)
    return Promise.resolve(new Set<string>());
  },
}));

import { SessionTreeDataProvider } from '../sessionTreeDataProvider';
import { BrandTreeItem } from '../treeItems';

// The Claude watcher is recursive (`**/*.jsonl`), so it reports files that are not sessions:
// subagent transcripts and, since Claude Code 2.1.28x, Workflow journals
// (`<session>/subagents/workflows/wf_*/journal.jsonl`, lines are only launched/started/result).
// Only the journal is dangerous — it has no `isSidechain` flag to make the parser hide it.
describe('SessionTreeDataProvider Claude watcher', () => {
  const SESSION_FIXTURE = path.join(__dirname, 'fixtures', 'real-logs', 'session-shutdown-marker.jsonl');
  const PROJECT = '-Users-dev-Projects-acme-acme-app';
  let provider: SessionTreeDataProvider;
  let projectDir: string;

  beforeEach(async () => {
    state.home = fs.mkdtempSync(path.join(os.tmpdir(), 'watcher-provider-'));
    state.changes = [];
    projectDir = path.join(state.home, '.claude', 'projects', PROJECT);
    fs.mkdirSync(projectDir, { recursive: true });
    fs.copyFileSync(SESSION_FIXTURE, path.join(projectDir, '5d1e8a20-6b3a-4c7b-9a3e-2f6b1c8d4e50.jsonl'));
    // An empty Antigravity brain root: its watcher registers (it needs the directory to exist) but
    // no conversation is discovered at load, so a later change is what registers one.
    fs.mkdirSync(path.join(state.home, '.gemini', 'antigravity-ide', 'brain'), { recursive: true });
    provider = new SessionTreeDataProvider();
    await provider.activateMonitoring();
  });

  afterEach(() => {
    provider.dispose();
    vi.unstubAllEnvs();
    fs.rmSync(state.home, { recursive: true, force: true });
  });

  /** Watchers register in this order — Claude (0), Antigravity (1, its root exists under this
   * fake home), Codex (2) — each with its own onDidChange callback. */
  async function reportChange(filePath: string, watcher = 0): Promise<void> {
    state.changes[watcher]({ fsPath: filePath });
    await new Promise((resolve) => setTimeout(resolve, 30));
  }

  function visibleSessionIds(): string[] {
    const brands = provider.getChildren() as BrandTreeItem[];
    return brands.flatMap((brand) => brand.sessions.map((s) => s.id));
  }

  it('registers a genuinely new root-level transcript (control: the guard must not swallow real sessions)', async () => {
    const created = path.join(projectDir, '7a2b9c30-1111-4c7b-9a3e-2f6b1c8d4e51.jsonl');
    fs.copyFileSync(SESSION_FIXTURE, created);

    await reportChange(created);

    expect(visibleSessionIds().sort()).toEqual([
      '5d1e8a20-6b3a-4c7b-9a3e-2f6b1c8d4e50',
      '7a2b9c30-1111-4c7b-9a3e-2f6b1c8d4e51',
    ]);
  });

  it('does not turn a Workflow journal into a phantom session named "journal"', async () => {
    const workflowDir = path.join(projectDir, '5d1e8a20-6b3a-4c7b-9a3e-2f6b1c8d4e50', 'subagents', 'workflows', 'wf_x');
    fs.mkdirSync(workflowDir, { recursive: true });
    const journal = path.join(workflowDir, 'journal.jsonl');
    const lines = [{ type: 'launched' }, { type: 'started', key: 'Sample text 1', agentId: 'Sample text 2' }];
    fs.writeFileSync(journal, lines.map((l) => JSON.stringify(l)).join('\n') + '\n');

    await reportChange(journal);

    expect(visibleSessionIds()).toEqual(['5d1e8a20-6b3a-4c7b-9a3e-2f6b1c8d4e50']);
  });

  it('still refreshes statuses when a skipped non-session file changes — that is what shows a background agent finishing', async () => {
    const workflowDir = path.join(projectDir, '5d1e8a20-6b3a-4c7b-9a3e-2f6b1c8d4e50', 'subagents', 'workflows', 'wf_x');
    fs.mkdirSync(workflowDir, { recursive: true });
    const journal = path.join(workflowDir, 'journal.jsonl');
    fs.writeFileSync(journal, '{"type":"launched"}\n');
    const before = state.openFilesCalls;

    await reportChange(journal);

    expect(state.openFilesCalls).toBe(before + 1);
  });

  it('still registers an Antigravity transcript reported by its own watcher (the guard is Claude-only)', async () => {
    const logsDir = path.join(state.home, '.gemini', 'antigravity-ide', 'brain', 'conv-1', '.system_generated', 'logs');
    fs.mkdirSync(logsDir, { recursive: true });
    const transcript = path.join(logsDir, 'transcript.jsonl');
    fs.writeFileSync(transcript, '{}\n');

    await reportChange(transcript, 1);

    expect(visibleSessionIds()).toContain('conv-1');
  });

  it('still registers a Codex rollout reported by its own watcher (the guard is Claude-only)', async () => {
    vi.stubEnv('CODEX_HOME', path.join(state.home, '.codex'));
    const directory = path.join(state.home, '.codex', 'sessions', '2026', '09', '09');
    fs.mkdirSync(directory, { recursive: true });
    const rollout = path.join(directory, 'rollout-2026-09-09T12-00-00-watcher-thread.jsonl');
    const timestamp = new Date().toISOString();
    const rows = [
      { timestamp, type: 'session_meta', payload: { id: 'watcher-thread', cwd: '/sample', source: 'vscode' } },
      { timestamp, type: 'event_msg', payload: { type: 'task_started', turn_id: 'turn-one' } },
    ];
    fs.writeFileSync(rollout, rows.map((row) => JSON.stringify(row)).join('\n') + '\n');

    await reportChange(rollout, 2);

    expect(visibleSessionIds()).toContain('watcher-thread');
  });
});
