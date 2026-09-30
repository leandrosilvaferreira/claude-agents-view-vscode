import * as vscode from 'vscode';
import * as fs from 'fs';
import { canonicalFsPath } from './fsPath';
import { MonitorSettings } from './monitorSettings';
import { Session } from './types';

interface SessionLogPaths {
  claudeProjectsPath: string;
  geminiBrainPath: string;
  codexSessionsPath: string;
}

interface SessionFileHandlers {
  /** A transcript was created or appended to. */
  onChange: (filePath: string, type: Session['type']) => void;
  /** A Codex rollout was deleted — the only brand whose sessions are dropped on a delete event. */
  onCodexDelete: (filePath: string) => void;
}

/** What became of the watcher for one transcript root: the raw material of the activation report. */
export interface WatcherStatus {
  brand: Session['type'];
  root: string;
  /** Why no events are to be expected from this root; undefined when it is being watched. */
  problem?: string;
}

interface WatchedRoot {
  brand: Session['type'];
  root: string;
  glob: string;
  // Claude and Antigravity roots are watched only once they exist. The Codex root is registered
  // either way, as it always was: until the directory appears the watcher has nothing to report.
  // Its status still reads "not watched" meanwhile — no events are to be expected from it yet.
  registerWhenMissing: boolean;
  onDelete?: (filePath: string) => void;
}

interface RootWatch {
  watcher?: vscode.FileSystemWatcher;
  status: WatcherStatus;
}

const MISSING_ROOT = 'directory does not exist';

/**
 * Watch the local Claude Code, Antigravity and Codex transcript roots. Each watcher reports a
 * change or a creation through `onChange` — silently: a transcript is appended to many times a
 * second, so anything logged or done per event belongs to whoever coalesces them. The statuses say,
 * per root, whether a watcher was registered at startup, so the caller can report how detection
 * works. They are a startup snapshot: a watcher the OS stops later (an inotify limit, say) is not
 * reported, and the periodic rescan is what still covers it.
 */
export function createSessionFileWatchers(
  paths: SessionLogPaths,
  handlers: SessionFileHandlers,
): { watchers: vscode.FileSystemWatcher[]; statuses: WatcherStatus[] } {
  const roots: WatchedRoot[] = [
    // The Claude watcher is recursive: it sees the root and every nested jsonl file.
    { brand: 'claude-code', root: paths.claudeProjectsPath, glob: '**/*.jsonl', registerWhenMissing: false },
    { brand: 'antigravity', root: paths.geminiBrainPath, glob: '**/transcript.jsonl', registerWhenMissing: false },
    {
      brand: 'codex',
      root: paths.codexSessionsPath,
      glob: '**/rollout-*.jsonl',
      registerWhenMissing: true,
      onDelete: handlers.onCodexDelete,
    },
  ];
  const results = roots.map((spec) => watchRoot(spec, handlers.onChange));
  return {
    watchers: results.flatMap((result) => (result.watcher ? [result.watcher] : [])),
    statuses: results.map((result) => result.status),
  };
}

function watchRoot(spec: WatchedRoot, onChange: SessionFileHandlers['onChange']): RootWatch {
  const { brand, root } = spec;
  const exists = fs.existsSync(root);
  if (!exists && !spec.registerWhenMissing) {
    return { status: { brand, root, problem: MISSING_ROOT } };
  }
  try {
    const watcher = vscode.workspace.createFileSystemWatcher(new vscode.RelativePattern(root, spec.glob));
    // Every path leaving this boundary goes through canonicalFsPath: on Windows `uri.fsPath` lower-cases
    // the drive letter, unlike the scan, and the callbacks' path-keyed state must see one spelling.
    const report = (uri: vscode.Uri): void => {
      onChange(canonicalFsPath(uri.fsPath), brand);
    };
    watcher.onDidChange(report);
    watcher.onDidCreate(report);
    const { onDelete } = spec;
    if (onDelete) {
      watcher.onDidDelete((uri) => {
        onDelete(canonicalFsPath(uri.fsPath));
      });
    }
    return { watcher, status: { brand, root, problem: exists ? undefined : MISSING_ROOT } };
  } catch (err) {
    return { status: { brand, root, problem: `watcher registration failed: ${String(err)}` } };
  }
}

/**
 * The activation report: what detects activity on this machine and what the user can expect.
 * "fallback active" is only raised when no root is being watched at all — polling is then the sole
 * detection path; with any root watched, events are expected for at least that one.
 */
export function describeMonitoring(statuses: readonly WatcherStatus[], settings: MonitorSettings): string[] {
  const pollSeconds = settings.pollIntervalMs / 1000;
  const lines = [
    `platform: ${process.platform}`,
    ...statuses.map((status) =>
      status.problem === undefined
        ? `${status.brand}: watching ${status.root}`
        : `${status.brand}: not watched (${status.problem}) - ${status.root}`,
    ),
    `strategy: event-driven VS Code file watchers + ${pollSeconds}s polling safety net, no external processes`,
    `activity window: ${settings.activityWindowMs / 1000}s`,
  ];
  if (statuses.every((status) => status.problem !== undefined)) {
    lines.push(`fallback active: polling every ${pollSeconds}s with fs.stat only`);
  }
  return lines;
}
