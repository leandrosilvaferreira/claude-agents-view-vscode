import * as fs from 'fs';
import * as path from 'path';
import { Session } from './types';
import { logDebug } from './logger';
import { applyCodexEntry, CodexEntryState } from './codexEntries';

interface CachedRollout {
  offset: number;
  pending: Buffer;
  inode: number;
  session: Session;
  entryState: CodexEntryState;
}

/** Codex rollouts are append-only JSONL, including VS Code and desktop sessions. */
export class CodexLogParser {
  private cache = new Map<string, CachedRollout>();

  public clearCache(): void {
    this.cache.clear();
  }

  public parse(filePath: string): Session {
    try {
      const stats = fs.statSync(filePath);
      let cached = this.cache.get(filePath);
      if (!cached || stats.size < cached.offset || stats.ino !== cached.inode) {
        cached = {
          offset: 0,
          pending: Buffer.alloc(0),
          inode: stats.ino,
          session: emptySession(filePath),
          entryState: { hasMetadata: false, inherited: false },
        };
        this.cache.set(filePath, cached);
      }
      if (stats.size > cached.offset) {
        this.readAppend(filePath, stats.size, cached);
        cached.session.lastInteractionTime = stats.mtimeMs;
      }
      return cached.session;
    } catch {
      logDebug('Unable to read Codex rollout');
      this.cache.delete(filePath);
      return emptySession(filePath);
    }
  }

  private readAppend(filePath: string, size: number, cached: CachedRollout): void {
    const fd = fs.openSync(filePath, 'r');
    try {
      const buffer = Buffer.alloc(64 * 1024);
      while (cached.offset < size) {
        const bytes = fs.readSync(fd, buffer, 0, Math.min(buffer.length, size - cached.offset), cached.offset);
        if (!bytes) break;
        cached.offset += bytes;
        const data = Buffer.concat([cached.pending, buffer.subarray(0, bytes)]);
        let start = 0;
        let end = data.indexOf(10, start);
        while (end !== -1) {
          this.parseLine(data.subarray(start, end).toString('utf8'), cached);
          start = end + 1;
          end = data.indexOf(10, start);
        }
        // Preserve bytes, not decoded characters: a writer can stop inside a UTF-8 sequence.
        cached.pending = Buffer.from(data.subarray(start));
      }
    } finally {
      fs.closeSync(fd);
    }
  }

  private parseLine(line: string, cached: CachedRollout): void {
    if (!line.trim()) return;
    try {
      applyCodexEntry(JSON.parse(line), cached.session, cached.entryState);
    } catch {
      logDebug('Ignored malformed Codex rollout line');
    }
  }
}

function emptySession(filePath: string): Session {
  return {
    id: path.basename(filePath, '.jsonl'),
    projectHash: '',
    projectPath: '',
    projectName: 'Codex session',
    gitBranch: 'unknown',
    status: 'stopped',
    lastInteractionTime: 0,
    subagents: [],
    logFilePath: filePath,
    type: 'codex',
  };
}
