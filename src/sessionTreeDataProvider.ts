import * as vscode from 'vscode';
import * as path from 'path';
import * as os from 'os';
import { Session, SubAgent } from './types';
import { LogParser } from './logParser';
import { LogFileRef, isClaudeSessionFile, scanSessionFiles } from './sessionScanner';
import { logDebug } from './logger';
import { canonicalJoin } from './fsPath';
import { assembleVisibleSessions } from './sessionAssembly';
import { upsertIfMoreRelevant } from './sessionDedupe';
import {
  BrandTreeItem,
  MessageTreeItem,
  SessionTreeItem,
  SubAgentGroupTreeItem,
  SubAgentTreeItem,
  buildRootItems,
} from './treeItems';
import { createClaudeCompatNotifier } from './claudeCompatNotice';
import { getNestedSubAgentChildren, getSessionGroupChildren, getSubAgentGroupChildren } from './subagentTreeChildren';
import { refreshSessionStatuses } from './sessionStatusRefresh';
import { assembleCodexHierarchy } from './codexHierarchy';
import { WatcherStatus, createSessionFileWatchers, describeMonitoring } from './sessionFileWatchers';
import { createEventCoalescer } from './eventCoalescer';
import { singleFlight } from './singleFlight';
import { DEFAULT_MONITOR_SETTINGS, MonitorSettings } from './monitorSettings';

type TreeItemType = BrandTreeItem | MessageTreeItem | SessionTreeItem | SubAgentGroupTreeItem | SubAgentTreeItem;

// Session.type discriminator value for the Claude Code brand (the recursive-watcher guard in
// flushFileChanges keys off it).
const CLAUDE_CODE_BRAND = 'claude-code' as const;

/** Watcher events landing within this long of the first one are handled as a single batch. */
export const EVENT_COALESCE_MS = 500;

export class SessionTreeDataProvider implements vscode.TreeDataProvider<TreeItemType> {
  private _onDidChangeTreeData: vscode.EventEmitter<TreeItemType | undefined | null | void> = new vscode.EventEmitter<
    TreeItemType | undefined | null | void
  >();
  readonly onDidChangeTreeData: vscode.Event<TreeItemType | undefined | null | void> = this._onDidChangeTreeData.event;

  private logParser = new LogParser();
  private sessions = new Map<string, Session>();
  // Background-agent sessions nested under their launcher, keyed by the human session id.
  // Rebuilt from scratch on every getVisibleSessions() pass, so it never accumulates duplicates.
  private nestedAgents = new Map<string, SubAgent[]>();
  private watchers: vscode.FileSystemWatcher[] = [];
  // Gate file-change parsing until the startup delay elapses, so we don't
  // compete with Claude Code for the log files while it is booting.
  private isReady = false;
  // True until the first load finishes — drives the loading placeholder in the view.
  private loading = true;
  // Global on/off (persisted in the `claudeAgentsMonitor.enabled` setting). When off,
  // watchers and the timer are torn down and no log files are read.
  private monitoringEnabled = true;
  private refreshTimer: ReturnType<typeof setInterval> | undefined;
  // Warn only once per window when a newer-than-validated Claude Code version shows up in the logs.
  private notifyClaudeCompat = createClaudeCompatNotifier((msg) => void vscode.window.showWarningMessage(msg));

  // Watcher events wait here for EVENT_COALESCE_MS and are handled as one batch (flushFileChanges).
  private coalescer = createEventCoalescer<Session['type']>((batch) => {
    this.flushFileChanges(batch);
  }, EVENT_COALESCE_MS);
  // Every full scan (poll tick, manual refresh, first load) goes through here so two never overlap.
  // loadSessions() is synchronous today, so this is a guard against overlapping triggers and a
  // future async step in the scan, not the fix for a live race.
  private runScan = singleFlight(() => this.loadSessions());
  private settings: MonitorSettings;
  private readonly diagnostics: (line: string) => void;

  private claudeProjectsPath = canonicalJoin(os.homedir(), '.claude', 'projects');
  private geminiBrainPath = canonicalJoin(os.homedir(), '.gemini', 'antigravity-ide', 'brain');
  private codexSessionsPath = canonicalJoin(process.env.CODEX_HOME || path.join(os.homedir(), '.codex'), 'sessions');

  /** `diagnostics` receives the lines the extension shows in its output channel. */
  constructor(options: { settings?: MonitorSettings; diagnostics?: (line: string) => void } = {}) {
    this.settings = options.settings ?? DEFAULT_MONITOR_SETTINGS;
    this.diagnostics = options.diagnostics ?? (() => undefined);
  }

  public isMonitoringEnabled(): boolean {
    return this.monitoringEnabled;
  }

