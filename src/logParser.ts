import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { Session, SubAgent } from './types';
import { extractSessionName } from './nameExtractor';
import { detectSubagents } from './subagentDetector';
import { LogEntry } from './transcriptEntry';

// Re-exported so existing importers (e.g. subagentDetector) keep resolving LogEntry from here.
export type { LogEntry } from './transcriptEntry';

interface NewLinesContext {
  filePath: string;
  fileSize: number;
  lastReadOffset: number;
  session: Session;
  stats: fs.Stats;
}
interface LogLineContext {
  line: string;
  session: Session;
  currentSubagents: Map<string, SubAgent>;
  stats: fs.Stats;
}

export class LogParser {
  private cache = new Map<string, { lastReadOffset: number; session: Session }>();
  private decodedPathCache = new Map<string, string>();
  private claudeProjectsPath: string;

  constructor(claudeProjectsPath?: string) {
    this.claudeProjectsPath = claudeProjectsPath ?? path.join(os.homedir(), '.claude', 'projects');
  }

  public parse(filePath: string, type: 'claude-code' | 'antigravity'): Session {
    try {
      let cacheEntry = this.cache.get(filePath);

      if (!fs.existsSync(filePath)) {
        return this.createEmptySession(filePath, type);
      }

      const stats = fs.statSync(filePath);
      const fileSize = stats.size;

      if (cacheEntry && fileSize < cacheEntry.lastReadOffset) {
        cacheEntry = undefined;
      }

      if (!cacheEntry) {
        const session = this.createEmptySession(filePath, type);
        session.lastInteractionTime = stats.mtimeMs;
        cacheEntry = { lastReadOffset: 0, session };
        this.cache.set(filePath, cacheEntry);
      }

      const { session, lastReadOffset } = cacheEntry;

      if (fileSize > lastReadOffset) {
        this.parseNewLines({ filePath, fileSize, lastReadOffset, session, stats });
        cacheEntry.lastReadOffset = fileSize;
      }

      return session;
    } catch {
      return this.createEmptySession(filePath, type);
    }
  }

  private parseNewLines(ctx: NewLinesContext): void {
    const { filePath, fileSize, lastReadOffset, session, stats } = ctx;
    const fd = fs.openSync(filePath, 'r');
    const bufferSize = fileSize - lastReadOffset;
    const buffer = Buffer.alloc(bufferSize);

    try {
      fs.readSync(fd, buffer, 0, bufferSize, lastReadOffset);
      const newContent = buffer.toString('utf8');
      const lines = newContent.split('\n');

      const currentSubagents = new Map<string, SubAgent>();
      for (const sub of session.subagents) {
        currentSubagents.set(sub.id, sub);
      }

      for (const line of lines) {
        this.parseLogLine({ line, session, currentSubagents, stats });
      }

      session.subagents = Array.from(currentSubagents.values());
      session.lastInteractionTime = stats.mtimeMs;
    } finally {
      fs.closeSync(fd);
    }
  }

  private parseLogLine(ctx: LogLineContext): void {
    const { line, session, currentSubagents, stats } = ctx;
    if (!line.trim()) {
      return;
    }
    try {
      const json = JSON.parse(line) as LogEntry;
      // Subagent transcripts (<sessionId>/subagents/agent-*.jsonl, or same-dir sidechains) mark
      // every entry isSidechain:true. Flag the session so it's excluded from the standalone list —
      // otherwise the recursive **/*.jsonl watcher surfaces it as a phantom top-level session whose
      // title is the subagent's task prompt. Its status is shown via the parent's tool_use pairing.
      if (json.isSidechain === true) {
        session.isSidechain = true;
      }
      if (typeof json.type === 'string') {
        session.lastEntryType = json.type;
      }
      if (typeof json.entrypoint === 'string') {
        session.entrypoint = json.entrypoint;
      }
      if (typeof json.version === 'string') {
        session.claudeVersion = json.version;
      }
      this.parseTimestamp(json, session, stats);
      this.parseGitBranch(json, session);
      this.detectProjectPath(json, session);
      this.detectSessionModel(json, session);

      this.detectSessionTitle(json, session);

      detectSubagents(json, currentSubagents);
    } catch {
      // Ignore JSON parse errors
    }
  }

  private detectSessionTitle(json: LogEntry, session: Session): void {
    if (!session.nameFromPrompt) {
      const extractedName = extractSessionName(json);
      if (extractedName) {
        session.sessionTitle =
          extractedName.length > 60 ? extractedName.substring(0, 60).trimEnd() + '...' : extractedName;
        session.nameFromPrompt = true;
      }
    }
    // Claude Code's own generated title, when present, is cleaner than the first prompt
    // (which can be a raw diff, a forked review prompt, etc.) — always prefer it.
    if (json.type === 'ai-title' && typeof json.aiTitle === 'string' && json.aiTitle.trim()) {
      session.sessionTitle = json.aiTitle.trim();
      session.nameFromPrompt = true;
    }
  }

  private parseTimestamp(json: LogEntry, session: Session, stats: fs.Stats): void {
    if (json.timestamp) {
      const t = Date.parse(json.timestamp);
      if (!isNaN(t)) {
        session.lastInteractionTime = t;
      }
    } else if (json.time) {
      const t = Date.parse(json.time);
      if (!isNaN(t)) {
        session.lastInteractionTime = t;
      }
    } else if (typeof json.created === 'number') {
      session.lastInteractionTime = json.created;
    } else {
      session.lastInteractionTime = stats.mtimeMs;
    }
  }

