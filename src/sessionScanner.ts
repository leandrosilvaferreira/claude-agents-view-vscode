import * as fs from 'fs';
import * as path from 'path';
import { logDebug } from './logger';
import { Session } from './types';

export interface LogFileRef {
  path: string;
  type: Session['type'];
}

/** Discover every Claude Code and Antigravity log file on disk. Never throws. */
export function scanSessionFiles(
  claudeProjectsPath: string,
  geminiBrainPath: string,
  codexSessionsPath?: string,
): LogFileRef[] {
  const files: LogFileRef[] = [];
  scanClaudeSessions(claudeProjectsPath, files);
  scanGeminiSessions(geminiBrainPath, files);
  if (codexSessionsPath) scanCodexSessions(codexSessionsPath, files);
  return files;
}

function scanCodexSessions(directory: string, files: LogFileRef[]): void {
  try {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const filePath = path.join(directory, entry.name);
      if (entry.isDirectory()) scanCodexSessions(filePath, files);
      else if (entry.isFile() && entry.name.startsWith('rollout-') && entry.name.endsWith('.jsonl')) {
        files.push({ path: filePath, type: 'codex' });
      }
    }
  } catch {
    // Missing roots and unreadable date directories do not block the other providers.
  }
}

function scanClaudeSessions(claudeProjectsPath: string, files: LogFileRef[]): void {
  if (!fs.existsSync(claudeProjectsPath)) {
    return;
  }
  try {
    const projects = fs.readdirSync(claudeProjectsPath);
    for (const project of projects) {
      const projectPath = path.join(claudeProjectsPath, project);
      scanClaudeRootSessions(projectPath, files);
      scanClaudeSubSessions(projectPath, files);
    }
  } catch (err) {
    logDebug(`sessionScanner: scanClaudeSessions() failed: ${String(err)}`);
  }
}

function scanClaudeRootSessions(projectPath: string, files: LogFileRef[]): void {
  try {
    const projectFiles = fs.readdirSync(projectPath);
    for (const file of projectFiles) {
      if (file.endsWith('.jsonl')) {
        files.push({ path: path.join(projectPath, file), type: 'claude-code' });
      }
    }
  } catch {
    // Ignore project file scan issues
  }
}

function scanClaudeSubSessions(projectPath: string, files: LogFileRef[]): void {
  const sessionsDir = path.join(projectPath, 'sessions');
  if (!fs.existsSync(sessionsDir)) {
    return;
  }
  try {
    const sessionFiles = fs.readdirSync(sessionsDir);
    for (const file of sessionFiles) {
      if (file.endsWith('.jsonl')) {
        files.push({ path: path.join(sessionsDir, file), type: 'claude-code' });
      }
    }
  } catch {
    // Ignore nested sessions scan issues
  }
}

function scanGeminiSessions(geminiBrainPath: string, files: LogFileRef[]): void {
  if (!fs.existsSync(geminiBrainPath)) {
    return;
  }
  try {
    const convs = fs.readdirSync(geminiBrainPath);
    for (const conv of convs) {
      const transcriptPath = path.join(geminiBrainPath, conv, '.system_generated', 'logs', 'transcript.jsonl');
      if (fs.existsSync(transcriptPath)) {
        files.push({ path: transcriptPath, type: 'antigravity' });
      }
    }
  } catch (err) {
    logDebug(`sessionScanner: scanGeminiSessions() failed: ${String(err)}`);
  }
}
