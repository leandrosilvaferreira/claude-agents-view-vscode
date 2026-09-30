import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

const state = vi.hoisted(() => ({
  home: '',
  // The activity window each status refresh was called with (undefined = the provider passed none).
  windows: [] as Array<number | undefined>,
  // Makes createFileSystemWatcher throw, like a host that cannot register a watcher.
  failWatchers: false,
}));

vi.mock('os', async (importOriginal) => ({
  ...(await importOriginal<typeof os>()),
  homedir: () => state.home,
}));

// The debug log is a disk append (an external boundary): mocking it keeps the run off the disk and
// lets the "diagnostics also reach the debug log" guarantee be asserted.
vi.mock('../logger', () => ({ logDebug: vi.fn() }));

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
    createFileSystemWatcher: () => {
      if (state.failWatchers) throw new Error('watch limit reached');
      return { onDidChange: vi.fn(), onDidCreate: vi.fn(), onDidDelete: vi.fn(), dispose: vi.fn() };
    },
  },
}));

// Records the window each status refresh receives without replacing the refresh: the real one
// still runs, so the statuses the tree shows are the real ones.
vi.mock('../sessionStatusRefresh', async (importOriginal) => {
  const original = await importOriginal<typeof import('../sessionStatusRefresh')>();
  return {
    ...original,
    refreshSessionStatuses: (...args: Parameters<typeof original.refreshSessionStatuses>) => {
      state.windows.push(args[1]);
      original.refreshSessionStatuses(...args);
    },
  };
});

import { SessionTreeDataProvider } from '../sessionTreeDataProvider';
import { DEFAULT_MONITOR_SETTINGS, MonitorSettings } from '../monitorSettings';
import { BrandTreeItem } from '../treeItems';
import { logDebug } from '../logger';

const SESSION_ID = '3c9d2b10-5e7a-4f1b-8a6c-9d0e1f2a3b4c';
const SECOND = 1000;