  private detectSessionModel(json: LogEntry, session: Session): void {
    // Assistant turns carry the main-loop model (e.g. "claude-sonnet-5"). Keep the latest.
    if (json.type === 'assistant' && json.message?.model) {
      session.model = json.message.model;
    }
  }

  private parseGitBranch(json: LogEntry, session: Session): void {
    if (json.gitBranch) {
      session.gitBranch = json.gitBranch;
    } else if (json.git && typeof json.git.branch === 'string') {
      session.gitBranch = json.git.branch;
    }
  }

  private detectProjectPath(json: LogEntry, session: Session): void {
    if (session.type === 'claude-code') {
      this.detectClaudeCodeProjectPath(json, session);
      return;
    }

    // 1. Extract from Active Document metadata in USER_INPUT
    if (json.type === 'USER_INPUT' && typeof json.content === 'string') {
      const activeDocMatch = json.content.match(/Active Document:\s*([^\n]+)/);
      if (activeDocMatch) {
        session.projectPath = this.findProjectRoot(activeDocMatch[1].trim());
        return;
      }
      const otherDocMatch = json.content.match(/Other open documents:\s*-\s*([^\n]+)/);
      if (otherDocMatch) {
        session.projectPath = this.findProjectRoot(otherDocMatch[1].trim());
        return;
      }
    }

    // 2. Extract from Cwd
    const cwd = this.extractCwd(json);
    if (cwd) {
      session.projectPath = cwd;
      return;
    }

    // 3. Extract from TargetFile
    if (json.TargetFile) {
      session.projectPath = this.findProjectRoot(json.TargetFile);
    }
  }

  private detectClaudeCodeProjectPath(json: LogEntry, session: Session): void {
    // The project-directory name Claude Code encodes to (e.g. `-Users-me-aia_harness` for
    // `/Users/me/aia_harness`) is ambiguous to decode: every non-alphanumeric character,
    // including `_` and `.`, collapses to the same `-` as the path separator. The transcript's
    // own `cwd` field carries the real, unambiguous path — always prefer it over the guess.
    if (typeof json.cwd === 'string' && json.cwd.trim()) {
      session.projectPath = json.cwd.trim();
      session.projectName = path.basename(session.projectPath) || session.projectName;
    }
  }

  private extractCwd(json: LogEntry): string | null {
    if (json.Cwd) {
      return json.Cwd;
    }

    if (json.tool_calls && Array.isArray(json.tool_calls)) {
      for (const tc of json.tool_calls) {
        const cwd = tc.Cwd || tc.arguments?.Cwd || tc.Arguments?.Cwd;
        if (cwd) {
          return cwd;
        }
      }
    }

    return null;
  }

  private findProjectRoot(filePath: string): string {
    try {
      let current = path.dirname(filePath);
      while (current && current !== '/' && current.length > 1) {
        if (
          fs.existsSync(path.join(current, '.git')) ||
          fs.existsSync(path.join(current, '.claude')) ||
          fs.existsSync(path.join(current, '.agents')) ||
          fs.existsSync(path.join(current, 'package.json'))
        ) {
          return current;
        }
        current = path.dirname(current);
      }
    } catch {
      // Ignore filesystem check errors
    }
    return path.dirname(filePath);
  }

  private decodeClaudeProjectPath(projectDir: string): string {
    if (!projectDir.startsWith('-')) return projectDir;
    const cached = this.decodedPathCache.get(projectDir);
    if (cached !== undefined) return cached;

    const parts = projectDir.substring(1).split('-');
    let currentPath = '/';
    let i = 0;
    while (i < parts.length) {
      let foundNext = false;
      for (let len = parts.length - i; len > 0; len--) {
        const candidate = path.join(currentPath, parts.slice(i, i + len).join('-'));
        if (fs.existsSync(candidate)) {
          currentPath = candidate;
          i += len;
          foundNext = true;
          break;
        }
      }
      if (!foundNext) {
        currentPath = path.join(currentPath, parts[i]);
        i++;
      }
    }
    this.decodedPathCache.set(projectDir, currentPath);
    return currentPath;
  }

  private createEmptySession(filePath: string, type: 'claude-code' | 'antigravity'): Session {
    const fileBasename = path.basename(filePath, '.jsonl');

    let projectDir = '';
    if (type === 'claude-code') {
      const relative = path.relative(this.claudeProjectsPath, filePath);
      projectDir = relative.split(path.sep)[0] || '';
    } else {
      // brain/<conversationId>/.system_generated/logs/transcript.jsonl — the conversation id is
      // three levels up. Every Antigravity transcript is literally named `transcript.jsonl`, so
      // using the basename as the session id collapsed all of them onto one Map slot and only the
      // last one parsed ever showed up in the tree.
      projectDir = path.basename(path.dirname(path.dirname(path.dirname(filePath))));
    }

    const decodedPath =
      type === 'claude-code'
        ? this.decodeClaudeProjectPath(projectDir)
        : path.dirname(path.dirname(path.dirname(filePath)));
    const sessionId = type === 'claude-code' ? fileBasename : projectDir;
    const projectName =
      type === 'claude-code' ? path.basename(decodedPath) || projectDir : `Session ${projectDir.substring(0, 8)}`;

    return {
      id: sessionId,
      projectHash: projectDir,
      projectPath: decodedPath,
      projectName: projectName,
      gitBranch: 'unknown',
      status: 'stopped',
      lastInteractionTime: Date.now(),
      subagents: [],
      logFilePath: filePath,
      type,
      nameFromPrompt: false,
    };
  }
}
