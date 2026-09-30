import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

const state = vi.hoisted(() => ({
  home: '',
  changes: [] as Array<(uri: { fsPath: string }) => void>,
  creations: [] as Array<(uri: { fsPath: string }) => void>,
  refreshCalls: 0,
  treeFires: vi.fn(),
}));

vi.mock('os', async (importOriginal) => ({
  ...(await importOriginal<typeof os>()),
  homedir: () => state.home,
}));

// The debug log is a disk append (an external boundary): mocking it keeps the run off the disk and
// lets the "no logging per watcher event" guarantee be asserted.
vi.mock('../logger', () => ({ logDebug: vi.fn() }));

vi.mock('vscode', () => ({
  EventEmitter: class {
    event = vi.fn();
    fire = state.treeFires;
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
      onDidCreate: (callback: (uri: { fsPath: string }) => void) => state.creations.push(callback),
      onDidDelete: vi.fn(),
      dispose: vi.fn(),
    }),
  },
}));

// Counts status refreshes without replacing them: the real refresh still runs, so the tree the
// tests read back is the real one.
vi.mock('../sessionStatusRefresh', async (importOriginal) => {
  const original = await importOriginal<typeof import('../sessionStatusRefresh')>();
  return {
    ...original,
    refreshSessionStatuses: (...args: Parameters<typeof original.refreshSessionStatuses>) => {
      state.refreshCalls += 1; // one call per status refresh (updateActiveStatuses)
      original.refreshSessionStatuses(...args);
    },
  };
});

import { EVENT_COALESCE_MS, SessionTreeDataProvider } from '../sessionTreeDataProvider';
import { BrandTreeItem } from '../treeItems';
import { logDebug } from '../logger';

