import * as vscode from 'vscode';
import * as fs from 'fs';
import { Session } from './types';
import { logDebug } from './logger';

interface SessionLogPaths {
  claudeProjectsPath: string;
  geminiBrainPath: string;
}

const CLAUDE_CODE_BRAND = 'claude-code' as const;

/** Watch the local Claude Code and Antigravity transcript roots when available. */
export function createSessionFileWatchers(
  paths: SessionLogPaths,
  onChange: (filePath: string, type: Session['type']) => void,
): vscode.FileSystemWatcher[] {
  const watchers: vscode.FileSystemWatcher[] = [];
  // Watch Claude Code Sessions (watch both root and nested jsonl files)
  try {
    if (fs.existsSync(paths.claudeProjectsPath)) {
      logDebug(`SessionTreeDataProvider: Creating watcher for Claude sessions at: ${paths.claudeProjectsPath}`);
      const claudeWatcher = vscode.workspace.createFileSystemWatcher(
        new vscode.RelativePattern(paths.claudeProjectsPath, '**/*.jsonl'),
      );
      claudeWatcher.onDidChange((uri) => {
        logDebug(`watcher: Claude file change detected: ${uri.fsPath}`);
        onChange(uri.fsPath, CLAUDE_CODE_BRAND);
      });
      claudeWatcher.onDidCreate((uri) => {
        logDebug(`watcher: Claude file create detected: ${uri.fsPath}`);
        onChange(uri.fsPath, CLAUDE_CODE_BRAND);
      });
      watchers.push(claudeWatcher);
    } else {
      logDebug(`SessionTreeDataProvider: Claude projects path does not exist: ${paths.claudeProjectsPath}`);
    }
  } catch (err) {
    logDebug(`SessionTreeDataProvider: Failed to setup Claude watcher: ${String(err)}`);
  }

  // Watch Antigravity Sessions
  try {
    if (fs.existsSync(paths.geminiBrainPath)) {
      logDebug(`SessionTreeDataProvider: Creating watcher for Antigravity sessions at: ${paths.geminiBrainPath}`);
      const geminiWatcher = vscode.workspace.createFileSystemWatcher(
        new vscode.RelativePattern(paths.geminiBrainPath, '**/transcript.jsonl'),
      );
      geminiWatcher.onDidChange((uri) => {
        logDebug(`watcher: Antigravity file change detected: ${uri.fsPath}`);
        onChange(uri.fsPath, 'antigravity');
      });
      geminiWatcher.onDidCreate((uri) => {
        logDebug(`watcher: Antigravity file create detected: ${uri.fsPath}`);
        onChange(uri.fsPath, 'antigravity');
      });
      watchers.push(geminiWatcher);
    } else {
      logDebug(`SessionTreeDataProvider: Gemini brain path does not exist: ${paths.geminiBrainPath}`);
    }
  } catch (err) {
    logDebug(`SessionTreeDataProvider: Failed to setup Antigravity watcher: ${String(err)}`);
  }
  return watchers;
}
