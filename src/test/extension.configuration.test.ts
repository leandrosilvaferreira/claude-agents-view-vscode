import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type * as vscode from 'vscode';
import type { MonitorSettings } from '../monitorSettings';

type ConfigEvent = { affectsConfiguration: (key: string) => boolean };

const state = vi.hoisted(() => {
  // What getConfiguration('claudeAgentsMonitor').get(key) returns; a key that is absent reads as unset.
  const config: Record<string, unknown> = {};
  return {
    config,
    onConfigChange: undefined as ((event: { affectsConfiguration: (key: string) => boolean }) => void) | undefined,
    channelNames: [] as string[],
    appended: [] as string[],
    // The tree view activate() created, so a test can read the header message it left behind.
    treeView: undefined as { message: string | undefined; dispose: () => void } | undefined,
    // What each withProgress task returned: the promise a real progress bar waits on.
    progressRuns: [] as Promise<unknown>[],
    providerOptions: undefined as { settings?: MonitorSettings; diagnostics?: (line: string) => void } | undefined,
    activateMonitoring: vi.fn(),
    deactivateMonitoring: vi.fn(),
    applySettings: vi.fn(),
  };
});

vi.mock('../logger', () => ({ logDebug: vi.fn() }));

// The provider is the boundary under test here: the extension's job is to construct it with the right
// settings and to call the right method when a setting changes, not what the provider does about it.
vi.mock('../sessionTreeDataProvider', () => ({
  SessionTreeDataProvider: class {
    constructor(options: { settings?: MonitorSettings; diagnostics?: (line: string) => void }) {
      state.providerOptions = options;
    }
    activateMonitoring = state.activateMonitoring;
    deactivateMonitoring = state.deactivateMonitoring;
    applySettings = state.applySettings;
    refresh = vi.fn();
    dispose = vi.fn();
  },
}));

vi.mock('vscode', () => ({
  window: {
    createOutputChannel: (name: string) => {
      state.channelNames.push(name);
      return { appendLine: (line: string) => state.appended.push(line), dispose: vi.fn() };
    },
    createTreeView: () => {
      state.treeView = { message: undefined, dispose: vi.fn() };
      return state.treeView;
    },
    // Runs the task the way VS Code does, so the startup-delay path is exercised rather than skipped.
    withProgress: (_options: unknown, task: () => Promise<unknown>) => {
      const run = task();
      state.progressRuns.push(run);
      return run;
    },
  },
  workspace: {
    getConfiguration: () => ({
      get: (key: string, fallback?: unknown) => (key in state.config ? state.config[key] : fallback),
    }),
    onDidChangeConfiguration: (listener: (event: ConfigEvent) => void) => {
      state.onConfigChange = listener;
      return { dispose: vi.fn() };
    },
  },
  commands: { registerCommand: () => ({ dispose: vi.fn() }), executeCommand: vi.fn() },
  ConfigurationTarget: { Global: 1 },
}));

import { activate } from '../extension';

const SECTION = 'claudeAgentsMonitor';

function activateExtension(): vscode.ExtensionContext {
  const context = { subscriptions: [] as unknown[] } as unknown as vscode.ExtensionContext;
  activate(context);
  return context;
}

/** Reports a configuration change that affects exactly these keys of the extension's section. */
function changeSettings(...keys: string[]): void {
  const affected = new Set(keys.map((key) => `${SECTION}.${key}`));
  state.onConfigChange?.({ affectsConfiguration: (key) => affected.has(key) });
}

/** What VS Code does on deactivation: disposes everything the extension put in its subscriptions. */
function disposeExtension(context: vscode.ExtensionContext): void {
  for (const subscription of context.subscriptions) subscription.dispose();
}

