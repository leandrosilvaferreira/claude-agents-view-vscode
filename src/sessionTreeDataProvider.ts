import * as vscode from 'vscode';
import * as path from 'path';
import * as os from 'os';
import { Session, SubAgent } from './types';
import { LogParser } from './logParser';
import { LogFileRef, scanSessionFiles } from './sessionScanner';
import { logDebug } from './logger';
import { assembleVisibleSessions } from './sessionAssembly';
import { upsertIfMoreRelevant } from './sessionDedupe';
import { getOpenLogFiles } from './sessionActivity';
import { BrandTreeItem, MessageTreeItem, SessionTreeItem, SubAgentGroupTreeItem, SubAgentTreeItem } from './treeItems';
import { KNOWN_COMPATIBLE_CLAUDE_VERSION, compareVersions, isNewerThanCompatible } from './claudeCompat';
import { getNestedSubAgentChildren, getSubAgentGroupChildren } from './subagentTreeChildren';
import { splitSubagentsByStatus } from './subagentGrouping';
import { refreshSessionStatuses } from './sessionStatusRefresh';
import { assembleCodexHierarchy } from './codexHierarchy';
import { createSessionFileWatchers } from './sessionFileWatchers';

type TreeItemType = BrandTreeItem | MessageTreeItem | SessionTreeItem | SubAgentGroupTreeItem | SubAgentTreeItem;

