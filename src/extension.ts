import * as vscode from 'vscode';
import * as fs from 'fs';
import { SessionTreeDataProvider } from './sessionTreeDataProvider';
import { SessionTreeItem } from './treeItems';
import { logDebug } from './logger';
import { MonitorSettings, normalizeMonitorSettings } from './monitorSettings';

// Delay before the first log scan, giving Claude Code / Antigravity time to boot
// and read their own files before we start competing for them.
const STARTUP_DELAY_MS = 10000;

const CONFIG_SECTION = 'claudeAgentsMonitor';
const ENABLED_KEY = 'enabled';
const ACTIVITY_WINDOW_KEY = 'activityWindowSeconds';
const POLL_INTERVAL_KEY = 'pollIntervalSeconds';
const OUTPUT_CHANNEL_NAME = 'Agent Monitor';

function isMonitoringEnabled(): boolean {
  return vscode.workspace.getConfiguration(CONFIG_SECTION).get<boolean>(ENABLED_KEY, true);
}

/** The raw values are untrusted (settings.json can be hand-edited past the manifest's min/max),
 * so they are clamped by normalizeMonitorSettings rather than read as numbers. */
function readSettings(): MonitorSettings {
  const config = vscode.workspace.getConfiguration(CONFIG_SECTION);
  return normalizeMonitorSettings({
    activityWindowSeconds: config.get<unknown>(ACTIVITY_WINDOW_KEY),
    pollIntervalSeconds: config.get<unknown>(POLL_INTERVAL_KEY),
  });
}

function setMonitoringEnabled(value: boolean): void {
  // Application scope → persisted in user settings and shared across every window/instance.
  void vscode.workspace.getConfiguration(CONFIG_SECTION).update(ENABLED_KEY, value, vscode.ConfigurationTarget.Global);
}

export function activate(context: vscode.ExtensionContext) {
  logDebug('activate(): Extension activation process started');

  // How detection works on this machine (strategy, platform, fallback, settings changes) goes to a
  // channel the user can open, not only to the verbose debug file.
  const output = vscode.window.createOutputChannel(OUTPUT_CHANNEL_NAME);
  context.subscriptions.push(output);

  // Instantiate the provider synchronously (no I/O here)
  const provider = new SessionTreeDataProvider({
    settings: readSettings(),
    diagnostics: (line) => {
      output.appendLine(`[${new Date().toISOString()}] ${line}`);
    },
  });
  logDebug('activate(): SessionTreeDataProvider instantiated');

  // Register tree provider synchronously so the sidebar renders immediately.
  // createTreeView (over registerTreeDataProvider) lets us set a header message during loading.
  const treeView = vscode.window.createTreeView('claude-sessions-view', { treeDataProvider: provider });
  context.subscriptions.push(treeView, provider);

  // Register all commands synchronously — zero I/O cost
  registerCommands(context, provider);

  // React to the global enable/disable setting. This fires in every window when the
  // (application-scoped) setting changes, so toggling in one instance stops them all.
  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration((e) => {
      // Retuning runs BEFORE the toggle: applySettings only stores the values while the monitor is not
      // running, and the first scan activateMonitoring() starts reads whatever is stored at that
      // moment — so one edit that enables monitoring and retunes it must land the new values first,
      // or the first scan would run with the old window. On its own, retuning applies the new values
      // to a running monitor and never starts or stops it.
      if (
        e.affectsConfiguration(`${CONFIG_SECTION}.${ACTIVITY_WINDOW_KEY}`) ||
        e.affectsConfiguration(`${CONFIG_SECTION}.${POLL_INTERVAL_KEY}`)
      ) {
        provider.applySettings(readSettings());
      }
      if (e.affectsConfiguration(`${CONFIG_SECTION}.${ENABLED_KEY}`)) {
        treeView.message = undefined;
        if (isMonitoringEnabled()) {
          void provider.activateMonitoring();
        } else {
          provider.deactivateMonitoring();
        }
      }
    }),
  );

  if (!isMonitoringEnabled()) {
    logDebug('activate(): monitoring disabled via config — showing placeholder only');
    provider.deactivateMonitoring();
    return;
  }

  // Hold off on the heavy I/O (scanning + parsing hundreds of log files) for a few seconds
  // so Claude Code / Antigravity can finish booting and reading their own log files without
  // us competing for them. A progress bar renders in the view during the wait.
  treeView.message = 'Starting the agent monitor…';
  void vscode.window.withProgress(
    { location: { viewId: 'claude-sessions-view' }, title: 'Waiting for Claude Code to start…' },
    async () => {
      try {
        const elapsed = await waitForStartupDelay(context);
        // `enabled` is read again: the user may have switched monitoring off during the wait, and
        // starting it now would override that. Switching it back on later is the change listener's job.
        if (elapsed && isMonitoringEnabled()) {
          await provider.activateMonitoring();
          logDebug('activate(): Initial monitoring activated after startup delay');
        } else {
          logDebug('activate(): Initial monitoring skipped: disposed or disabled during the startup delay');
        }
      } finally {
        // Clear the header message — the view now shows real content (or an empty-state row).
        treeView.message = undefined;
      }
    },
  );
}