describe('SessionTreeDataProvider settings, scans and diagnostics', () => {
  let provider: SessionTreeDataProvider;
  let lines: string[];

  beforeEach(() => {
    // Fake timers first: the poll tick is armed on activation, and the session fixture's age is
    // measured against the same frozen clock the status computation reads.
    vi.useFakeTimers();
    state.home = fs.mkdtempSync(path.join(os.tmpdir(), 'settings-provider-'));
    // The provider resolves CODEX_HOME when it is constructed. Without this, a CODEX_HOME exported
    // in the developer's shell would make it scan their real rollouts, and a real `sessions/`
    // directory would change which roots count as watched.
    vi.stubEnv('CODEX_HOME', path.join(state.home, '.codex'));
    state.windows = [];
    state.failWatchers = false;
    lines = [];
    vi.mocked(logDebug).mockClear();
  });

  afterEach(() => {
    provider.dispose();
    vi.useRealTimers();
    vi.unstubAllEnvs();
    fs.rmSync(state.home, { recursive: true, force: true });
  });

  function createProvider(settings?: MonitorSettings): SessionTreeDataProvider {
    provider = new SessionTreeDataProvider({
      settings,
      diagnostics: (line) => {
        lines.push(line);
      },
    });
    return provider;
  }

  /** A Claude transcript whose last entry is an assistant reply: nothing but a recent write can
   * make it read as working. `ageMs` is how long ago it was written. */
  function writeSession(ageMs: number): void {
    const projectDir = path.join(state.home, '.claude', 'projects', '-Users-dev-Projects-acme-billing');
    fs.mkdirSync(projectDir, { recursive: true });
    const file = path.join(projectDir, `${SESSION_ID}.jsonl`);
    const base = {
      cwd: '/Users/dev/Projects/acme/billing',
      sessionId: SESSION_ID,
      timestamp: new Date().toISOString(),
    };
    const rows = [
      { ...base, type: 'user', uuid: 'u1', message: { role: 'user', content: 'Explain the billing flow' } },
      {
        ...base,
        type: 'assistant',
        uuid: 'a1',
        message: { role: 'assistant', content: [{ type: 'text', text: 'Done.' }] },
      },
    ];
    fs.writeFileSync(file, rows.map((row) => JSON.stringify(row)).join('\n') + '\n');
    const writtenAt = new Date(Date.now() - ageMs);
    fs.utimesSync(file, writtenAt, writtenAt);
  }

  function statusOfSession(): string | undefined {
    const brands = provider.getChildren() as BrandTreeItem[];
    return brands.flatMap((brand) => brand.sessions).find((session) => session.id === SESSION_ID)?.status;
  }

  describe('activity window', () => {
    it('defaults to the shared default window when constructed without settings', async () => {
      await createProvider().activateMonitoring();

      expect(state.windows.length).toBeGreaterThan(0);
      expect(new Set(state.windows)).toEqual(new Set([DEFAULT_MONITOR_SETTINGS.activityWindowMs]));
    });

    it('uses the window it was constructed with', async () => {
      await createProvider({ activityWindowMs: 20 * SECOND, pollIntervalMs: 15 * SECOND }).activateMonitoring();

      expect(new Set(state.windows)).toEqual(new Set([20 * SECOND]));
    });

    it('applies a new window to the very next refresh: a session written 30 s ago stops being active', async () => {
      writeSession(30 * SECOND);
      await createProvider().activateMonitoring();
      expect(statusOfSession()).toBe('working');

      provider.applySettings({ activityWindowMs: 10 * SECOND, pollIntervalMs: 15 * SECOND });
      await vi.advanceTimersByTimeAsync(0);

      expect(statusOfSession()).toBe('stopped');
    });

    it('applies a widened window the same way: a session written 90 s ago becomes active again', async () => {
      writeSession(90 * SECOND);
      await createProvider().activateMonitoring();
      expect(statusOfSession()).toBe('stopped');

      provider.applySettings({ activityWindowMs: 120 * SECOND, pollIntervalMs: 15 * SECOND });
      await vi.advanceTimersByTimeAsync(0);

      expect(statusOfSession()).toBe('working');
    });
  });

  describe('poll interval', () => {
    it('ticks every 15 s by default', async () => {
      await createProvider().activateMonitoring();
      const load = vi.spyOn(provider, 'loadSessions');

      await vi.advanceTimersByTimeAsync(15 * SECOND - 1);
      expect(load).not.toHaveBeenCalled();
      await vi.advanceTimersByTimeAsync(1);

      expect(load).toHaveBeenCalledTimes(1);
    });

    it('re-arms the tick at the new period: 10 s fires, the old 15 s cadence no longer does', async () => {
      await createProvider().activateMonitoring();
      const load = vi.spyOn(provider, 'loadSessions');

      provider.applySettings({ activityWindowMs: 60 * SECOND, pollIntervalMs: 10 * SECOND });
      load.mockClear(); // applySettings refreshes once, at once — the tick is what is measured here

      await vi.advanceTimersByTimeAsync(10 * SECOND);
      expect(load).toHaveBeenCalledTimes(1);
      await vi.advanceTimersByTimeAsync(5 * SECOND); // t = 15 s: the old cadence would fire here
      expect(load).toHaveBeenCalledTimes(1);
      await vi.advanceTimersByTimeAsync(5 * SECOND); // t = 20 s: the new cadence fires again
      expect(load).toHaveBeenCalledTimes(2);
    });

    it('refreshes at once when settings are applied, so the new window shows without waiting for a tick', async () => {
      await createProvider().activateMonitoring();
      const load = vi.spyOn(provider, 'loadSessions');

      provider.applySettings(DEFAULT_MONITOR_SETTINGS);

      expect(load).toHaveBeenCalledTimes(1);
    });

    it('keeps settings applied before activation for when monitoring starts, without scanning early', async () => {
      createProvider();
      const load = vi.spyOn(provider, 'loadSessions');

      provider.applySettings({ activityWindowMs: 20 * SECOND, pollIntervalMs: 10 * SECOND });
      await vi.advanceTimersByTimeAsync(60 * SECOND);
      expect(load).not.toHaveBeenCalled();
      expect(vi.getTimerCount()).toBe(0);

      await provider.activateMonitoring();
      load.mockClear();
      await vi.advanceTimersByTimeAsync(10 * SECOND);

      expect(load).toHaveBeenCalledTimes(1);
      expect(new Set(state.windows)).toEqual(new Set([20 * SECOND]));
    });

    it('never switches monitoring back on: a disabled provider stays idle when settings change', async () => {
      await createProvider().activateMonitoring();
      provider.deactivateMonitoring();
      const load = vi.spyOn(provider, 'loadSessions');

      provider.applySettings({ activityWindowMs: 20 * SECOND, pollIntervalMs: 10 * SECOND });
      await vi.advanceTimersByTimeAsync(60 * SECOND);

      expect(load).not.toHaveBeenCalled();
      expect(vi.getTimerCount()).toBe(0);
    });
  });

  describe('scans', () => {
    it('collapses a burst of refresh() calls into one scan plus a single follow-up, never one scan per call', async () => {
      await createProvider().activateMonitoring();
      const load = vi.spyOn(provider, 'loadSessions');

      provider.refresh();
      provider.refresh();
      provider.refresh();
      await vi.advanceTimersByTimeAsync(0);

      expect(load).toHaveBeenCalledTimes(2);
    });

    it('logs a scan that fails on refresh() instead of leaving the rejection unhandled', async () => {
      await createProvider().activateMonitoring();
      vi.spyOn(provider, 'loadSessions').mockRejectedValueOnce(new Error('disk gone'));

      provider.refresh();
      await vi.advanceTimersByTimeAsync(0);

      expect(logDebug).toHaveBeenCalledWith(expect.stringContaining('refresh() failed: Error: disk gone'));
    });

    it('keeps ticking after a scan fails: the next tick scans again', async () => {
      await createProvider().activateMonitoring();
      const load = vi.spyOn(provider, 'loadSessions').mockRejectedValueOnce(new Error('disk gone'));

      await vi.advanceTimersByTimeAsync(15 * SECOND);
      await vi.advanceTimersByTimeAsync(15 * SECOND);

      expect(load).toHaveBeenCalledTimes(2);
      expect(logDebug).toHaveBeenCalledWith(expect.stringContaining('refresh() failed'));
    });

    it('still finishes activating when the first scan fails, instead of staying on "Loading sessions…"', async () => {
      createProvider();
      vi.spyOn(provider, 'loadSessions').mockRejectedValueOnce(new Error('disk gone'));

      await provider.activateMonitoring();

      expect(logDebug).toHaveBeenCalledWith(expect.stringContaining('activateMonitoring() load failed'));
      expect((provider.getChildren() as Array<{ label: string }>)[0].label).not.toBe('Loading sessions…');
    });
  });

  describe('diagnostics', () => {
    it('reports the platform, the strategy and the activity window on activation', async () => {
      await createProvider().activateMonitoring();

      expect(lines).toContainEqual(expect.stringContaining(process.platform));
      expect(lines).toContainEqual(
        expect.stringContaining('event-driven VS Code file watchers + 15s polling safety net, no external processes'),
      );
      expect(lines).toContainEqual(expect.stringContaining('activity window: 60s'));
    });

    it('reports the configured values, not the defaults', async () => {
      await createProvider({ activityWindowMs: 120 * SECOND, pollIntervalMs: 30 * SECOND }).activateMonitoring();

      expect(lines).toContainEqual(expect.stringContaining('30s polling safety net'));
      expect(lines).toContainEqual(expect.stringContaining('activity window: 120s'));
    });

    it('sends every line to the debug log as well', async () => {
      await createProvider().activateMonitoring();

      for (const line of lines) expect(logDebug).toHaveBeenCalledWith(expect.stringContaining(line));
      expect(lines.length).toBeGreaterThan(0);
    });

    it('reports the fallback when none of the transcript roots exists: polling is all there is', async () => {
      await createProvider().activateMonitoring();

      expect(lines).toContainEqual(expect.stringContaining('fallback active: polling every 15s with fs.stat only'));
      expect(lines).toContainEqual(expect.stringMatching(/claude-code: not watched \(directory does not exist\)/));
      expect(lines).toContainEqual(expect.stringMatching(/antigravity: not watched \(directory does not exist\)/));
      expect(lines).toContainEqual(expect.stringMatching(/codex: not watched \(directory does not exist\)/));
    });

    it('reports the configured poll interval in the fallback line', async () => {
      await createProvider({ activityWindowMs: 60 * SECOND, pollIntervalMs: 25 * SECOND }).activateMonitoring();

      expect(lines).toContainEqual(expect.stringContaining('fallback active: polling every 25s with fs.stat only'));
    });

    it('names the roots that are watched and raises no fallback while one is', async () => {
      fs.mkdirSync(path.join(state.home, '.claude', 'projects'), { recursive: true });

      await createProvider().activateMonitoring();

      expect(lines).toContainEqual(expect.stringMatching(/claude-code: watching /));
      expect(lines).toContainEqual(expect.stringMatching(/antigravity: not watched/));
      expect(lines).not.toContainEqual(expect.stringContaining('fallback active'));
    });

    it('reports why a watcher could not be registered and falls back to polling', async () => {
      fs.mkdirSync(path.join(state.home, '.claude', 'projects'), { recursive: true });
      state.failWatchers = true;

      await createProvider().activateMonitoring();

      expect(lines).toContainEqual(expect.stringMatching(/claude-code: not watched \(.*watch limit reached.*\)/));
      expect(lines).toContainEqual(expect.stringContaining('fallback active: polling every 15s with fs.stat only'));
    });

    it('reports the new values when settings are applied', async () => {
      await createProvider().activateMonitoring();
      lines.length = 0;

      provider.applySettings({ activityWindowMs: 120 * SECOND, pollIntervalMs: 30 * SECOND });

      expect(lines).toContainEqual(expect.stringMatching(/120s.*30s|30s.*120s/));
    });

    it('does not report anything further from a refresh or a poll tick', async () => {
      await createProvider().activateMonitoring();
      lines.length = 0;

      provider.refresh();
      await vi.advanceTimersByTimeAsync(15 * SECOND);

      expect(lines).toEqual([]);
    });
  });
});