describe('extension configuration wiring', () => {
  // Fake timers for every test: activate() arms the startup delay, and a real 10 s timer left behind
  // by each test would outlive it.
  beforeEach(() => {
    vi.useFakeTimers();
    state.config = { enabled: true };
    state.channelNames = [];
    state.appended = [];
    state.treeView = undefined;
    state.progressRuns = [];
    state.providerOptions = undefined;
    state.onConfigChange = undefined;
    state.activateMonitoring.mockClear();
    state.deactivateMonitoring.mockClear();
    state.applySettings.mockClear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('at activation', () => {
    it('hands the provider the defaults when neither tuning setting is set', () => {
      activateExtension();

      expect(state.providerOptions?.settings).toEqual({ activityWindowMs: 60_000, pollIntervalMs: 15_000 });
    });

    it('hands the provider the configured values in milliseconds', () => {
      state.config = { enabled: true, activityWindowSeconds: 120, pollIntervalSeconds: 30 };

      activateExtension();

      expect(state.providerOptions?.settings).toEqual({ activityWindowMs: 120_000, pollIntervalMs: 30_000 });
    });

    it('clamps values hand-edited past the manifest range', () => {
      state.config = { enabled: true, activityWindowSeconds: 5, pollIntervalSeconds: 100_000 };

      activateExtension();

      expect(state.providerOptions?.settings).toEqual({ activityWindowMs: 10_000, pollIntervalMs: 30_000 });
    });

    it('opens an "Agent Monitor" output channel and registers it for disposal', () => {
      const context = activateExtension();

      expect(state.channelNames).toEqual(['Agent Monitor']);
      expect(context.subscriptions).toContainEqual(expect.objectContaining({ appendLine: expect.any(Function) }));
    });

    it('writes each diagnostics line to that channel, prefixed with an ISO timestamp', () => {
      activateExtension();

      state.providerOptions?.diagnostics?.('strategy: sample');

      expect(state.appended).toEqual([expect.stringMatching(/^\[\d{4}-\d{2}-\d{2}T[\d:.]+Z\] strategy: sample$/)]);
    });
  });

  describe('when a setting changes', () => {
    it.each(['activityWindowSeconds', 'pollIntervalSeconds'])(
      'applies the re-read values when %s changes, without toggling monitoring',
      (key) => {
        activateExtension();
        state.config = { enabled: true, activityWindowSeconds: 300, pollIntervalSeconds: 25 };

        changeSettings(key);

        expect(state.applySettings).toHaveBeenCalledExactlyOnceWith({
          activityWindowMs: 300_000,
          pollIntervalMs: 25_000,
        });
        expect(state.activateMonitoring).not.toHaveBeenCalled();
        expect(state.deactivateMonitoring).not.toHaveBeenCalled();
      },
    );

    it('clamps the re-read values before applying them', () => {
      activateExtension();
      state.config = { enabled: true, activityWindowSeconds: 99_999, pollIntervalSeconds: 1 };

      changeSettings('activityWindowSeconds');

      expect(state.applySettings).toHaveBeenCalledWith({ activityWindowMs: 1_800_000, pollIntervalMs: 10_000 });
    });

    it('starts monitoring when `enabled` turns on, without applying tuning', () => {
      activateExtension();
      state.config = { enabled: true };

      changeSettings('enabled');

      expect(state.activateMonitoring).toHaveBeenCalledOnce();
      expect(state.applySettings).not.toHaveBeenCalled();
    });

    it('stops monitoring when `enabled` turns off, without applying tuning', () => {
      activateExtension();
      state.config = { enabled: false };

      changeSettings('enabled');

      expect(state.deactivateMonitoring).toHaveBeenCalledOnce();
      expect(state.applySettings).not.toHaveBeenCalled();
    });

    it('handles the toggle and the tuning independently when one edit changes both', () => {
      activateExtension();
      state.config = { enabled: true, pollIntervalSeconds: 20 };

      changeSettings('enabled', 'pollIntervalSeconds');

      expect(state.activateMonitoring).toHaveBeenCalledOnce();
      expect(state.applySettings).toHaveBeenCalledOnce();
    });

    // The provider's applySettings only stores the values while the monitor is not running, and the
    // first scan activateMonitoring() starts reads whatever it holds at that moment — so applying the
    // tuning after the activation would scan with the old window.
    it('applies the new tuning before it starts monitoring when one edit enables and retunes', () => {
      activateExtension();
      state.config = { enabled: true, activityWindowSeconds: 300, pollIntervalSeconds: 20 };

      changeSettings('enabled', 'activityWindowSeconds', 'pollIntervalSeconds');

      expect(state.applySettings).toHaveBeenCalledOnce();
      expect(state.activateMonitoring).toHaveBeenCalledOnce();
      expect(state.applySettings.mock.invocationCallOrder[0]).toBeLessThan(
        state.activateMonitoring.mock.invocationCallOrder[0],
      );
    });

    it('ignores a change to an unrelated setting', () => {
      activateExtension();

      changeSettings('somethingElse');

      expect(state.activateMonitoring).not.toHaveBeenCalled();
      expect(state.deactivateMonitoring).not.toHaveBeenCalled();
      expect(state.applySettings).not.toHaveBeenCalled();
    });
  });

  // The first scan waits out a delay so Claude Code can finish booting. The wait must not outlive the
  // extension, and must not override a `enabled = false` the user sets while it is pending.
  describe('startup delay', () => {
    it('holds the first scan back, then activates monitoring and clears the header message', async () => {
      activateExtension();
      expect(state.treeView?.message).toBeDefined();

      await vi.advanceTimersByTimeAsync(1_000);
      expect(state.activateMonitoring).not.toHaveBeenCalled();
      await vi.runAllTimersAsync();

      expect(state.activateMonitoring).toHaveBeenCalledOnce();
      expect(state.treeView?.message).toBeUndefined();
    });

    it('clears the header message even when the initial activation fails', async () => {
      state.activateMonitoring.mockRejectedValueOnce(new Error('watchers unavailable'));
      activateExtension();
      const failure = expect(state.progressRuns[0]).rejects.toThrow('watchers unavailable');

      await vi.runAllTimersAsync();
      await failure;

      expect(state.treeView?.message).toBeUndefined();
    });

    it('does not switch monitoring back on when it was disabled while the delay was pending', async () => {
      activateExtension();
      state.config = { enabled: false };
      changeSettings('enabled');

      await vi.runAllTimersAsync();

      expect(state.activateMonitoring).not.toHaveBeenCalled();
      expect(state.treeView?.message).toBeUndefined();
    });

    it('cancels the pending timer when the extension is disposed, so nothing fires after dispose', async () => {
      const context = activateExtension();
      expect(vi.getTimerCount()).toBe(1);

      disposeExtension(context);
      expect(vi.getTimerCount()).toBe(0);
      await vi.runAllTimersAsync();

      expect(state.activateMonitoring).not.toHaveBeenCalled();
    });

    it('clears the header message when the extension is disposed during the delay', async () => {
      const context = activateExtension();
      expect(state.treeView?.message).toBeDefined();

      disposeExtension(context);
      await vi.advanceTimersByTimeAsync(0);

      expect(state.treeView?.message).toBeUndefined();
    });

    it('lets the progress task settle when disposed during the delay, instead of leaving the bar spinning', async () => {
      const context = activateExtension();
      let settled = false;
      void state.progressRuns[0].then(() => {
        settled = true;
      });

      disposeExtension(context);
      await vi.advanceTimersByTimeAsync(0);

      expect(settled).toBe(true);
    });
  });
});