  /**
   * Turn monitoring on: show the loading state, load once, then wire up the file
   * watchers and the auto-refresh timer. Also used to re-enable after a manual toggle.
   */
  public async activateMonitoring(): Promise<void> {
    this.monitoringEnabled = true;
    this.loading = true;
    this._onDidChangeTreeData.fire();

    try {
      await this.runScan();
      logDebug('SessionTreeDataProvider: activateMonitoring() initial load completed');
    } catch (err) {
      logDebug(`SessionTreeDataProvider: activateMonitoring() load failed: ${String(err)}`);
    }

    this.loading = false;
    this.isReady = true;
    const statuses = this.setupFileWatchers();
    this.startAutoRefresh();
    this._onDidChangeTreeData.fire();
    for (const line of describeMonitoring(statuses, this.settings)) this.report(line);
  }

  /** Turn monitoring off: dispose watchers, stop the timer, drop cached sessions. */
  public deactivateMonitoring(): void {
    this.monitoringEnabled = false;
    this.isReady = false;
    this.loading = false;
    this.coalescer.cancel();
    this.disposeWatchers();
    this.stopAutoRefresh();
    this.sessions.clear();
    logDebug('SessionTreeDataProvider: monitoring deactivated');
    this._onDidChangeTreeData.fire();
  }

  public dispose(): void {
    this.coalescer.cancel();
    this.stopAutoRefresh();
    this.disposeWatchers();
  }

  /**
   * Adopt retuned settings at once: re-arm the tick and refresh now, so a new window shows without
   * waiting for a tick. A monitor that is not running (startup delay, or switched off) only keeps
   * the values: re-arming or scanning here would start monitoring through the back door.
   */
  public applySettings(settings: MonitorSettings): void {
    this.settings = settings;
    if (this.isReady) {
      this.startAutoRefresh();
      this.refresh();
    }
    const { activityWindowMs, pollIntervalMs } = settings;
    this.report(`settings applied: activity window ${activityWindowMs / 1000}s, poll ${pollIntervalMs / 1000}s`);
  }

  /** Diagnostics reach the extension's output channel and the verbose debug log alike. */
  private report(line: string): void {
    logDebug(`SessionTreeDataProvider: ${line}`);
    this.diagnostics(line);
  }

  private startAutoRefresh(): void {
    this.stopAutoRefresh();
    this.refreshTimer = setInterval(() => {
      logDebug('interval(): Auto-refresh triggered');
      this.refresh();
    }, this.settings.pollIntervalMs);
  }