// Session.type / BrandTreeItem.brand discriminator value for the Claude Code brand, shared by
// the filter/construct/watch call sites below so they can't drift out of sync.
const CLAUDE_CODE_BRAND = 'claude-code' as const;

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
  private warnedClaudeVersion = false;

  private homeDir = os.homedir();
  private claudeProjectsPath = path.join(this.homeDir, '.claude', 'projects');
  private geminiBrainPath = path.join(this.homeDir, '.gemini', 'antigravity-ide', 'brain');
  private codexSessionsPath = path.join(process.env.CODEX_HOME || path.join(this.homeDir, '.codex'), 'sessions');

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
      await this.loadSessions();
      logDebug('SessionTreeDataProvider: activateMonitoring() initial load completed');
    } catch (err) {
      logDebug(`SessionTreeDataProvider: activateMonitoring() load failed: ${String(err)}`);
    }

    this.loading = false;
    this.isReady = true;
    this.setupFileWatchers();
    this.setupCodexWatcher();
    this.startAutoRefresh();
    this._onDidChangeTreeData.fire();
  }

  /** Turn monitoring off: dispose watchers, stop the timer, drop cached sessions. */
  public deactivateMonitoring(): void {
    this.monitoringEnabled = false;
    this.isReady = false;
    this.loading = false;
    this.disposeWatchers();
    this.stopAutoRefresh();
    this.sessions.clear();
    logDebug('SessionTreeDataProvider: monitoring deactivated');
    this._onDidChangeTreeData.fire();
  }

  public dispose(): void {
    this.stopAutoRefresh();
    this.disposeWatchers();
  }

  private startAutoRefresh(): void {
    this.stopAutoRefresh();
    this.refreshTimer = setInterval(() => {
      logDebug('interval(): Auto-refresh triggered');
      this.refresh();
    }, 15000);
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
    void this.loadSessions().then(() => {
      this._onDidChangeTreeData.fire();
      logDebug('SessionTreeDataProvider: refresh() finished, onDidChangeTreeData fired');
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
      // Level 3: Working Agents / Completed Agents folders. Each subagent (own or nested) is
      // bucketed by its own tracked status — see subagentGrouping.ts's doc comment for why the
      // parent session's overall status must never override that.
      const nested = this.nestedAgents.get(element.session.id) ?? [];
      const { working, completed } = splitSubagentsByStatus(element.session, nested);

      const groups: SubAgentGroupTreeItem[] = [];
      if (working.length > 0) {
        groups.push(new SubAgentGroupTreeItem('working', working, element.session));
      }
      if (completed.length > 0) {
        groups.push(new SubAgentGroupTreeItem('completed', completed, element.session));
      }
      return groups;
    } else if (element instanceof SubAgentGroupTreeItem) {
      return getSubAgentGroupChildren(element); // Level 4 (subagentTreeChildren.ts)
    } else if (element instanceof SubAgentTreeItem) {
      return getNestedSubAgentChildren(element); // Level 5, nested "grandchildren" (subagentTreeChildren.ts)
    }
    return [];
  }

  private getRootItems(): TreeItemType[] {
    // Monitoring turned off via the toggle / setting — make it obvious it's intentional.
    if (!this.monitoringEnabled) {
      return [new MessageTreeItem('Monitoring disabled', 'circle-slash', 'Click the eye icon at the top to re-enable')];
    }
    // Still within the startup delay / first load — show an animated placeholder
    // instead of a blank view so it never looks broken.
    if (this.loading) {
      return [new MessageTreeItem('Loading sessions…', 'loading~spin', 'Reading local agent sessions')];
    }

    // Brand nodes (only shown when active sessions exist for that brand).
    const filteredSessions = this.getVisibleSessions();
    const brands: BrandTreeItem[] = [];
    const claudeSessions = filteredSessions.filter((s) => s.type === CLAUDE_CODE_BRAND);
    const antigravitySessions = filteredSessions.filter((s) => s.type === 'antigravity');
    const codexSessions = filteredSessions.filter((s) => s.type === 'codex');
    if (claudeSessions.length > 0) {
      brands.push(new BrandTreeItem(CLAUDE_CODE_BRAND, claudeSessions));
    }
    if (antigravitySessions.length > 0) {
      brands.push(new BrandTreeItem('antigravity', antigravitySessions));
    }
    if (codexSessions.length > 0) brands.push(new BrandTreeItem('codex', codexSessions));

    if (brands.length === 0) {
      return [
        new MessageTreeItem(
          'No active sessions',
          'inbox',
          'No Claude Code, Antigravity or Codex sessions in the last hour',
        ),
      ];
    }
    return brands;
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

  private setupFileWatchers(): void {
    logDebug('SessionTreeDataProvider: setupFileWatchers() started');
    this.disposeWatchers();
    this.watchers = createSessionFileWatchers(
      { claudeProjectsPath: this.claudeProjectsPath, geminiBrainPath: this.geminiBrainPath },
      (filePath, type) => {
        this.handleFileChange(filePath, type);
      },
    );
  }

  private setupCodexWatcher(): void {
    try {
      const watcher = vscode.workspace.createFileSystemWatcher(
        new vscode.RelativePattern(this.codexSessionsPath, '**/rollout-*.jsonl'),
      );
      watcher.onDidChange((uri) => {
        this.handleFileChange(uri.fsPath, 'codex');
      });
      watcher.onDidCreate((uri) => {
        this.handleFileChange(uri.fsPath, 'codex');
      });
      watcher.onDidDelete((uri) => {
        for (const [id, session] of this.sessions) {
          if (session.type === 'codex' && session.logFilePath === uri.fsPath) this.sessions.delete(id);
        }
        this._onDidChangeTreeData.fire();
      });
      this.watchers.push(watcher);
    } catch (err) {
      logDebug(`SessionTreeDataProvider: Failed to setup Codex watcher: ${String(err)}`);
    }
  }

  private handleFileChange(filePath: string, type: Session['type']): void {
    if (!this.monitoringEnabled || !this.isReady) {
      logDebug(`SessionTreeDataProvider: handleFileChange() skipped for ${filePath}`);
      return;
    }
    logDebug(`SessionTreeDataProvider: handleFileChange() for ${filePath} (${type})`);
    try {
      const session = this.logParser.parse(filePath, type);
      upsertIfMoreRelevant(this.sessions, session.id, session);

      // Check active status after change
      void this.updateActiveStatuses().then(() => {
        this._onDidChangeTreeData.fire();
        logDebug(`SessionTreeDataProvider: handleFileChange() completed for ${session.id}`);
      });
    } catch (err) {
      logDebug(`SessionTreeDataProvider: handleFileChange() failed with error: ${String(err)}`);
    }
  }

  public async loadSessions(): Promise<void> {
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
      await this.updateActiveStatuses();
      logDebug('SessionTreeDataProvider: loadSessions() active status updates completed');
    } catch (err) {
      logDebug(`SessionTreeDataProvider: Failed to update active statuses: ${String(err)}`);
    }

    this.checkClaudeVersionCompat();
  }

  private removeMissingCodexSessions(files: LogFileRef[]): void {
    const paths = new Set(files.filter((file) => file.type === 'codex').map((file) => file.path));
    for (const [id, session] of this.sessions) {
      if (session.type === 'codex' && !paths.has(session.logFilePath)) this.sessions.delete(id);
    }
  }

  // Warn once when a Claude Code newer than the validated version writes logs, so a format change
  // can be re-checked instead of silently mis-parsing (renamed field → sessions vanish/mis-group).
  private checkClaudeVersionCompat(): void {
    if (this.warnedClaudeVersion) return;
    let newest = '';
    for (const session of this.sessions.values()) {
      const v = session.claudeVersion;
      if (v && isNewerThanCompatible(v) && (newest === '' || compareVersions(v, newest) > 0)) {
        newest = v;
      }
    }
    if (!newest) return;
    this.warnedClaudeVersion = true;
    const msg =
      `Claude Code ${newest} detected; Agent Monitor was validated against ${KNOWN_COMPATIBLE_CLAUDE_VERSION}. ` +
      `If sessions look wrong, the log format may have changed.`;
    logDebug(`SessionTreeDataProvider: ${msg}`);
    void vscode.window.showWarningMessage(msg);
  }

  /**
   * Runs on every 15s auto-refresh tick (startAutoRefresh) and every file-change-triggered
   * refresh (handleFileChange, loadSessions). `getOpenLogFiles` is the only part of this that
   * needs to be here rather than in the pure helper: it shells out to `lsof`, so it stays async
   * and colocated with the rest of this vscode-layer class. The actual per-session status and
   * subagent-metadata refresh logic — including WHY enrichSubagentMetadata must run there
   * immediately before refreshNestedSubagents on every tick, not only when a transcript is
   * re-parsed — lives in sessionStatusRefresh.ts's refreshSessionStatuses; see that function's
   * own doc comment.
   */
  private async updateActiveStatuses(): Promise<void> {
    try {
      const openFiles = await getOpenLogFiles(this.homeDir);
      refreshSessionStatuses(Array.from(this.sessions.values()), openFiles);
    } catch (err) {
      logDebug(`SessionTreeDataProvider: updateActiveStatuses() failed: ${String(err)}`);
    }
  }
}