/**
 * Resolves `true` once the startup delay has elapsed, `false` if the extension is disposed first.
 * Disposal clears the timer and settles the promise, so neither a timer that would later start
 * watchers after dispose() nor a progress bar that never finishes outlives the extension.
 */
function waitForStartupDelay(context: vscode.ExtensionContext): Promise<boolean> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      resolve(true);
    }, STARTUP_DELAY_MS);
    context.subscriptions.push({
      dispose: () => {
        clearTimeout(timer);
        resolve(false);
      },
    });
  });
}

function registerCommands(
  context: vscode.ExtensionContext,
  provider: import('./sessionTreeDataProvider').SessionTreeDataProvider,
): void {
  const refreshCmd = vscode.commands.registerCommand('claude-sessions-view.refresh', () => {
    logDebug('command(): refresh invoked');
    provider.refresh();
  });
  context.subscriptions.push(refreshCmd);

  // Toggle buttons in the view title. Handlers only flip the setting; the config
  // listener in activate() is what actually starts/stops monitoring.
  const enableCmd = vscode.commands.registerCommand('claude-sessions-view.enable', () => {
    logDebug('command(): enable monitoring');
    setMonitoringEnabled(true);
  });
  const disableCmd = vscode.commands.registerCommand('claude-sessions-view.disable', () => {
    logDebug('command(): disable monitoring');
    setMonitoringEnabled(false);
  });
  context.subscriptions.push(enableCmd, disableCmd);

  const openLogCmd = vscode.commands.registerCommand(
    'claude-sessions-view.openSessionLog',
    (item?: SessionTreeItem) => {
      logDebug(`command(): openSessionLog for ${item?.id || 'unknown'}`);
      if (item?.session.logFilePath) {
        if (fs.existsSync(item.session.logFilePath)) {
          void vscode.workspace
            .openTextDocument(vscode.Uri.file(item.session.logFilePath))
            .then((doc) => vscode.window.showTextDocument(doc));
        } else {
          void vscode.window.showErrorMessage(`Log file not found: ${item.session.logFilePath}`);
        }
      }
    },
  );
  context.subscriptions.push(openLogCmd);

  const openProjectCmd = vscode.commands.registerCommand(
    'claude-sessions-view.openProject',
    (item?: SessionTreeItem) => {
      logDebug(`command(): openProject for ${item?.id || 'unknown'}`);
      if (item?.session.projectPath) {
        if (fs.existsSync(item.session.projectPath)) {
          void vscode.commands.executeCommand('vscode.openFolder', vscode.Uri.file(item.session.projectPath), true);
        } else {
          void vscode.window.showErrorMessage(`Project folder not found: ${item.session.projectPath}`);
        }
      }
    },
  );
  context.subscriptions.push(openProjectCmd);
}

export function deactivate() {
  logDebug('deactivate(): Extension is being deactivated');
}