// The Claude watcher is recursive (`**/*.jsonl`), so it reports files that are not sessions:
// subagent transcripts and, since Claude Code 2.1.28x, Workflow journals
// (`<session>/subagents/workflows/wf_*/journal.jsonl`, lines are only launched/started/result).
// Only the journal is dangerous — it has no `isSidechain` flag to make the parser hide it.
describe('SessionTreeDataProvider Claude watcher', () => {
  const SESSION_ID = '5d1e8a20-6b3a-4c7b-9a3e-2f6b1c8d4e50';
  const SESSION_FIXTURE = path.join(__dirname, 'fixtures', 'real-logs', 'session-shutdown-marker.jsonl');
  const PROJECT = '-Users-dev-Projects-acme-acme-app';
  let provider: SessionTreeDataProvider;
  let projectDir: string;

  beforeEach(async () => {
    // Fake timers first: activation arms the poll tick and every reported change waits out the
    // coalescing window, so neither may depend on the wall clock.
    vi.useFakeTimers();
    state.home = fs.mkdtempSync(path.join(os.tmpdir(), 'watcher-provider-'));
    // The provider resolves CODEX_HOME when it is constructed, so this must precede `new
    // SessionTreeDataProvider()` below: otherwise a CODEX_HOME exported in the developer's shell
    // makes it scan their real rollouts.
    vi.stubEnv('CODEX_HOME', path.join(state.home, '.codex'));
    state.changes = [];
    state.creations = [];
    projectDir = path.join(state.home, '.claude', 'projects', PROJECT);
    fs.mkdirSync(projectDir, { recursive: true });
    fs.copyFileSync(SESSION_FIXTURE, path.join(projectDir, `${SESSION_ID}.jsonl`));
    // An empty Antigravity brain root: its watcher registers (it needs the directory to exist) but
    // no conversation is discovered at load, so a later change is what registers one.
    fs.mkdirSync(path.join(state.home, '.gemini', 'antigravity-ide', 'brain'), { recursive: true });
    provider = new SessionTreeDataProvider();
    await provider.activateMonitoring();
    // Activation's own refreshes and fires are not what these tests count.
    state.refreshCalls = 0;
    state.treeFires.mockClear();
    vi.mocked(logDebug).mockClear();
  });

  afterEach(() => {
    provider.dispose();
    vi.useRealTimers();
    vi.unstubAllEnvs();
    fs.rmSync(state.home, { recursive: true, force: true });
  });

  /** Watchers register in this order — Claude (0), Antigravity (1, its root exists under this
   * fake home), Codex (2) — each with its own onDidChange callback. A reported change only takes
   * effect once its coalescing window has elapsed. */
  async function reportChange(filePath: string, watcher = 0): Promise<void> {
    state.changes[watcher]({ fsPath: filePath });
    await vi.advanceTimersByTimeAsync(EVENT_COALESCE_MS + 10);
  }

  function visibleSessionIds(): string[] {
    const brands = provider.getChildren() as BrandTreeItem[];
    return brands.flatMap((brand) => brand.sessions.map((s) => s.id));
  }

  it('registers a genuinely new root-level transcript (control: the guard must not swallow real sessions)', async () => {
    const created = path.join(projectDir, '7a2b9c30-1111-4c7b-9a3e-2f6b1c8d4e51.jsonl');
    fs.copyFileSync(SESSION_FIXTURE, created);

    await reportChange(created);

    expect(visibleSessionIds().sort()).toEqual([SESSION_ID, '7a2b9c30-1111-4c7b-9a3e-2f6b1c8d4e51']);
  });

  it('treats a created transcript like a changed one — a new session starts with a create event', async () => {
    const created = path.join(projectDir, '7a2b9c30-1111-4c7b-9a3e-2f6b1c8d4e51.jsonl');
    fs.copyFileSync(SESSION_FIXTURE, created);

    state.creations[0]({ fsPath: created });
    await vi.advanceTimersByTimeAsync(EVENT_COALESCE_MS + 10);

    expect(visibleSessionIds()).toContain('7a2b9c30-1111-4c7b-9a3e-2f6b1c8d4e51');
  });

  it('does not turn a Workflow journal into a phantom session named "journal"', async () => {
    const workflowDir = path.join(projectDir, SESSION_ID, 'subagents', 'workflows', 'wf_x');
    fs.mkdirSync(workflowDir, { recursive: true });
    const journal = path.join(workflowDir, 'journal.jsonl');
    const lines = [{ type: 'launched' }, { type: 'started', key: 'Sample text 1', agentId: 'Sample text 2' }];
    fs.writeFileSync(journal, lines.map((l) => JSON.stringify(l)).join('\n') + '\n');

    await reportChange(journal);

    expect(visibleSessionIds()).toEqual([SESSION_ID]);
  });

  it('still refreshes statuses when a skipped non-session file changes — that is what shows a background agent finishing', async () => {
    const workflowDir = path.join(projectDir, SESSION_ID, 'subagents', 'workflows', 'wf_x');
    fs.mkdirSync(workflowDir, { recursive: true });
    const journal = path.join(workflowDir, 'journal.jsonl');
    fs.writeFileSync(journal, '{"type":"launched"}\n');

    await reportChange(journal);

    expect(state.refreshCalls).toBe(1);
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

  describe('coalescing a burst of events', () => {
    const sessionFile = (): string => path.join(projectDir, `${SESSION_ID}.jsonl`);

    it('does no work and no logging per event — the window only buffers', () => {
      for (let i = 0; i < 50; i += 1) state.changes[0]({ fsPath: sessionFile() });

      expect(state.refreshCalls).toBe(0);
      expect(state.treeFires).not.toHaveBeenCalled();
      expect(logDebug).not.toHaveBeenCalled();
    });

    it('turns 50 events for one file inside one window into exactly one status refresh and one tree fire', async () => {
      for (let i = 0; i < 50; i += 1) state.changes[0]({ fsPath: sessionFile() });

      await vi.advanceTimersByTimeAsync(EVENT_COALESCE_MS + 10);

      expect(state.refreshCalls).toBe(1);
      expect(state.treeFires).toHaveBeenCalledTimes(1);
    });

    it('parses each dirty file of a window once: two files reported together both register, with one refresh', async () => {
      const second = path.join(projectDir, '7a2b9c30-1111-4c7b-9a3e-2f6b1c8d4e51.jsonl');
      fs.copyFileSync(SESSION_FIXTURE, second);

      state.changes[0]({ fsPath: sessionFile() });
      state.changes[0]({ fsPath: second });
      await vi.advanceTimersByTimeAsync(EVENT_COALESCE_MS + 10);

      expect(visibleSessionIds().sort()).toEqual([SESSION_ID, '7a2b9c30-1111-4c7b-9a3e-2f6b1c8d4e51']);
      expect(state.refreshCalls).toBe(1);
      expect(state.treeFires).toHaveBeenCalledTimes(1);
    });

    it('flushes once per window while events keep arriving — the window is not re-armed (no starvation)', async () => {
      const windows = 3;
      // One event every 100 ms for three windows. A trailing-edge debounce would never flush here.
      for (let elapsed = 0; elapsed < windows * EVENT_COALESCE_MS; elapsed += 100) {
        state.changes[0]({ fsPath: sessionFile() });
        await vi.advanceTimersByTimeAsync(100);
      }

      expect(state.refreshCalls).toBe(windows);
      expect(state.treeFires).toHaveBeenCalledTimes(windows);
    });

    it('stays silent once the window closes with nothing new', async () => {
      state.changes[0]({ fsPath: sessionFile() });
      await vi.advanceTimersByTimeAsync(EVENT_COALESCE_MS + 10);
      state.refreshCalls = 0;
      state.treeFires.mockClear();

      await vi.advanceTimersByTimeAsync(EVENT_COALESCE_MS * 4);

      expect(state.refreshCalls).toBe(0);
      expect(state.treeFires).not.toHaveBeenCalled();
    });

    it('writes one debug line per flush, however many events it carried, counting distinct changed files', async () => {
      for (let i = 0; i < 50; i += 1) state.changes[0]({ fsPath: sessionFile() });

      await vi.advanceTimersByTimeAsync(EVENT_COALESCE_MS + 10);

      // 50 events, one file: the line reports the batch size, which is the number of files.
      expect(logDebug).toHaveBeenCalledExactlyOnceWith(expect.stringContaining('flushed 1 changed file(s)'));
    });

    it('drops a pending flush on dispose(): nothing is parsed, refreshed or fired afterwards', async () => {
      state.changes[0]({ fsPath: sessionFile() });

      provider.dispose();
      await vi.advanceTimersByTimeAsync(EVENT_COALESCE_MS * 2);

      expect(state.refreshCalls).toBe(0);
      expect(state.treeFires).not.toHaveBeenCalled();
    });

    it('drops a pending flush on deactivateMonitoring(): the only fire is its own', async () => {
      state.changes[0]({ fsPath: sessionFile() });

      provider.deactivateMonitoring();
      await vi.advanceTimersByTimeAsync(EVENT_COALESCE_MS * 2);

      expect(state.refreshCalls).toBe(0);
      expect(state.treeFires).toHaveBeenCalledTimes(1);
    });

    it('does not let a window left open by deactivateMonitoring() flush into a re-enabled monitor', async () => {
      state.changes[0]({ fsPath: sessionFile() });
      provider.deactivateMonitoring();
      await provider.activateMonitoring();
      state.refreshCalls = 0;
      state.treeFires.mockClear();

      await vi.advanceTimersByTimeAsync(EVENT_COALESCE_MS * 2);

      expect(state.refreshCalls).toBe(0);
      expect(state.treeFires).not.toHaveBeenCalled();
    });

    it('ignores a late watcher event once monitoring is off', async () => {
      provider.deactivateMonitoring();
      state.treeFires.mockClear();

      state.changes[0]({ fsPath: sessionFile() });
      await vi.advanceTimersByTimeAsync(EVENT_COALESCE_MS * 2);

      expect(state.refreshCalls).toBe(0);
      expect(state.treeFires).not.toHaveBeenCalled();
    });
  });
});