  private stopAutoRefresh(): void {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
      this.refreshTimer = undefined;
    }
  }

  public refresh(): void {
    if (!this.monitoringEnabled) {
      return;
    }
    logDebug('SessionTreeDataProvider: refresh() requested');
    // Ends in a catch on purpose: a rejected scan must be logged, and a bare `void` would hide it.
    this.runScan()
      .then(() => {
        this._onDidChangeTreeData.fire();
        logDebug('SessionTreeDataProvider: refresh() finished, onDidChangeTreeData fired');
      })
      .catch((err: unknown) => {
        logDebug(`SessionTreeDataProvider: refresh() failed: ${String(err)}`);
      });
  }

  public getTreeItem(element: TreeItemType): vscode.TreeItem {
    return element;
  }

  public getChildren(element?: TreeItemType): vscode.ProviderResult<TreeItemType[]> {
    if (!element) {
      return this.getRootItems();
    } else if (element instanceof BrandTreeItem) {
      // Level 2: Sessions under Brand. Order (working sessions first, most-recent-first within
      // each group) is already decided by assembleVisibleSessions() — don't re-sort here.
      const items = element.sessions.map((session) => new SessionTreeItem(session));
      return items;
    } else if (element instanceof SessionTreeItem) {
      // Level 3: Working Agents / Completed Agents folders (subagentTreeChildren.ts).
      return getSessionGroupChildren(element.session, this.nestedAgents.get(element.session.id) ?? []);
    } else if (element instanceof SubAgentGroupTreeItem) {
      return getSubAgentGroupChildren(element); // Level 4 (subagentTreeChildren.ts)
    } else if (element instanceof SubAgentTreeItem) {
      return getNestedSubAgentChildren(element); // Level 5, nested "grandchildren" (subagentTreeChildren.ts)
    }
    return [];
  }

  private getRootItems(): TreeItemType[] {
    return buildRootItems({ monitoringEnabled: this.monitoringEnabled, loading: this.loading }, () =>
      this.getVisibleSessions(),
    );
  }

  /** Build the tree's top-level session list. Workspace scoping (which folders are open) is read
   * here; the filter/nest/dedupe logic lives in the pure, testable assembleVisibleSessions(). The
   * nested background-agent map it produces is stored for getChildren() to render under launchers. */
  private getVisibleSessions(): Session[] {
    const activeFolders = vscode.workspace.workspaceFolders;
    const activePaths = activeFolders ? activeFolders.map((f) => path.normalize(f.uri.fsPath).toLowerCase()) : [];
    const { topLevel, nestedAgents } = assembleVisibleSessions(
      assembleCodexHierarchy(Array.from(this.sessions.values())),
      activePaths,
      Date.now(),
    );
    this.nestedAgents = nestedAgents;
    return topLevel;
  }

  private disposeWatchers(): void {
    this.watchers.forEach((w) => {
      try {
        w.dispose();
      } catch {
        // Ignore dispose issues
      }
    });
    this.watchers = [];
  }

  private setupFileWatchers(): WatcherStatus[] {
    logDebug('SessionTreeDataProvider: setupFileWatchers() started');
    this.disposeWatchers();
    const { watchers, statuses } = createSessionFileWatchers(
      {
        claudeProjectsPath: this.claudeProjectsPath,
        geminiBrainPath: this.geminiBrainPath,
        codexSessionsPath: this.codexSessionsPath,
      },
      {
        onChange: (filePath, type) => {
          this.handleFileChange(filePath, type);
        },
        onCodexDelete: (filePath) => {
          this.removeCodexSession(filePath);
        },
      },
    );
    this.watchers = watchers;
    return statuses;
  }

  private removeCodexSession(filePath: string): void {
    for (const [id, session] of this.sessions) {
      if (session.type === 'codex' && session.logFilePath === filePath) this.sessions.delete(id);
    }
    this._onDidChangeTreeData.fire();
  }

  /** Deliberately does no work and no logging per event: a transcript is appended to many times a
   * second, so the event only joins the coalescing window. */
  private handleFileChange(filePath: string, type: Session['type']): void {
    if (!this.monitoringEnabled || !this.isReady) return;
    this.coalescer.push(filePath, type);
  }

  /** One coalescing window's events: each dirty file is parsed once, then ONE status refresh and
   * ONE tree refresh cover the batch. Synchronous on purpose — the coalescer cannot await it. */
  private flushFileChanges(batch: ReadonlyMap<string, Session['type']>): void {
    // The window can outlive monitoring: it may have been open when the provider was switched off.
    if (!this.monitoringEnabled || !this.isReady) return;
    for (const [filePath, type] of batch) {
      try {
        // The Claude watcher is recursive, so it also reports files that are not sessions (a
        // subagent's transcript, a Workflow journal — see isClaudeSessionFile). A change to one of
        // those still earns the status refresh below, since it is what shows a background agent
        // working or finishing; it just must not register as a session of its own.
        if (type !== CLAUDE_CODE_BRAND || isClaudeSessionFile(this.claudeProjectsPath, filePath)) {
          const session = this.logParser.parse(filePath, type);
          upsertIfMoreRelevant(this.sessions, session.id, session);
        }
      } catch (err) {
        logDebug(`SessionTreeDataProvider: flushFileChanges() failed for ${filePath}: ${String(err)}`);
      }
    }
    this.updateActiveStatuses();
    this._onDidChangeTreeData.fire();
    logDebug(`SessionTreeDataProvider: flushed ${batch.size} changed file(s)`);
  }

  /** The work is synchronous; the promise is what runScan (singleFlight) wraps, and what
   * external callers can keep awaiting. */
  public loadSessions(): Promise<void> {
    logDebug('SessionTreeDataProvider: loadSessions() started');
    const files = scanSessionFiles(this.claudeProjectsPath, this.geminiBrainPath, this.codexSessionsPath);
    this.removeMissingCodexSessions(files);
    logDebug(`SessionTreeDataProvider: Scanned total ${files.length} log files`);

    // Parse all session files
    for (const file of files) {
      try {
        const session = this.logParser.parse(file.path, file.type);
        upsertIfMoreRelevant(this.sessions, session.id, session);
      } catch (err) {
        logDebug(`SessionTreeDataProvider: Failed to parse file ${file.path}: ${String(err)}`);
      }
    }

    // Determine active statuses
    try {
      this.updateActiveStatuses();
      logDebug('SessionTreeDataProvider: loadSessions() active status updates completed');
    } catch (err) {
      logDebug(`SessionTreeDataProvider: Failed to update active statuses: ${String(err)}`);
    }

    this.notifyClaudeCompat(this.sessions.values());
    return Promise.resolve();
  }

  private removeMissingCodexSessions(files: LogFileRef[]): void {
    const paths = new Set(files.filter((file) => file.type === 'codex').map((file) => file.path));
    for (const [id, session] of this.sessions) {
      if (session.type === 'codex' && !paths.has(session.logFilePath)) this.sessions.delete(id);
    }
  }

  /**
   * Runs on every full scan (loadSessions: the poll tick at `settings.pollIntervalMs`, a manual
   * refresh, the first load) and on every coalesced watcher flush (flushFileChanges). It only
   * snapshots the session map and never throws: a failure is logged and swallowed so one bad
   * session can't break a watcher callback. The actual per-session status and subagent-metadata
   * refresh logic — including WHY enrichSubagentMetadata must run there immediately before
   * refreshNestedSubagents on every tick, not only when a transcript is re-parsed — lives in
   * sessionStatusRefresh.ts's refreshSessionStatuses; see that function's own doc comment.
   */
  private updateActiveStatuses(): void {
    try {
      refreshSessionStatuses(Array.from(this.sessions.values()), this.settings.activityWindowMs);
    } catch (err) {
      logDebug(`SessionTreeDataProvider: updateActiveStatuses() failed: ${String(err)}`);
    }
  }
}
