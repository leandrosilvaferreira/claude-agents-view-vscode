import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { Session, SubAgent } from './types';
import { extractRenamedTitle, extractSessionName } from './nameExtractor';
import { ProjectPathResolver } from './projectPathResolver';
import { detectSubagents } from './subagentDetector';
import { enrichSubagentMetadata } from './subagentMetadata';
import { LogEntry } from './transcriptEntry';
import { trackTurnSignals, trackApiErrorSignal } from './turnSignals';

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

const CLAUDE_CODE_BRAND = 'claude-code' as const;

export class LogParser {
  private cache = new Map<string, { lastReadOffset: number; session: Session }>();
  private projectPaths = new ProjectPathResolver();
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
        cacheEntry.lastReadOffset = this.parseNewLines({ filePath, fileSize, lastReadOffset, session, stats });
      }

      return session;
    } catch {
      return this.createEmptySession(filePath, type);
    }
  }

  /** Returns the byte offset the next read should resume from. */
  private parseNewLines(ctx: NewLinesContext): number {
    const { filePath, fileSize, lastReadOffset, session, stats } = ctx;
    const fd = fs.openSync(filePath, 'r');
    const bufferSize = fileSize - lastReadOffset;
    const buffer = Buffer.alloc(bufferSize);

    try {
      fs.readSync(fd, buffer, 0, bufferSize, lastReadOffset);
      const newContent = buffer.toString('utf8');

      // Claude Code writes one line at a time; a chunk read mid-write can end partway through the
      // line currently being flushed (no trailing '\n' yet). That fragment must not be parsed now:
      // it either fails JSON.parse (silently dropped below) or, worse, could coincidentally parse
      // as something else — and since the offset would already sit past it, the real entry is lost
      // forever, because the next read starts after it, mid-JSON, and never resyncs. So hold the
      // fragment back and don't advance the offset past it, leaving it to be re-read whole once the
      // writer finishes the line.
      const endsWithNewline = newContent.endsWith('\n');
      const lines = newContent.split('\n');
      const incompleteTail = endsWithNewline ? '' : (lines.pop() ?? '');

      const currentSubagents = new Map<string, SubAgent>();
      for (const sub of session.subagents) {
        currentSubagents.set(sub.id, sub);
      }

      for (const line of lines) {
        this.parseLogLine({ line, session, currentSubagents, stats });
      }

      session.subagents = Array.from(currentSubagents.values());
      // Runs once per parseNewLines() call (i.e. only when this file actually grew), and only
      // reads a sidecar for subagents still missing a name/model — never per render.
      enrichSubagentMetadata(session);
      session.lastInteractionTime = stats.mtimeMs;

      // Byte length, not `.length` (UTF-16 code units): transcripts carry multibyte UTF-8 (accented
      // text, emoji), so a char-counted retreat would land the next read mid-character instead of
      // at the start of the held-back fragment.
      return fileSize - Buffer.byteLength(incompleteTail, 'utf8');
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
      trackTurnSignals(json, session);
      trackApiErrorSignal(json, session);
      if (typeof json.entrypoint === 'string') {
        session.entrypoint = json.entrypoint;
      }
      if (typeof json.version === 'string') {
        session.claudeVersion = json.version;
      }
      this.parseTimestamp(json, session, stats);
      this.projectPaths.detectGitBranch(json, session);
      this.projectPaths.detectWorktreeName(json, session);
      this.projectPaths.detectProjectPath(json, session);
      this.detectSessionModel(json, session);

      this.detectSessionTitle(json, session);

      detectSubagents(json, currentSubagents);
    } catch {
      // Ignore JSON parse errors
    }
  }

  private detectSessionTitle(json: LogEntry, session: Session): void {
    // A rename the user typed wins over anything derived. A later rename still applies (each one
    // is its own entry), but no generated title may take it back — hence the latch rather than
    // relying on assignment order, since an `ai-title` can land after the rename.
    // `session.worktreeName` (set by projectPaths.detectWorktreeName from an earlier
    // `worktree-state` entry) lets extractRenamedTitle reject Claude Code's own auto-stamped
    // custom-title instead of latching it as if the user had renamed the session.
    const renamed = extractRenamedTitle(json, session.worktreeName);
    if (renamed) {
      // Not truncated at 60 like a derived title below: this is the exact text the user typed,
      // and it is what Claude Code itself shows. The tree view elides anything too long.
      session.sessionTitle = renamed;
      session.nameFromPrompt = true;
      session.titleIsCustom = true;
      return;
    }
    if (session.titleIsCustom) {
      return;
    }
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

  private createEmptySession(filePath: string, type: 'claude-code' | 'antigravity'): Session {
    const fileBasename = path.basename(filePath, '.jsonl');

    let projectDir: string;
    if (type === CLAUDE_CODE_BRAND) {
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
      type === CLAUDE_CODE_BRAND
        ? this.projectPaths.decodeClaudeProjectPath(projectDir)
        : path.dirname(path.dirname(path.dirname(filePath)));
    const sessionId = type === CLAUDE_CODE_BRAND ? fileBasename : projectDir;
    const projectName =
      type === CLAUDE_CODE_BRAND ? path.basename(decodedPath) || projectDir : `Session ${projectDir.substring(0, 8)}`;

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
